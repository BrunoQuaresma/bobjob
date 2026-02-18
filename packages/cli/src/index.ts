import { Command } from 'commander';
import { join } from 'node:path';
import { runResume } from './commands/resume';
import { error } from './output';

const pkg = (await Bun.file(
  join(import.meta.dir, '../package.json')
).json()) as {
  version: string;
};

const program = new Command();

program
  .name('bobjob')
  .description('Bob Job — Your AI job-search assistant')
  .version(pkg.version);

program
  .command('resume')
  .description('Generate a tailored resume for a job')
  .argument('[url]', 'Job description URL (or provide in chat)')
  .action(async (url: string | undefined) => {
    await runResume(url);
  });

program.parseAsync().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(error(`Error: ${message}`));
  process.exit(1);
});
