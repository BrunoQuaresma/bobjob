import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import * as os from 'node:os';
import type { ProfessionalSummary } from '../types/professional-summary';

describe('professional-summary storage', () => {
  const testDir = mkdtempSync(join(tmpdir(), 'bobjob-test-'));
  /** Parent dir for professional-summary.json; created by beforeEach before each test */
  const bobjobDir = join(testDir, '.bobjob');

  mock.module('node:os', () => ({
    ...os,
    homedir: () => testDir,
  }));

  beforeEach(async () => {
    mkdirSync(bobjobDir, { recursive: true });
    const { unlink } = await import('node:fs/promises');
    const { getProfessionalSummaryPath } = await import('./paths');
    try {
      await unlink(getProfessionalSummaryPath());
    } catch {
      /* file may not exist */
    }
  });

  const noopOnError = { onError: () => {} };

  it('readProfessionalSummary returns null when file is missing', async () => {
    const { readProfessionalSummary } = await import('./professional-summary');
    const result = await readProfessionalSummary(noopOnError);
    expect(result).toBeNull();
  });

  it('readProfessionalSummary returns null for invalid JSON', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getProfessionalSummaryPath } = await import('./paths');
    await writeFile(getProfessionalSummaryPath(), 'not valid json', 'utf-8');

    const { readProfessionalSummary } = await import('./professional-summary');
    const result = await readProfessionalSummary(noopOnError);
    expect(result).toBeNull();
  });

  it('readProfessionalSummary returns parsed summary for valid JSON', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getProfessionalSummaryPath } = await import('./paths');
    const validSummary = {
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
      experiences: [
        { title: 'Engineer', company: 'Acme', startDate: '2020-01' },
      ],
    };
    await writeFile(
      getProfessionalSummaryPath(),
      JSON.stringify(validSummary),
      'utf-8'
    );

    const { readProfessionalSummary } = await import('./professional-summary');
    const result = await readProfessionalSummary(noopOnError);
    expect(result).toEqual(validSummary);
  });

  it('readProfessionalSummary returns null when JSON fails schema validation', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getProfessionalSummaryPath } = await import('./paths');
    await writeFile(
      getProfessionalSummaryPath(),
      JSON.stringify({
        name: 'Jane',
        contact: {}, // missing required email
      }),
      'utf-8'
    );

    const { readProfessionalSummary } = await import('./professional-summary');
    const result = await readProfessionalSummary(noopOnError);
    expect(result).toBeNull();
  });

  it('writeProfessionalSummary creates dir and writes JSON', async () => {
    const { readFile } = await import('node:fs/promises');
    const { getProfessionalSummaryPath } = await import('./paths');
    const summary = {
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
      experiences: [
        { title: 'Engineer', company: 'Acme', startDate: '2020-01' },
      ],
    };

    const { writeProfessionalSummary } = await import('./professional-summary');
    await writeProfessionalSummary(summary);

    const content = await readFile(getProfessionalSummaryPath(), 'utf-8');
    expect(JSON.parse(content)).toEqual(summary);
  });

  it('ensureBobJobDirExists creates .bobjob directory', async () => {
    const { existsSync } = await import('node:fs');
    const { getBobJobDir } = await import('./paths');

    const { ensureBobJobDirExists } = await import('./professional-summary');
    await ensureBobJobDirExists();

    expect(existsSync(getBobJobDir())).toBe(true);
  });

  it('ensureResumesDirExists creates resumes directory', async () => {
    const { existsSync } = await import('node:fs');
    const { getResumesDir } = await import('./paths');

    const { ensureResumesDirExists } = await import('./professional-summary');
    await ensureResumesDirExists();

    expect(existsSync(getResumesDir())).toBe(true);
  });

  it('writeProfessionalSummary throws when summary fails schema validation', async () => {
    const { writeProfessionalSummary } = await import('./professional-summary');
    const invalidSummary = { name: 'Jane', contact: {} };
    await expect(
      writeProfessionalSummary(invalidSummary as ProfessionalSummary)
    ).rejects.toThrow('Invalid professional summary');
  });

  it('writeProfessionalSummary uses pretty formatting', async () => {
    const { readFile } = await import('node:fs/promises');
    const summary = { name: 'Jane', contact: { email: 'j@e.com' } };

    const { writeProfessionalSummary } = await import('./professional-summary');
    await writeProfessionalSummary(summary);

    const content = await readFile(
      (await import('./paths')).getProfessionalSummaryPath(),
      'utf-8'
    );
    expect(content).toContain('\n');
    expect(JSON.parse(content)).toEqual(summary);
  });
});
