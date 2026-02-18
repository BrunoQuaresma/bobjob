import type { ProfessionalSummary } from '../types/professional-summary';

/**
 * Checks if a professional summary has the minimum required fields for the resume flow.
 * Required: name (non-empty), contact.email (non-empty), and at least one of experiences or education.
 */
export function hasMinimumFields(summary: ProfessionalSummary): boolean {
  const hasName =
    typeof summary.name === 'string' && summary.name.trim().length > 0;

  const hasEmail =
    summary.contact != null &&
    typeof summary.contact.email === 'string' &&
    summary.contact.email.trim().length > 0;

  const hasExperiences =
    Array.isArray(summary.experiences) && summary.experiences.length > 0;

  const hasEducation =
    Array.isArray(summary.education) && summary.education.length > 0;

  return hasName && hasEmail && (hasExperiences || hasEducation);
}
