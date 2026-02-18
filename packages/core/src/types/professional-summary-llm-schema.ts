import { z } from 'zod';
import type { ProfessionalSummary } from './professional-summary';
import { ProfessionalSummarySchema } from './professional-summary';

/**
 * OpenAI structured output requires that every object's `required` array
 * includes every key in `properties`. Optional fields must be required
 * in the schema; use empty string "" or empty array [] when not found.
 */
const ContactSchemaForLLM = z.object({
  email: z.string(),
  phone: z.string(),
});

const SocialsSchemaForLLM = z.object({
  linkedin: z.string(),
  github: z.string(),
  portfolio: z.string(),
});

const ExperienceSchemaForLLM = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  highlights: z.array(z.string()),
});

const EducationSchemaForLLM = z.object({
  degree: z.string(),
  school: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  field: z.string(),
});

const CertificateSchemaForLLM = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string(),
  url: z.string(),
});

const ProjectSchemaForLLM = z.object({
  name: z.string(),
  description: z.string(),
  url: z.string(),
  technologies: z.array(z.string()),
  highlights: z.array(z.string()),
});

export const ProfessionalSummarySchemaForLLM = z.object({
  name: z.string(),
  contact: ContactSchemaForLLM,
  socials: SocialsSchemaForLLM,
  location: z.string(),
  experiences: z.array(ExperienceSchemaForLLM),
  education: z.array(EducationSchemaForLLM),
  certificates: z.array(CertificateSchemaForLLM),
  projects: z.array(ProjectSchemaForLLM),
});

/**
 * Transforms LLM output (with required empty strings/arrays) into
 * ProfessionalSummary (with optional fields omitted when empty).
 * Handles partial output defensively when LLM omits nested objects.
 */
export function transformLLMOutputToSummary(
  raw: z.infer<typeof ProfessionalSummarySchemaForLLM>
): ProfessionalSummary {
  const contactObj = raw.contact ?? {};
  const socialsObj = raw.socials ?? {};
  // Pass through raw values; schema validation will reject invalid types (e.g. email: 123)
  const contact =
    contactObj.email != null || contactObj.phone != null
      ? {
          email: contactObj.email ?? '',
          ...(contactObj.phone != null &&
            contactObj.phone !== '' && {
              phone: contactObj.phone,
            }),
        }
      : undefined;

  const socials =
    socialsObj.linkedin || socialsObj.github || socialsObj.portfolio
      ? {
          ...(socialsObj.linkedin && { linkedin: socialsObj.linkedin }),
          ...(socialsObj.github && { github: socialsObj.github }),
          ...(socialsObj.portfolio && { portfolio: socialsObj.portfolio }),
        }
      : undefined;

  const experiences = (raw.experiences ?? [])
    .filter((e) => e.title && e.company && e.startDate)
    .map((e) => ({
      title: e.title,
      company: e.company,
      ...(e.location && { location: e.location }),
      startDate: e.startDate,
      ...(e.endDate && { endDate: e.endDate }),
      ...(e.description && { description: e.description }),
      ...(e.highlights?.length && { highlights: e.highlights }),
    }));

  const education = (raw.education ?? [])
    .filter((e) => e.degree && e.school && e.startDate && e.endDate)
    .map((e) => ({
      degree: e.degree,
      school: e.school,
      ...(e.location && { location: e.location }),
      startDate: e.startDate,
      endDate: e.endDate,
      ...(e.field && { field: e.field }),
    }));

  const certificates = (raw.certificates ?? [])
    .filter((c) => c.name && c.issuer)
    .map((c) => ({
      name: c.name,
      issuer: c.issuer,
      ...(c.date && { date: c.date }),
      ...(c.url && { url: c.url }),
    }));

  const projects = (raw.projects ?? [])
    .filter((p) => p.name)
    .map((p) => ({
      name: p.name,
      ...(p.description && { description: p.description }),
      ...(p.url && { url: p.url }),
      ...(p.technologies?.length && { technologies: p.technologies }),
      ...(p.highlights?.length && { highlights: p.highlights }),
    }));

  const summary: ProfessionalSummary = {
    ...(raw.name && { name: String(raw.name) }),
    ...(contact && { contact }),
    ...(socials && Object.keys(socials).length > 0 && { socials }),
    ...(raw.location && { location: String(raw.location) }),
    ...(experiences.length > 0 && { experiences }),
    ...(education.length > 0 && { education }),
    ...(certificates.length > 0 && { certificates }),
    ...(projects.length > 0 && { projects }),
  };

  const result = ProfessionalSummarySchema.safeParse(summary);
  if (!result.success) {
    throw new Error(
      'The AI returned data that could not be validated. Please try again with clearer resume text.'
    );
  }
  return result.data;
}
