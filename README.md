# bobjob

AI job-search assistant. CLI resume generator from professional summary + job description.

## Prerequisites

- [Bun](https://bun.sh) runtime

## Setup

```bash
bun install
```

Chromium is bundled via `@playwright/browser-chromium`—no extra install step needed for job URL fetching.

## Environment

Set your OpenAI API key before running:

```bash
export OPENAI_API_KEY=your-key-here
```

The CLI will warn you if the key is missing.

## Usage

Show help:

```bash
bun run bobjob
# or
bun run bobjob --help
```

Generate a tailored resume:

```bash
bun run bobjob resume
# or with a job URL:
bun run bobjob resume https://example.com/job-posting
```

You can also run via `bunx` or install globally:

```bash
bunx bobjob resume
# or
bun install -g . && bobjob resume
```

## Storage

User data lives in `~/.bobjob`:

- `professional-summary.json` — your profile (name, contact, experience, education)
- `resumes/` — generated PDFs (`<company>-<job-slug>-<id>.pdf`)
