# Bob Job

Your AI-powered job-search assistant. Feed it a job posting, get a tailored resume as PDF.

## Features

- **Import your existing resume** — PDF or paste text to build a professional summary
- **Paste a job URL or description** — BobJob fetches and parses it automatically (Playwright + Chromium bundled)
- **AI-driven clarification loop** — Answer questions to maximize your match score (0–100)
- **Clean PDF output** — Print-ready A4 resume tailored to the specific job
- **Refine over time** — Add new experience or details to your professional summary
- **Local-first** — All data stored in `~/.bobjob`; only LLM calls leave your machine

## How It Works

```mermaid
flowchart LR
  Import[Import resume or text] --> Summary[Build professional summary]
  Summary --> Job[Provide job description]
  Job --> Clarify[Clarification loop]
  Clarify -->|"Score >= 85 or 5 rounds"| PDF[Generate tailored PDF]
```

1. Import your resume (PDF or text) or use an existing professional summary
2. Provide a job description (URL or pasted text)
3. Answer optional clarification questions until match score ≥ 85% or you finish early
4. Get a job-tailored PDF resume

## Quick Start

**Prerequisites:** Node.js 18+, [OpenAI API key](https://platform.openai.com/api-keys)

```bash
export OPENAI_API_KEY=your-key-here
npx bobjob
```

That's it — no install required.

## Commands

| Command                        | Description                                                   |
| ------------------------------ | ------------------------------------------------------------- |
| `npx bobjob`                   | Interactive menu                                              |
| `npx bobjob resume [url]`      | Generate a tailored resume (optionally pass job URL directly) |
| `npx bobjob refine`            | Refine your professional summary with additional text or PDF  |
| `npx bobjob --debug [command]` | Show full error stack traces for troubleshooting              |

## Demo

### Generate a resume from a job URL

Pass the URL directly and BobJob fetches, parses, and tailors everything in one shot:

```
$ npx bobjob resume https://jobs.example.com/senior-engineer

(Job URL: https://jobs.example.com/senior-engineer)
? How would you like to provide your resume?
  ❯ Upload a PDF
    Paste text
✔ Generating your professional summary...
✔ Job description fetched
✔ Extracting job information...

Match score: 72/100

Your backend experience is strong but the listing emphasises
Kubernetes and CI/CD pipeline design. Adding detail about your
infrastructure work would raise the score.

? What would you like to do?
  ❯ Answer follow-up questions
    Generate resume
    Exit

Follow-up questions to strengthen your match. Press Ctrl+C to skip.

? Have you designed or maintained CI/CD pipelines? (1/3)
> Yes — built GitHub Actions workflows for three services at Acme...

✔ Incorporating your answers...

Match score: 91/100

? Where do you want to save your resume? ~/Documents/resumes
✔ Resume saved to: ~/Documents/resumes/example-senior-engineer-a1b2c.pdf
```

### Interactive mode

Run without arguments to get a guided menu:

```
$ npx bobjob

? What would you like to do?
  ❯ Generate a tailored resume for a job
    Refine your professional summary
```

### Refine your professional summary

Already have a summary? Add new experience or an updated resume to keep it current:

```
$ npx bobjob refine

? How would you like to provide additional information?
  ❯ Upload a PDF
    Paste text
✔ Refining your professional summary...
✔ Professional summary updated
```

## Storage

User data lives in `~/.bobjob`:

| Path                        | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `professional-summary.json` | Your profile (name, contact, experience, education) |
| `config.json`               | User preferences (e.g. resume save directory)       |
| `resumes/`                  | Generated PDFs (`<company>-<job-slug>-<id>.pdf`)    |

## Troubleshooting

Add `--debug` before any command to print the full error stack trace and root cause when something goes wrong:

```bash
npx bobjob --debug
npx bobjob --debug resume https://jobs.example.com/role
```

> Note: `--debug` must be placed **before** the subcommand (`npx bobjob --debug resume`, not `npx bobjob resume --debug`).

## Project Structure

Monorepo with Bun workspaces:

```
packages/
├── core/   # Business logic: LLM, PDF, job fetching, storage
└── cli/    # CLI interface (Commander, Inquirer)
```

- **@bobjob/core** — Reusable logic (Vercel AI SDK, Playwright, Handlebars, pdf-parse)
- **@bobjob/cli** — Commands and interactive prompts

## Development

```bash
bun install
bun run check      # Format, lint, typecheck, tests
bun run lint:fix   # Auto-fix lint issues
bun run format     # Prettier
bun run typecheck  # TypeScript
bun run core:test  # Core package tests
bun run cli:test   # CLI package tests
```

## Contributing

Contributions are welcome. Fork the repo, create a branch, and open a pull request.

## License

See [LICENSE](LICENSE) for details.
