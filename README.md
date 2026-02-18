# bobjob

To install dependencies:

```bash
bun install
```

For job URL fetching (when using `bobjob resume <url>`), install Playwright Chromium:

```bash
bunx playwright install chromium
```

To run:

```bash
bun run bobjob resume
# or with a job URL:
bun run resume https://example.com/job-posting
```

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
