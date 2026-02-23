import {
  analyzeJobFit,
  ensureBobJobDirExists,
  extractCompanyAndJobSlug,
  fetchJobDescription,
  generateJobTailoredResume,
  generateSummaryFromText,
  getResumeFilePath,
  hasMinimumFields,
  incorporateClarificationsIntoSummary,
  readConfig,
  readProfessionalSummary,
  renderResumeToPdf,
  sanitizeJobText,
  validateApiKey,
  warnIfApiKeyMissing,
  writeConfig,
  writeProfessionalSummary,
} from '@bobjob/core';
import type { ProfessionalSummary } from '@bobjob/core';
import { homedir } from 'node:os';
import { basename } from 'node:path';
import { editor, input, select } from '@inquirer/prompts';
import ora from 'ora';
import { ask } from '../chat/prompt';
import { collectRawTextFromSource } from './collect-source-text';
import { cyan, dim, error, primary, success, warn } from '../output';

const DONE_KEYWORDS = ['done', 'skip', 'finish'];

function isDoneInput(value: string): boolean {
  return DONE_KEYWORDS.includes(value.trim().toLowerCase());
}

const WRAP_WIDTH = 72;

function wrapText(text: string, width: number = WRAP_WIDTH): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 <= width) {
      current = current ? `${current} ${word}` : word;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.join('\n');
}

const JOB_SOURCE_QUESTION =
  'How would you like to provide the job description?';
const JOB_URL_PROMPT = 'Enter the job URL';
const JOB_TEXT_PROMPT = 'Paste the job description';

const NAME_PROMPT = "What's your full name?";
const EMAIL_PROMPT = "What's your email?";
const EXPERIENCE_PROMPT =
  "Tell me about one work experience or education (e.g. 'Software Engineer at Acme, 2020-2023'):";
const COMPANY_PROMPT = 'What company is this for?';
const ROLE_PROMPT = 'What role is this for?';
const SAVE_LOCATION_PROMPT = 'Where do you want to save your resume?';

async function collectSummaryFromSource(): Promise<ProfessionalSummary | null> {
  const rawText = await collectRawTextFromSource();
  if (!rawText) return null;

  const summarySpinner = ora('Generating your professional summary...').start();
  try {
    const summary = await generateSummaryFromText(rawText);
    summarySpinner.succeed('Professional summary ready');
    return summary;
  } catch (err) {
    summarySpinner.fail();
    console.error(error(err instanceof Error ? err.message : String(err)));
    return null;
  }
}

async function fillGaps(
  summary: ProfessionalSummary
): Promise<ProfessionalSummary> {
  let current = { ...summary };

  while (!hasMinimumFields(current)) {
    if (
      !current.name ||
      (typeof current.name === 'string' && !current.name.trim())
    ) {
      const name = await ask(NAME_PROMPT);
      if (name.trim()) {
        current = { ...current, name: name.trim() };
      }
      continue;
    }

    if (
      !current.contact?.email ||
      (typeof current.contact.email === 'string' &&
        !current.contact.email.trim())
    ) {
      const email = await ask(EMAIL_PROMPT);
      if (email.trim()) {
        current = {
          ...current,
          contact: { ...current.contact, email: email.trim() },
        };
      }
      continue;
    }

    const hasExperiences =
      Array.isArray(current.experiences) && current.experiences.length > 0;
    const hasEducation =
      Array.isArray(current.education) && current.education.length > 0;

    if (!hasExperiences && !hasEducation) {
      const expText = await ask(EXPERIENCE_PROMPT);
      if (expText.trim()) {
        const parseSpinner = ora('Parsing experience...').start();
        try {
          const parsed = await generateSummaryFromText(
            `Work experience or education: ${expText}`
          );
          parseSpinner.succeed();
          if (
            Array.isArray(parsed.experiences) &&
            parsed.experiences.length > 0
          ) {
            current = {
              ...current,
              experiences: [
                ...(current.experiences ?? []),
                ...parsed.experiences,
              ],
            };
          } else if (
            Array.isArray(parsed.education) &&
            parsed.education.length > 0
          ) {
            current = {
              ...current,
              education: [...(current.education ?? []), ...parsed.education],
            };
          } else {
            parseSpinner.fail();
            console.log(
              warn("Couldn't parse that. Try again with a clearer format.")
            );
          }
        } catch {
          parseSpinner.fail();
          console.log(
            warn("Couldn't parse that. Try again with a clearer format.")
          );
        }
      }
      continue;
    }

    break;
  }

  return current;
}

type ClarificationLoopResult = {
  summary: ProfessionalSummary;
  exitReason: 'early' | 'cancelled' | 'exited' | 'maxRounds' | 'error';
};

async function mergeWithSpinner(
  summary: ProfessionalSummary,
  clarifications: Array<{ question: string; answer: string }>
): Promise<ProfessionalSummary> {
  console.log();
  const mergeSpinner = ora('Incorporating your answers...').start();
  try {
    const merged = await incorporateClarificationsIntoSummary(
      summary,
      clarifications
    );
    mergeSpinner.succeed();
    return merged;
  } catch (err) {
    mergeSpinner.fail();
    throw err;
  }
}

async function runClarificationLoop(
  summary: ProfessionalSummary,
  jobDescription: string
): Promise<ClarificationLoopResult> {
  const maxRounds = 5;
  let currentSummary = summary;

  for (let round = 0; round < maxRounds; round++) {
    let analysis;
    const analyzeSpinner = ora('Analyzing job fit...').start();
    try {
      analysis = await analyzeJobFit(currentSummary, jobDescription);
      analyzeSpinner.stop();
    } catch (err) {
      analyzeSpinner.fail();
      console.error(error(err instanceof Error ? err.message : String(err)));
      return { summary: currentSummary, exitReason: 'error' };
    }

    console.log();
    const scoreStyle = analysis.matchScore >= 80 ? success : (s: string) => s;
    console.log(
      dim('Match score: ') +
        scoreStyle(String(analysis.matchScore)) +
        dim('/100')
    );
    console.log();
    console.log(wrapText(analysis.rationale));

    if (
      analysis.matchScore >= 85 ||
      analysis.clarificationQuestions.length === 0
    ) {
      return { summary: currentSummary, exitReason: 'early' };
    }

    console.log();
    let choice: 'followUp' | 'generate' | 'exit';
    try {
      choice = await select({
        message: primary('What would you like to do?'),
        choices: [
          { name: 'Answer follow-up questions', value: 'followUp' },
          { name: 'Generate resume', value: 'generate' },
          { name: 'Exit', value: 'exit' },
        ],
      });
    } catch {
      return { summary: currentSummary, exitReason: 'cancelled' };
    }

    if (choice === 'generate') {
      return { summary: currentSummary, exitReason: 'early' };
    }
    if (choice === 'exit') {
      return { summary: currentSummary, exitReason: 'exited' };
    }

    console.log();
    console.log(
      dim(
        'Follow-up questions to strengthen your match. Tie answers to your experience, education, or projects. Press Ctrl+C to skip.'
      )
    );
    console.log();

    const clarifications: Array<{ question: string; answer: string }> = [];
    const totalQuestions = analysis.clarificationQuestions.length;

    for (let i = 0; i < totalQuestions; i++) {
      const question = analysis.clarificationQuestions[i];
      if (question == null) continue;

      if (i > 0) {
        console.log();
      }

      const message = `${question} ${dim(`(${i + 1}/${totalQuestions})`)}\n`;

      let answer: string;
      try {
        answer = (await input({ message })) ?? '';
      } catch {
        // User cancelled (Ctrl+C) - merge any answers so far, but don't show "Great match!"
        if (clarifications.length > 0) {
          try {
            currentSummary = await mergeWithSpinner(
              currentSummary,
              clarifications
            );
          } catch (mergeErr) {
            console.error(
              error(
                mergeErr instanceof Error ? mergeErr.message : String(mergeErr)
              )
            );
          }
        }
        return { summary: currentSummary, exitReason: 'cancelled' };
      }

      if (isDoneInput(answer)) {
        if (clarifications.length > 0) {
          try {
            currentSummary = await mergeWithSpinner(
              currentSummary,
              clarifications
            );
          } catch (mergeErr) {
            console.error(
              error(
                mergeErr instanceof Error ? mergeErr.message : String(mergeErr)
              )
            );
          }
        }
        return { summary: currentSummary, exitReason: 'early' };
      }

      const trimmed = answer.trim();
      if (trimmed) {
        clarifications.push({ question, answer: trimmed });
      }
    }

    if (clarifications.length === 0) {
      return { summary: currentSummary, exitReason: 'early' };
    }

    try {
      currentSummary = await mergeWithSpinner(currentSummary, clarifications);
    } catch (err) {
      console.error(error(err instanceof Error ? err.message : String(err)));
      return { summary: currentSummary, exitReason: 'error' };
    }
  }

  return { summary: currentSummary, exitReason: 'maxRounds' };
}

type JobDescriptionResult = {
  jobDescription: string;
  company: string;
  jobSlug: string;
};

async function collectJobDescription(
  url?: string
): Promise<JobDescriptionResult | null> {
  let jobDescription: string;

  if (url) {
    const fetchSpinner = ora('Fetching job description...').start();
    try {
      jobDescription = await fetchJobDescription(url);
      fetchSpinner.succeed('Job description fetched');
    } catch (err) {
      fetchSpinner.fail();
      console.error(error(err instanceof Error ? err.message : String(err)));
      return null;
    }
  } else {
    const sourceChoice = await select({
      message: primary(JOB_SOURCE_QUESTION),
      choices: [
        { name: 'Paste text', value: 'text' },
        { name: 'Enter URL', value: 'url' },
      ],
    });

    if (sourceChoice === 'url') {
      const urlInput =
        (await input({ message: primary(JOB_URL_PROMPT) })) ?? '';
      if (!urlInput.trim()) {
        console.log(
          warn("No job description provided. Run again when you're ready.")
        );
        return null;
      }
      const fetchSpinner = ora('Fetching job description...').start();
      try {
        jobDescription = await fetchJobDescription(urlInput.trim());
        fetchSpinner.succeed('Job description fetched');
      } catch (err) {
        fetchSpinner.fail();
        console.error(error(err instanceof Error ? err.message : String(err)));
        return null;
      }
    } else {
      const jobInput =
        (await editor({
          message: primary(JOB_TEXT_PROMPT),
          waitForUserInput: false,
        })) ?? '';
      if (!jobInput.trim()) {
        console.log(
          warn("No job description provided. Run again when you're ready.")
        );
        return null;
      }
      jobDescription = sanitizeJobText(jobInput);
    }
  }

  let company: string;
  let jobSlug: string;

  const extractSpinner = ora('Extracting job information...').start();
  try {
    const extracted = await extractCompanyAndJobSlug(jobDescription);
    company = extracted.company?.trim() ?? '';
    jobSlug = extracted.jobSlug?.trim() ?? '';
    extractSpinner.succeed();
  } catch (err) {
    extractSpinner.fail();
    console.error(error(err instanceof Error ? err.message : String(err)));
    company = '';
    jobSlug = '';
  }

  while (!company) {
    const answer = await ask(COMPANY_PROMPT);
    if (answer.trim()) {
      company = answer.trim();
    }
  }

  while (!jobSlug) {
    const answer = await ask(ROLE_PROMPT);
    if (answer.trim()) {
      jobSlug = answer.trim();
    }
  }

  return { jobDescription, company, jobSlug };
}

export async function runResume(url?: string): Promise<void> {
  warnIfApiKeyMissing({
    onWarn: (msg) => console.warn(warn(msg)),
  });
  if (!validateApiKey()) {
    return;
  }

  if (url) {
    console.log(dim(`(Job URL: ${url})`));
  }

  await ensureBobJobDirExists();

  let summary = await readProfessionalSummary({
    onError: (msg, err) => {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : undefined;
      if (code === 'ENOENT') return; // File doesn't exist yet — expected for first-time users
      console.error(error(msg), err);
    },
  });

  if (!summary) {
    const fromSource = await collectSummaryFromSource();
    if (!fromSource) {
      return;
    }
    summary = fromSource;
  }

  summary = await fillGaps(summary);

  if (!hasMinimumFields(summary)) {
    console.log(
      warn(
        "We still need a bit more info. Run the command again when you're ready."
      )
    );
    return;
  }

  await writeProfessionalSummary(summary);

  const jobData = await collectJobDescription(url);
  if (!jobData) {
    return;
  }

  const { jobDescription, company, jobSlug } = jobData;

  const { summary: finalSummary, exitReason } = await runClarificationLoop(
    summary,
    jobDescription
  );

  await writeProfessionalSummary(finalSummary);

  if (exitReason === 'exited') {
    return;
  }

  if (exitReason === 'early') {
    console.log();
    console.log(dim('Great match! Your profile is ready for the next step.'));
    console.log();
  } else if (exitReason === 'cancelled') {
    // User pressed Ctrl+C - no message
  } else if (exitReason === 'maxRounds') {
    console.log(
      dim(
        "We've reached the max rounds. Your profile is ready for the next step."
      )
    );
  } else {
    console.log(dim('Your profile has been saved.'));
  }

  const config = await readConfig();
  const home = homedir();
  const resolvePath = (p: string) =>
    p.startsWith('~') ? p.replace(/^~/, home) : p;

  let saveDir: string;
  let userSavePath: string;
  if (config.resumeSaveDir) {
    const answer =
      (await input({
        message: primary(SAVE_LOCATION_PROMPT),
        default: config.resumeSaveDir,
      })) ?? '';
    userSavePath = answer.trim() ? answer.trim() : config.resumeSaveDir;
    saveDir = resolvePath(userSavePath);
    await writeConfig({ resumeSaveDir: userSavePath });
  } else {
    let answer: string;
    do {
      answer =
        (await input({ message: primary(SAVE_LOCATION_PROMPT) }))?.trim() ?? '';
      if (!answer) {
        console.log(warn('Please enter a directory path to save your resume.'));
      }
    } while (!answer);
    userSavePath = answer;
    saveDir = resolvePath(answer);
    await writeConfig({ resumeSaveDir: answer });
  }

  const resumeSpinner = ora('Generating your tailored resume...').start();
  try {
    const tailoredResume = await generateJobTailoredResume(
      finalSummary,
      jobDescription
    );
    const outputPath = getResumeFilePath(company, jobSlug, saveDir);
    await renderResumeToPdf(tailoredResume, outputPath);
    const displayPath = `${userSavePath.replace(/\/$/, '')}/${basename(outputPath)}`;
    resumeSpinner.succeed(`Resume saved to: ${cyan(displayPath)}`);
  } catch (err) {
    resumeSpinner.fail();
    console.error(error(err instanceof Error ? err.message : String(err)));
  }
}
