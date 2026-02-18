import { warnIfApiKeyMissing } from '@bobjob/core';

export async function runResume(url?: string): Promise<void> {
  warnIfApiKeyMissing();
  console.log('Resume flow coming soon!');
  if (url) {
    console.log(`(Job URL: ${url})`);
  }
}
