/**
 * Sanitizes raw job description text for LLM consumption.
 * Collapses excessive whitespace, trims lines, and normalizes newlines.
 */
export function sanitizeJobText(raw: string): string {
  if (typeof raw !== 'string') {
    return '';
  }
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return normalized
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
