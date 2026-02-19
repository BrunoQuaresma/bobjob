import Handlebars from 'handlebars';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProfessionalSummary } from '../types/professional-summary';

const require = createRequire(import.meta.url);
const GEIST_FONT_PLACEHOLDER = '__GEIST_FONT_FACES__';

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
  Handlebars.registerHelper('hasContactInfo', (ctx: unknown) => {
    const c = ctx as {
      contact?: { email?: string; phone?: string };
      location?: string;
      socials?: { linkedin?: string; github?: string; portfolio?: string };
    };
    const hasContact = c?.contact && (c.contact.email || c.contact.phone);
    const hasLocation =
      typeof c?.location === 'string' && c.location.trim().length > 0;
    const hasSocials =
      c?.socials &&
      (c.socials.linkedin || c.socials.github || c.socials.portfolio);
    return !!(hasContact || hasLocation || hasSocials);
  });
}

registerHandlebarsHelpers();

const TEMPLATE_FILENAME = 'resume-template.hbs';

async function getGeistFontFaces(): Promise<string> {
  try {
    const font400Path =
      require.resolve('@fontsource/geist/files/geist-latin-400-normal.woff2');
    const font600Path =
      require.resolve('@fontsource/geist/files/geist-latin-600-normal.woff2');
    const [font400, font600] = await Promise.all([
      readFile(font400Path).then((b) => b.toString('base64')),
      readFile(font600Path).then((b) => b.toString('base64')),
    ]);
    return `@font-face{font-family:'Geist';font-style:normal;font-weight:400;font-display:swap;src:url(data:font/woff2;base64,${font400}) format('woff2')}@font-face{font-family:'Geist';font-style:normal;font-weight:600;font-display:swap;src:url(data:font/woff2;base64,${font600}) format('woff2')}`;
  } catch {
    return '';
  }
}

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
    if (templateContent.includes(GEIST_FONT_PLACEHOLDER)) {
      const fontFaces = await getGeistFontFaces();
      templateContent = templateContent.replace(
        GEIST_FONT_PLACEHOLDER,
        fontFaces
      );
    }
  }

  const template = Handlebars.compile(templateContent);
  return template(resume);
}
