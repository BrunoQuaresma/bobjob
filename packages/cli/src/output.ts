import chalk from 'chalk';

export const error = chalk.bold.red;
export const warn = chalk.yellow;
export const info = chalk.blue;
export const dim = chalk.dim;
export const white = chalk.white;
export const primary = chalk.bold;
export const success = chalk.green;
export const cyan = chalk.cyan;

export function printDebugError(err: unknown): void {
  if (!(err instanceof Error)) {
    console.error(dim(String(err)));
    return;
  }
  console.error(dim(err.stack ?? err.message));
  if (err.cause) {
    console.error(dim('\nCaused by:'));
    printDebugError(err.cause);
  }
}
