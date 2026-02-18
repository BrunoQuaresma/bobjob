import { chromium } from 'playwright';
import { sanitizeJobText } from './sanitize-job-text';

const PAGE_NOT_FOUND_MESSAGE =
  "This page doesn't exist or the job may have been removed.";
const NETWORK_TIMEOUT_MESSAGE =
  "We couldn't reach that page. Check the URL or try pasting the job description instead.";
const GENERIC_ERROR_MESSAGE =
  "We couldn't fetch that page. Try pasting the job description as text.";

export type FetchJobDescriptionOptions = {
  /** For testing: inject a mock instead of using real Playwright */
  getPage?: (url: string) => Promise<{ innerText: () => Promise<string> }>;
};

function is404(err: unknown): boolean {
  return (
    err instanceof Error &&
    (/404|not found/i.test(err.message) ||
      err.message === PAGE_NOT_FOUND_MESSAGE)
  );
}

function isNetworkOrTimeout(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('net::') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('network')
  );
}

async function defaultGetPage(
  url: string
): Promise<{ innerText: () => Promise<string> }> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const response = await page.goto(url, { timeout: 30_000 });
    if (response && !response.ok()) {
      if (response.status() === 404) {
        throw new Error(PAGE_NOT_FOUND_MESSAGE);
      }
      throw new Error(GENERIC_ERROR_MESSAGE);
    }
    if (!response) {
      throw new Error(GENERIC_ERROR_MESSAGE);
    }
    const text = await page.locator('body').innerText();
    return { innerText: () => Promise.resolve(text) };
  } finally {
    await browser.close();
  }
}

/**
 * Fetches job description text from a URL using Playwright.
 *
 * @param url - Job posting URL to fetch
 * @param options - Optional getPage for testing
 * @returns Sanitized job description text
 * @throws Error with user-friendly message on fetch failure
 */
export async function fetchJobDescription(
  url: string,
  options?: FetchJobDescriptionOptions
): Promise<string> {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Please provide a valid URL.');
  }

  const getPage = options?.getPage ?? defaultGetPage;

  try {
    const page = await getPage(url.trim());
    const rawText = await page.innerText();
    return sanitizeJobText(rawText);
  } catch (err) {
    if (is404(err)) {
      throw new Error(PAGE_NOT_FOUND_MESSAGE);
    }
    if (isNetworkOrTimeout(err)) {
      throw new Error(NETWORK_TIMEOUT_MESSAGE);
    }
    if (err instanceof Error && err.message === GENERIC_ERROR_MESSAGE) {
      throw err;
    }
    throw new Error(GENERIC_ERROR_MESSAGE);
  }
}
