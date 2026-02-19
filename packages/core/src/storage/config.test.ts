import { mkdtempSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, mock } from 'bun:test';
import * as os from 'node:os';

describe('config storage', () => {
  const testDir = mkdtempSync(join(tmpdir(), 'bobjob-config-test-'));
  const bobjobDir = join(testDir, '.bobjob');

  mock.module('node:os', () => ({
    ...os,
    homedir: () => testDir,
  }));

  beforeEach(async () => {
    mkdirSync(bobjobDir, { recursive: true });
    const { unlink } = await import('node:fs/promises');
    const { getConfigPath } = await import('./paths');
    try {
      await unlink(getConfigPath());
    } catch {
      /* file may not exist */
    }
  });

  it('readConfig returns empty object when file is missing', async () => {
    const { readConfig } = await import('./config');
    const result = await readConfig();
    expect(result).toEqual({});
  });

  it('readConfig returns empty object for invalid JSON', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getConfigPath } = await import('./paths');
    await writeFile(getConfigPath(), 'not valid json', 'utf-8');

    const { readConfig } = await import('./config');
    const result = await readConfig();
    expect(result).toEqual({});
  });

  it('readConfig returns parsed config for valid JSON', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getConfigPath } = await import('./paths');
    const validConfig = { resumeSaveDir: '~/Documents/resumes' };
    await writeFile(getConfigPath(), JSON.stringify(validConfig), 'utf-8');

    const { readConfig } = await import('./config');
    const result = await readConfig();
    expect(result).toEqual(validConfig);
  });

  it('writeConfig writes and readConfig reads back', async () => {
    const { readConfig, writeConfig } = await import('./config');
    const config = { resumeSaveDir: '~/Downloads' };
    await writeConfig(config);
    const result = await readConfig();
    expect(result).toEqual(config);
  });

  it('readConfig returns empty resumeSaveDir when value is empty string', async () => {
    const { writeFile } = await import('node:fs/promises');
    const { getConfigPath } = await import('./paths');
    await writeFile(
      getConfigPath(),
      JSON.stringify({ resumeSaveDir: '   ' }),
      'utf-8'
    );

    const { readConfig } = await import('./config');
    const result = await readConfig();
    expect(result).toEqual({});
  });
});
