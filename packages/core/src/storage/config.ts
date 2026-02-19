import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { getBobJobDir, getConfigPath } from './paths';

export interface BobJobConfig {
  resumeSaveDir?: string;
}

export async function readConfig(): Promise<BobJobConfig> {
  const path = getConfigPath();

  let raw: string;
  try {
    raw = await readFile(path, 'utf-8');
  } catch {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (parsed == null || typeof parsed !== 'object') {
    return {};
  }

  const obj = parsed as Record<string, unknown>;
  const resumeSaveDir =
    typeof obj.resumeSaveDir === 'string' && obj.resumeSaveDir.trim()
      ? obj.resumeSaveDir.trim()
      : undefined;

  return { resumeSaveDir };
}

export async function writeConfig(config: BobJobConfig): Promise<void> {
  await mkdir(getBobJobDir(), { recursive: true });
  const path = getConfigPath();
  const json = JSON.stringify(config, null, 2);
  await writeFile(path, json, 'utf-8');
}
