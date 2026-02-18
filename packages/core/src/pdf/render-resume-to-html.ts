import Handlebars from 'handlebars';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProfessionalSummary } from '../types/professional-summary';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Converts ISO date (e.g. 2020-01 or 2020-01-15) to human-readable (e.g. Jan 2020).
 */
function formatIsoDateToHuman(iso: string): string {
  if (typeof iso !== 'string' || !iso.trim()) return iso;
  const trimmed = iso.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!match) return trimmed;
  const year = match[1];
  const monthStr = match[2];
  const dayStr = match[3];
  if (!year || !monthStr) return trimmed;
  const month = parseInt(monthStr, 10);
  if (month < 1 || month > 12) return trimmed;
  const monthName = MONTHS[month - 1];
  if (dayStr) {
    const day = parseInt(dayStr, 10);
    return `${day} ${monthName} ${year}`;
  }
  return `${monthName} ${year}`;
}

function registerHandlebarsHelpers(): void {
  Handlebars.registerHelper('formatDate', (iso: unknown) => {
    if (iso == null) return '';
    return formatIsoDateToHuman(String(iso));
  });
  Handlebars.registerHelper('hasItems', (arr: unknown) => {
    return Array.isArray(arr) && arr.length > 0;
  });
}

registerHandlebarsHelpers();

const TEMPLATE_FILENAME = 'resume-template.hbs';

export type RenderResumeToHtmlOptions = {
  /** For testing: use this instead of loading template from disk */
  templateContent?: string;
};

/**
 * Renders a ProfessionalSummary (resume) to HTML using the Handlebars template.
 *
 * @param resume - The resume object to render
 * @param options - Optional templateContent for testing
 * @returns HTML string
 */
export async function renderResumeToHtml(
  resume: ProfessionalSummary,
  options?: RenderResumeToHtmlOptions
): Promise<string> {
  let templateContent: string;
  if (options?.templateContent != null) {
    templateContent = options.templateContent;
  } else {
    const templatePath = join(import.meta.dir, TEMPLATE_FILENAME);
    templateContent = await readFile(templatePath, 'utf-8');
  }

  const template = Handlebars.compile(templateContent);
  return template(resume);
}
