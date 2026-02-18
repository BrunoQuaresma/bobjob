import { warnIfApiKeyMissing } from '@bobjob/core';
import { dim, info, warn } from '../output';

export async function runResume(url?: string): Promise<void> {
  warnIfApiKeyMissing({
    onWarn: (msg) => console.warn(warn(msg)),
  });
  console.log(info('Resume flow coming soon!'));
  if (url) {
    console.log(dim(`(Job URL: ${url})`));
  }
}
