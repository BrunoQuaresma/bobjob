#!/usr/bin/env bun
import { select } from '@inquirer/prompts';
import { Command } from 'commander';
import { join } from 'node:path';
import { runRefine } from './commands/refine';
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

program.action(async () => {
  const command = await select({
    message: 'What would you like to do?',
    choices: [
      { name: 'Generate a tailored resume for a job', value: 'resume' },
      { name: 'Refine your professional summary', value: 'refine' },
    ],
  });

  switch (command) {
    case 'resume':
      await runResume();
      break;
    case 'refine':
      await runRefine();
      break;
  }
});

program
  .command('resume')
  .description('Generate a tailored resume for a job')
  .argument('[url]', 'Job description URL (or provide in chat)')
  .action(async (url: string | undefined) => {
    await runResume(url);
  });

program
  .command('refine')
  .description('Refine your professional summary with additional information')
  .action(async () => {
    await runRefine();
  });

program.parseAsync().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(error(`Error: ${message}`));
  process.exit(1);
});
