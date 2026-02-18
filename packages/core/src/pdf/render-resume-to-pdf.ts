import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Browser } from 'playwright';
import { chromium } from 'playwright';
import type { ProfessionalSummary } from '../types/professional-summary';
import { hasMinimumFields } from '../validation/has-minimum-fields';
import { renderResumeToHtml } from './render-resume-to-html';

const GENERIC_ERROR_MESSAGE =
  "We couldn't generate your PDF. Please try again.";

export type RenderResumeToPdfOptions = {
  /** For testing: inject a mock instead of using real Playwright */
  getBrowser?: () => Promise<Browser>;
};

async function defaultGetBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

/**
 * Renders a resume to PDF and writes it to the given path.
 * Creates the parent directory if it does not exist.
 *
 * @param resume - The job-tailored resume (must have minimum fields)
 * @param outputPath - Path where the PDF will be written
 * @param options - Optional getBrowser for testing
 * @throws Error if resume is invalid or PDF generation fails
 */
export async function renderResumeToPdf(
  resume: ProfessionalSummary,
  outputPath: string,
  options?: RenderResumeToPdfOptions
): Promise<void> {
  if (
    !resume ||
    typeof resume !== 'object' ||
    Array.isArray(resume) ||
    Object.keys(resume).length === 0
  ) {
    throw new Error('Resume is required.');
  }

  if (!hasMinimumFields(resume)) {
    throw new Error(
      'Resume must have name, contact.email, and at least one experience or education.'
    );
  }

  if (typeof outputPath !== 'string' || !outputPath.trim()) {
    throw new Error('Output path is required.');
  }

  const getBrowser = options?.getBrowser ?? defaultGetBrowser;

  try {
    const parentDir = dirname(outputPath);
    await mkdir(parentDir, { recursive: true });

    const html = await renderResumeToHtml(resume);

    const browser = await getBrowser();
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Resume is required')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('Resume must have name')) {
      throw err;
    }
    if (err instanceof Error && err.message.includes('Output path')) {
      throw err;
    }
    throw new Error(GENERIC_ERROR_MESSAGE, { cause: err });
  }
}
