import { describe, expect, it, mock } from 'bun:test';
import * as os from 'node:os';

const TEST_HOME = '/test-home';

mock.module('node:os', () => ({
  ...os,
  homedir: () => TEST_HOME,
}));

describe('paths', () => {
  it('getBobJobDir returns path ending in .bobjob', async () => {
    const { getBobJobDir } = await import('./paths');
    const dir = getBobJobDir();
    expect(dir).toBe(`${TEST_HOME}/.bobjob`);
  });

  it('getProfessionalSummaryPath returns path to professional-summary.json', async () => {
    const { getProfessionalSummaryPath } = await import('./paths');
    const path = getProfessionalSummaryPath();
    expect(path).toBe(`${TEST_HOME}/.bobjob/professional-summary.json`);
  });

  it('getResumesDir returns path to resumes directory', async () => {
    const { getResumesDir } = await import('./paths');
    const dir = getResumesDir();
    expect(dir).toBe(`${TEST_HOME}/.bobjob/resumes`);
  });
});
