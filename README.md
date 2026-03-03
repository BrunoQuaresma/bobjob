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

**Prerequisites:** [Bun](https://bun.sh) runtime, [OpenAI API key](https://platform.openai.com/api-keys)

```bash
bun install
export OPENAI_API_KEY=your-key-here
bun run bobjob
```

Or run directly:

```bash
bunx bobjob resume
# or install globally
bun install -g . && bobjob resume
```

## Commands

| Command               | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `bobjob`              | Interactive menu                                             |
| `bobjob resume [url]` | Generate a tailored resume (optionally pass job URL)         |
| `bobjob refine`       | Refine your professional summary with additional text or PDF |

## Storage

User data lives in `~/.bobjob`:

| Path                        | Purpose                                             |
| --------------------------- | --------------------------------------------------- |
| `professional-summary.json` | Your profile (name, contact, experience, education) |
| `config.json`               | User preferences (e.g. resume save directory)       |
| `resumes/`                  | Generated PDFs (`<company>-<job-slug>-<id>.pdf`)    |

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
