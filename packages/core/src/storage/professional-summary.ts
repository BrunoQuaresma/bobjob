import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  ProfessionalSummarySchema,
  type ProfessionalSummary,
} from '../types/professional-summary';
import {
  getBobJobDir,
  getProfessionalSummaryPath,
  getResumesDir,
} from './paths';

export async function ensureBobJobDirExists(): Promise<void> {
  await mkdir(getBobJobDir(), { recursive: true });
}

export async function ensureResumesDirExists(): Promise<void> {
  await mkdir(getResumesDir(), { recursive: true });
}

export type ReadProfessionalSummaryOptions = {
  /** Called when an error occurs; if omitted, errors are logged to console.error */
  onError?: (message: string, err: unknown) => void;
};

export async function readProfessionalSummary(
  options?: ReadProfessionalSummaryOptions
): Promise<ProfessionalSummary | null> {
  const reportError =
    options?.onError ?? ((msg, err) => console.error(msg, err));
  const path = getProfessionalSummaryPath();

  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch (err) {
    reportError('Failed to read professional summary:', err);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    reportError('Invalid JSON in professional summary:', err);
    return null;
  }

  const result = ProfessionalSummarySchema.safeParse(parsed);
  if (!result.success) {
    reportError('Professional summary failed schema validation:', result.error);
    return null;
  }
  return result.data;
}

export async function writeProfessionalSummary(
  summary: ProfessionalSummary
): Promise<void> {
  const result = ProfessionalSummarySchema.safeParse(summary);
  if (!result.success) {
    throw new Error('Invalid professional summary');
  }

  await ensureBobJobDirExists();
  const path = getProfessionalSummaryPath();
  const json = JSON.stringify(result.data, null, 2);
  await writeFile(path, json, 'utf-8');
}
