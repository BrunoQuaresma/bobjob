import { cpSync, chmodSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const EXTERNALS = [
  '@inquirer/prompts',
  'chalk',
  'commander',
  'ora',
  '@ai-sdk/openai',
  'ai',
  'handlebars',
  'nanoid',
  'pdf-parse',
  '@playwright/browser-chromium',
  'playwright',
  'zod',
  '@fontsource/geist',
];

const distDir = join(__dirname, 'dist');
mkdirSync(distDir, { recursive: true });

const result = await Bun.build({
  entrypoints: [join(__dirname, 'src', 'index.ts')],
  outdir: distDir,
  target: 'node',
  format: 'esm',
  external: EXTERNALS,
});

if (!result.success) {
  console.error('Build failed:', result.logs);
  process.exit(1);
}

const output = result.outputs[0];
if (!output) {
  console.error('No output from build');
  process.exit(1);
}

let bundle = await output.text();
if (bundle.startsWith('#!')) {
  bundle = bundle.replace(/^#!.*\n/, '');
}
const withShebang = '#!/usr/bin/env node\n' + bundle;
await Bun.write(output.path, withShebang);
chmodSync(output.path, 0o755);

const outputDir = dirname(output.path);
cpSync(
  join(__dirname, '..', 'core', 'src', 'pdf', 'resume-template.hbs'),
  join(outputDir, 'resume-template.hbs')
);

cpSync(join(__dirname, '..', '..', 'README.md'), join(__dirname, 'README.md'));

console.log('Build complete:', output.path);
