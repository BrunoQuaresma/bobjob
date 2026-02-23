import type { Experience } from '../types/professional-summary';

function normalizeCompany(company: string): string {
  return company.trim().toLowerCase();
}

/**
 * Merges multiple experiences for the same company into a single experience.
 * - title: Latest role title (chronologically)
 * - startDate: Earliest among all roles
 * - endDate: Latest if all have endDate; undefined if any is ongoing
 * - location: First non-empty value
 * - description: Concatenated with "\n\n" if multiple
 * - highlights: Flattened, duplicates removed (order preserved)
 *
 * Output is sorted reverse-chronologically (most recent first).
 */
export function mergeExperiencesByCompany(
  experiences: Experience[]
): Experience[] {
  if (experiences.length === 0) return [];

  const byCompany = new Map<string, Experience[]>();
  for (const exp of experiences) {
    const key = normalizeCompany(exp.company);
    const list = byCompany.get(key) ?? [];
    list.push(exp);
    byCompany.set(key, list);
  }

  const merged: Experience[] = [];

  for (const exps of byCompany.values()) {
    const first = exps[0];
    if (!first || exps.length === 1) {
      if (first) merged.push(first);
      continue;
    }

    const sorted = [...exps].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );

    const earliest = sorted[0]!;
    const latest = sorted[sorted.length - 1]!;

    const title = latest.title ?? earliest.title;

    const startDate = earliest.startDate;
    const hasOngoing = sorted.some((e) => !e.endDate);
    const endDate = hasOngoing
      ? undefined
      : (latest.endDate ?? earliest.endDate);

    const location =
      sorted.find((e) => e.location?.trim())?.location ?? earliest.location;

    const descriptions = sorted.map((e) => e.description).filter(Boolean);
    const description =
      descriptions.length > 0 ? descriptions.join('\n\n') : undefined;

    const allHighlights = sorted.flatMap((e) => e.highlights ?? []);
    const seen = new Set<string>();
    const highlights = allHighlights.filter((h) => {
      const key = h.trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    merged.push({
      title,
      company: earliest.company,
      ...(location && { location }),
      startDate,
      ...(endDate && { endDate }),
      ...(description && { description }),
      ...(highlights.length > 0 && { highlights }),
    });
  }

  merged.sort((a, b) => {
    const aEnd = a.endDate ?? '9999-12';
    const bEnd = b.endDate ?? '9999-12';
    return bEnd.localeCompare(aEnd);
  });

  return merged;
}
