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

  it('getConfigPath returns path to config.json', async () => {
    const { getConfigPath } = await import('./paths');
    const path = getConfigPath();
    expect(path).toBe(`${TEST_HOME}/.bobjob/config.json`);
  });

  it('getResumeFilePath with baseDir uses custom directory', async () => {
    const { getResumeFilePath } = await import('./paths');
    const customDir = '/custom/output/dir';
    const path = getResumeFilePath('Acme', 'Engineer', customDir);
    expect(path).toMatch(
      new RegExp(`^${customDir}/acme-engineer-[a-zA-Z0-9_-]{5}\\.pdf$`)
    );
  });

  it('getResumeFilePath returns path with kebab-case company and job slug', async () => {
    const { getResumeFilePath } = await import('./paths');
    const path = getResumeFilePath('Acme Corp', 'Senior Engineer');
    expect(path).toMatch(
      new RegExp(
        `^${TEST_HOME}/.bobjob/resumes/acme-corp-senior-engineer-[a-zA-Z0-9_-]{5}\\.pdf$`
      )
    );
  });

  it('getResumeFilePath normalizes special characters to kebab-case', async () => {
    const { getResumeFilePath } = await import('./paths');
    const path = getResumeFilePath('Foo & Bar Inc.', 'Dev-Ops_Role');
    // Underscores and & are stripped; spaces become hyphens; multiple hyphens collapsed
    expect(path).toMatch(
      new RegExp(
        `^${TEST_HOME}/.bobjob/resumes/foo-bar-inc-dev-opsrole-[a-zA-Z0-9_-]{5}\\.pdf$`
      )
    );
  });

  it('getResumeFilePath throws when company is empty', async () => {
    const { getResumeFilePath } = await import('./paths');
    expect(() => getResumeFilePath('', 'engineer')).toThrow(
      'company must be a non-empty string'
    );
  });

  it('getResumeFilePath throws when jobSlug is empty', async () => {
    const { getResumeFilePath } = await import('./paths');
    expect(() => getResumeFilePath('Acme', '')).toThrow(
      'jobSlug must be a non-empty string'
    );
  });

  it('getResumeFilePath throws when company is whitespace only', async () => {
    const { getResumeFilePath } = await import('./paths');
    expect(() => getResumeFilePath('   ', 'engineer')).toThrow(
      'company must be a non-empty string'
    );
  });

  it('getResumeFilePath throws when jobSlug is whitespace only', async () => {
    const { getResumeFilePath } = await import('./paths');
    expect(() => getResumeFilePath('Acme', '   ')).toThrow(
      'jobSlug must be a non-empty string'
    );
  });

  it('getResumeFilePath uses fallback when slugify produces empty string', async () => {
    const { getResumeFilePath } = await import('./paths');
    const path = getResumeFilePath('...', '!!!');
    expect(path).toMatch(
      new RegExp(
        `^${TEST_HOME}/.bobjob/resumes/company-role-[a-zA-Z0-9_-]{5}\\.pdf$`
      )
    );
  });
});
