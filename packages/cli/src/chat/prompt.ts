import * as readline from 'node:readline';
import { info } from '../output';

export type AskOptions = {
  /** For testing: inject a mock readline interface instead of using stdin/stdout */
  rl?: readline.Interface;
};

/**
 * Asks the user a question and returns their trimmed response.
 * Returns empty string if user submits blank line.
 */
export function ask(question: string, options?: AskOptions): Promise<string> {
  const rl =
    options?.rl ??
    readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

  const displayQuestion = info(question);
  const prompt = `${displayQuestion} `;

  return new Promise<string>((resolve) => {
    const onClose = () => {
      cleanup();
      resolve('');
    };

    const onSIGINT = () => {
      cleanup();
      rl.close();
      process.exit(130);
    };

    const cleanup = () => {
      rl.off('close', onClose);
      rl.off('SIGINT', onSIGINT);
    };

    rl.once('close', onClose);
    rl.once('SIGINT', onSIGINT);

    rl.question(prompt, (answer) => {
      cleanup();
      if (!options?.rl) {
        rl.close();
      }
      resolve((answer ?? '').trim());
    });
  });
}
