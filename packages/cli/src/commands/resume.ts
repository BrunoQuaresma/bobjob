import {
  analyzeJobFit,
  ensureBobJobDirExists,
  ensureResumesDirExists,
  extractCompanyAndJobSlug,
  extractTextFromPdf,
  fetchJobDescription,
  generateJobTailoredResume,
  generateSummaryFromText,
  getResumeFilePath,
  hasMinimumFields,
  incorporateClarificationsIntoSummary,
  readProfessionalSummary,
  renderResumeToPdf,
  sanitizeJobText,
  validateApiKey,
  warnIfApiKeyMissing,
  writeProfessionalSummary,
} from '@bobjob/core';
import type { ProfessionalSummary } from '@bobjob/core';
import { input } from '@inquirer/prompts';
import { ask, askMultiline } from '../chat/prompt';
import { dim, error, info, warn } from '../output';

const DONE_KEYWORDS = ['done', 'skip', 'finish'];

function isDoneInput(value: string): boolean {
  return DONE_KEYWORDS.includes(value.trim().toLowerCase());
}

const JOB_DESCRIPTION_PROMPT =
  'Paste the job description or enter a URL. Press Enter twice when done.';

function isUrl(input: string): boolean {
  const t = input.trim();
  return (
    (t.startsWith('http://') || t.startsWith('https://')) && !t.includes('\n')
  );
}

const SOURCE_PROMPT =
  "Do you have a resume PDF to import, or will you type/paste your info? (Enter a file path, or type 'text')";
const TEXT_PROMPT =
  'Paste your resume or professional info (one line for now):';
const NAME_PROMPT = "What's your full name?";
const EMAIL_PROMPT = "What's your email?";
const EXPERIENCE_PROMPT =
  "Tell me about one work experience or education (e.g. 'Software Engineer at Acme, 2020-2023'):";
const COMPANY_PROMPT = 'What company is this for?';
const ROLE_PROMPT = 'What role is this for?';

function isTextChoice(input: string): boolean {
  return input.trim().toLowerCase() === 'text';
}

async function collectSummaryFromSource(): Promise<ProfessionalSummary | null> {
  const source = await ask(SOURCE_PROMPT);
  if (!source.trim()) {
    console.log(warn("No input. Try again when you're ready."));
    return null;
  }

  let rawText: string;

  if (isTextChoice(source)) {
    const text = await ask(TEXT_PROMPT);
    if (!text.trim()) {
      console.log(warn("No text provided. Try again when you're ready."));
      return null;
    }
    rawText = text;
  } else {
    try {
      rawText = await extractTextFromPdf(source.trim());
    } catch (err) {
      console.error(error(err instanceof Error ? err.message : String(err)));
      return null;
    }
  }

  try {
    const summary = await generateSummaryFromText(rawText);
    return summary;
  } catch (err) {
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
        try {
          const parsed = await generateSummaryFromText(
            `Work experience or education: ${expText}`
          );
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
            console.log(
              warn("Couldn't parse that. Try again with a clearer format.")
            );
          }
        } catch {
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
  exitReason: 'early' | 'maxRounds' | 'error';
};

async function runClarificationLoop(
  summary: ProfessionalSummary,
  jobDescription: string
): Promise<ClarificationLoopResult> {
  const maxRounds = 5;
  let currentSummary = summary;

  for (let round = 0; round < maxRounds; round++) {
    let analysis;
    try {
      analysis = await analyzeJobFit(currentSummary, jobDescription);
    } catch (err) {
      console.error(error(err instanceof Error ? err.message : String(err)));
      return { summary: currentSummary, exitReason: 'error' };
    }

    console.log(
      info(`Match score: ${analysis.matchScore}/100 — ${analysis.rationale}`)
    );

    if (
      analysis.matchScore >= 85 ||
      analysis.clarificationQuestions.length === 0
    ) {
      return { summary: currentSummary, exitReason: 'early' };
    }

    console.log(info('To improve your match, consider answering:'));

    const clarifications: Array<{ question: string; answer: string }> = [];
    const totalQuestions = analysis.clarificationQuestions.length;

    for (let i = 0; i < totalQuestions; i++) {
      const question = analysis.clarificationQuestions[i];
      if (question == null) continue;

      const message = `Question ${i + 1} of ${totalQuestions}. ${question}`;

      let answer: string;
      try {
        answer = (await input({ message })) ?? '';
      } catch {
        // User cancelled (Ctrl+C) - treat as done
        if (clarifications.length > 0) {
          try {
            currentSummary = await incorporateClarificationsIntoSummary(
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

      if (isDoneInput(answer)) {
        if (clarifications.length > 0) {
          try {
            currentSummary = await incorporateClarificationsIntoSummary(
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
      currentSummary = await incorporateClarificationsIntoSummary(
        currentSummary,
        clarifications
      );
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
    try {
      jobDescription = await fetchJobDescription(url);
    } catch (err) {
      console.error(error(err instanceof Error ? err.message : String(err)));
      return null;
    }
  } else {
    const jobInput = await askMultiline(JOB_DESCRIPTION_PROMPT);
    if (!jobInput.trim()) {
      console.log(
        warn("No job description provided. Run again when you're ready.")
      );
      return null;
    }

    if (isUrl(jobInput)) {
      try {
        jobDescription = await fetchJobDescription(jobInput.trim());
      } catch (err) {
        console.error(error(err instanceof Error ? err.message : String(err)));
        return null;
      }
    } else {
      jobDescription = sanitizeJobText(jobInput);
    }
  }

  let company: string;
  let jobSlug: string;

  try {
    const extracted = await extractCompanyAndJobSlug(jobDescription);
    company = extracted.company?.trim() ?? '';
    jobSlug = extracted.jobSlug?.trim() ?? '';
  } catch (err) {
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
    onError: (msg, err) => console.error(error(msg), err),
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
  console.log(info('Your professional summary is ready!'));

  const jobData = await collectJobDescription(url);
  if (!jobData) {
    return;
  }

  const { jobDescription, company, jobSlug } = jobData;
  console.log(info('Job description received.'));

  const { summary: finalSummary, exitReason } = await runClarificationLoop(
    summary,
    jobDescription
  );

  await writeProfessionalSummary(finalSummary);

  if (exitReason === 'early') {
    console.log(info('Great match! Your profile is ready for the next step.'));
  } else if (exitReason === 'maxRounds') {
    console.log(
      info(
        "We've reached the max rounds. Your profile is ready for the next step."
      )
    );
  } else {
    console.log(info('Your profile has been saved.'));
  }

  console.log(info('Generating your tailored resume...'));
  try {
    const tailoredResume = await generateJobTailoredResume(
      finalSummary,
      jobDescription
    );
    await ensureResumesDirExists();
    const outputPath = getResumeFilePath(company, jobSlug);
    await renderResumeToPdf(tailoredResume, outputPath);
    console.log(info(`Resume saved to: ${outputPath}`));
  } catch (err) {
    console.error(error(err instanceof Error ? err.message : String(err)));
  }
}
