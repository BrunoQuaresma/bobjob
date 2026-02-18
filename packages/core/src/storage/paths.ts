import { homedir } from 'node:os';
import { join } from 'node:path';

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
