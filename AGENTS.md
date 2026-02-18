# Bob Job

> AI job-search assistant. CLI agent. Resume generator from professional summary + job description. Bun, functional style, `~/.bobjob` storage.

Bob Job helps users find their next job.

## Project State

Very initial — no code yet. Monorepo structure with `packages/core` and `packages/cli`.

**MVP**: Full flow for resume generation (scraping, REPL, PDF, all steps).

## Tech & Structure

- **Runtime**: Bun (package manager + runner)
- **Monorepo**: Bun workspaces. `packages/cli` depends on `packages/core`
- **Packages**: `packages/core` (business logic, reusable), `packages/cli` (CLI-only code)
- **Shared types**: Live in `packages/core` (e.g. `ProfessionalSummary`, `Resume`)
- **TypeScript**: Root tsconfig + shared config; package-specific when needed. Same conventions. Prefer strict mode if it improves code.
- **Commands**: Root exposes package commands, e.g. `bun <package>:<command>`
- **Style**: Functional — pure functions, no classes, composition over inheritance
- **Tests**: Write tests for new code; prefer testable pure functions
- **Logging**: Structured logs
- **Filenames**: kebab-case everywhere (code and generated files)
- **Short IDs**: `nanoid` package for resume filename uniqueness
- **Linting**: ESLint and Prettier for all codebase

## LLM / AI

- **Provider**: OpenAI
- **Models**: `gpt-5-mini` for less complex tasks, `gpt-5.2` for reasoning and complex tasks
- **SDK**: Vercel AI SDK v6
- **API key**: Expect `OPENAI_API_KEY` in environment. Validate on startup; warn user if not set.

## Data Formats

### Professional Summary (JSON)

Be defensive — user may omit fields or fill partially, step by step. Stored at `~/.bobjob/professional-summary.json`. **Dates**: ISO format (e.g. `2020-01`, `2024-06`).

**Minimum required fields** (conversation continues until met): `name`, `contact.email`, and at least one of `experiences` or `education`.

```ts
interface Contact {
  email: string;
  phone?: string;
}

interface Socials {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

interface Education {
  degree: string;
  school: string;
  location?: string;
  startDate: string;
  endDate: string;
  field?: string;
}

interface Certificate {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

interface Project {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
  highlights?: string[];
}

interface ProfessionalSummary {
  name?: string;
  contact?: Contact;
  socials?: Socials;
  location?: string;
  experiences?: Experience[];
  education?: Education[];
  certificates?: Certificate[];
  projects?: Project[];
}
```

### Resume Object

Same type as `ProfessionalSummary`, but opinionated toward the specific job. Used for PDF generation. Professional summary is general and complete; when creating the resume, optimize/summarize for the job to fit context limits.

### Resume File Input (for initial summary)

PDF only. Use `pdf-parse` to extract text, then send to LLM to generate structured professional summary. On parse failure: friendly error message to user.

### Job Description

Text or URL. If URL, fetch with Playwright (pre-installed Chrome). Extract text and sanitize to remove unnecessary content before sending to LLM (reduce context/tokens). On 404 or fetch failure: tell user nicely the page doesn't exist or we couldn't fetch it.

## Core Feature: Resume Generator

1. Read job description + professional summary
2. Analyze relevant experience for the job
3. Ask clarification questions (optional, to improve match)
4. Generate job-specific summary + match score (0–100, LLM-derived)
5. Output PDF resume for download

**Match score**: 0–100 scale, LLM judgment. Display format TBD.

**Flow completion**: Match score ≥ 85% OR max 5 clarification rounds (fallback to avoid loop). User can say "done" or similar to finish early.

## PDF Generation

- HTML + Handlebars template receiving resume object
- Playwright to render HTML → PDF
- Template in `packages/core`
- A4 size, clean and elegant design

## Storage & Config

- **User data**: `~/.bobjob` (never in repo). Create directories only when necessary.
- **Professional summary**: `~/.bobjob/professional-summary.json`
- **Resumes**: `~/.bobjob/resumes/<company>-<job-slug>-<nanoid>.pdf` (company and job-slug from LLM extraction, kebab-case; nanoid for uniqueness)
- **Config**: `~/.bobjob/config` for user preferences only (if needed later)
- **API keys**: User's responsibility; set in environment before running

## Error Handling

- **User-facing**: Friendly, actionable messages when possible
- **Internal**: Informative for developers to debug

## Copy

Fun, friendly, conversational. Natural language; avoid jargon unless the user does. English only for now.

## UI

CLI with REPL-style chat. Binary: `bobjob` (use via `bunx`, `npx`, or install globally). No args → display help/usage.

**Resume flow** (`bobjob resume` or `bobjob resume <url>`): If no URL, agent asks for job description as text or URL in chat. Collect professional summary before starting — ask for resume file path (PDF) or text to generate initial summary. Fill gaps until minimum fields met. Then: clarification questions until match ≥ 85% or 5 rounds (user can say "done" to finish early).
