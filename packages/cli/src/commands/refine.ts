import {
  ensureBobJobDirExists,
  readProfessionalSummary,
  refineSummaryWithText,
  validateApiKey,
  warnIfApiKeyMissing,
  writeProfessionalSummary,
} from '@bobjob/core';
import ora from 'ora';
import { collectRawTextFromSource } from './collect-source-text';
import { error, success, warn } from '../output';

const NO_SUMMARY_MESSAGE =
  "You don't have a professional summary yet. Run `bobjob resume` first to create one.";
const REFINE_SOURCE_QUESTION =
  'How would you like to provide additional information?';
const REFINE_TEXT_PROMPT =
  'Paste your additional information (resume excerpt, notes, etc.):';
const REFINE_PDF_PROMPT = 'Search for your PDF';

export async function runRefine(): Promise<void> {
  warnIfApiKeyMissing({
    onWarn: (msg) => console.warn(warn(msg)),
  });
  if (!validateApiKey()) {
    return;
  }

  await ensureBobJobDirExists();

  const summary = await readProfessionalSummary({
    onError: (msg, err) => {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : undefined;
      if (code === 'ENOENT') return;
      console.error(error(msg), err);
    },
  });

  if (!summary) {
    console.log(warn(NO_SUMMARY_MESSAGE));
    return;
  }

  const rawText = await collectRawTextFromSource({
    sourceQuestion: REFINE_SOURCE_QUESTION,
    textPrompt: REFINE_TEXT_PROMPT,
    pdfSearchPrompt: REFINE_PDF_PROMPT,
  });

  if (!rawText) {
    return;
  }

  const refineSpinner = ora('Refining your professional summary...').start();
  try {
    const refined = await refineSummaryWithText(summary, rawText);
    await writeProfessionalSummary(refined);
    refineSpinner.succeed(success('Professional summary updated'));
  } catch (err) {
    refineSpinner.fail();
    console.error(error(err instanceof Error ? err.message : String(err)));
  }
}
