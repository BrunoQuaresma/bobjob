import { extractTextFromPdf } from '@bobjob/core';
import { homedir } from 'node:os';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { search, select } from '@inquirer/prompts';
import ora from 'ora';
import { ask } from '../chat/prompt';
import { error, primary, warn } from '../output';

const PDF_SEARCH_MAX_DEPTH = 4;

export type CollectRawTextOptions = {
  sourceQuestion?: string;
  textPrompt?: string;
  pdfSearchPrompt?: string;
};

const DEFAULT_OPTIONS: Required<CollectRawTextOptions> = {
  sourceQuestion: 'How would you like to provide your resume?',
  textPrompt: 'Paste your resume or professional info (one line for now):',
  pdfSearchPrompt: 'Search for your resume PDF',
};

async function findPdfFiles(
  dir: string,
  depth: number,
  maxDepth: number
): Promise<string[]> {
  if (depth >= maxDepth) return [];
  const pdfs: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = join(dir, e.name);
      if (e.isDirectory() && !e.name.startsWith('.')) {
        pdfs.push(...(await findPdfFiles(full, depth + 1, maxDepth)));
      } else if (e.isFile() && e.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(full);
      }
    }
  } catch {
    // Skip directories we can't read
  }
  return pdfs;
}

/**
 * Collects raw text from the user via PDF import or text paste.
 * Returns null if the user cancels or provides no input.
 */
export async function collectRawTextFromSource(
  options: CollectRawTextOptions = {}
): Promise<string | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const choice = await select({
    message: primary(opts.sourceQuestion),
    choices: [
      { name: 'Import PDF', value: 'pdf' },
      { name: 'Paste text', value: 'text' },
    ],
  });

  if (choice === 'text') {
    const text = await ask(opts.textPrompt);
    if (!text.trim()) {
      console.log(warn("No text provided. Try again when you're ready."));
      return null;
    }
    return text;
  }

  const home = homedir();
  let cachedPdfs: string[] | null = null;

  const filePath = await search({
    message: primary(opts.pdfSearchPrompt),
    source: async (term, { signal }) => {
      await setTimeout(300);
      if (signal.aborted) return [];

      if (!cachedPdfs) {
        cachedPdfs = await findPdfFiles(home, 0, PDF_SEARCH_MAX_DEPTH);
      }

      const lower = (term ?? '').trim().toLowerCase();
      const filterTerm =
        lower === '' || lower === '~' ? '' : lower.replace(/^~\/?/, '');

      const filtered = filterTerm
        ? cachedPdfs.filter((p) => {
            const displayPath = p.replace(home, '~').toLowerCase();
            const pathSegments = displayPath.split(/[/\\]/);
            return (
              displayPath.includes(filterTerm) ||
              pathSegments.some((seg) => seg.includes(filterTerm))
            );
          })
        : cachedPdfs;

      return filtered.slice(0, 50).map((path) => ({
        value: path,
        name: path.replace(home, '~'),
      }));
    },
  });

  if (!filePath?.trim()) {
    console.log(warn("No file selected. Try again when you're ready."));
    return null;
  }

  const resolved = filePath.replace(/^~/, home);
  const extractSpinner = ora('Extracting text from PDF...').start();
  try {
    const rawText = await extractTextFromPdf(resolved.trim());
    extractSpinner.succeed('PDF extracted');
    return rawText;
  } catch (err) {
    extractSpinner.fail();
    console.error(error(err instanceof Error ? err.message : String(err)));
    return null;
  }
}
