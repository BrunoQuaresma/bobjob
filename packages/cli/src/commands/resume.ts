import {
  ensureBobJobDirExists,
  extractTextFromPdf,
  generateSummaryFromText,
  hasMinimumFields,
  readProfessionalSummary,
  warnIfApiKeyMissing,
  writeProfessionalSummary,
} from '@bobjob/core';
import type { ProfessionalSummary } from '@bobjob/core';
import { ask } from '../chat/prompt';
import { dim, error, info, warn } from '../output';

const SOURCE_PROMPT =
  "Do you have a resume PDF to import, or will you type/paste your info? (Enter a file path, or type 'text')";
const TEXT_PROMPT =
  'Paste your resume or professional info (one line for now):';
const NAME_PROMPT = "What's your full name?";
const EMAIL_PROMPT = "What's your email?";
const EXPERIENCE_PROMPT =
  "Tell me about one work experience or education (e.g. 'Software Engineer at Acme, 2020-2023'):";

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

export async function runResume(url?: string): Promise<void> {
  warnIfApiKeyMissing({
    onWarn: (msg) => console.warn(warn(msg)),
  });

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
}
