import { homedir } from 'node:os';
import { join } from 'node:path';
import { nanoid } from 'nanoid';

export function getBobJobDir(): string {
  const home = homedir();
  return join(home, '.bobjob');
}

export function getProfessionalSummaryPath(): string {
  return join(getBobJobDir(), 'professional-summary.json');
}

export function getResumesDir(): string {
  return join(getBobJobDir(), 'resumes');
}

export function getConfigPath(): string {
  return join(getBobJobDir(), 'config.json');
}

export function getResumeFilePath(
  company: string,
  jobSlug: string,
  baseDir?: string
): string {
  if (typeof company !== 'string' || !company.trim()) {
    throw new Error('company must be a non-empty string');
  }
  if (typeof jobSlug !== 'string' || !jobSlug.trim()) {
    throw new Error('jobSlug must be a non-empty string');
  }

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  const sluggedCompany = slugify(company) || 'company';
  const sluggedJobSlug = slugify(jobSlug) || 'role';
  const id = nanoid(5);
  const dir = baseDir ?? getResumesDir();
  return join(dir, `${sluggedCompany}-${sluggedJobSlug}-${id}.pdf`);
}
