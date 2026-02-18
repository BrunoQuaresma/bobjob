import { runResume } from './commands/resume';

const args = process.argv.slice(2);
const command = args[0];

function printHelp(): void {
  console.log(`
Bob Job — Your AI job-search assistant

Usage:
  bobjob                    Show this help
  bobjob resume [url]       Generate a tailored resume for a job

Examples:
  bobjob resume
  bobjob resume https://example.com/jobs/senior-engineer

Need help? Just run \`bobjob\` with no args to see this message.
`);
}

async function main(): Promise<number> {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return 0;
  }

  if (command === 'resume') {
    const url = args[1];
    await runResume(url);
    return 0;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  return 1;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
    process.exit(1);
  });
