import { describe, expect, it } from 'bun:test';
import { mergeExperiencesByCompany } from './merge-experiences-by-company';

describe('mergeExperiencesByCompany', () => {
  it('returns single experience unchanged', () => {
    const input = [
      {
        title: 'Software Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2024-06',
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual(input);
  });

  it('merges two experiences at same company with different titles', () => {
    const input = [
      {
        title: 'Software Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2022-06',
        highlights: ['Built API'],
      },
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2022-06',
        endDate: '2024-06',
        highlights: ['Led team'],
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual([
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2024-06',
        highlights: ['Built API', 'Led team'],
      },
    ]);
  });

  it('keeps two experiences at different companies', () => {
    const input = [
      {
        title: 'Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2022-06',
      },
      {
        title: 'Developer',
        company: 'Beta',
        startDate: '2022-06',
        endDate: '2024-06',
      },
    ];
    const result = mergeExperiencesByCompany(input);
    expect(result).toHaveLength(2);
    expect(result[0]?.company).toBe('Beta');
    expect(result[1]?.company).toBe('Acme');
  });

  it('merges same company with one ongoing (no endDate)', () => {
    const input = [
      {
        title: 'Junior Dev',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2022-01',
      },
      {
        title: 'Senior Dev',
        company: 'Acme',
        startDate: '2022-01',
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual([
      {
        title: 'Senior Dev',
        company: 'Acme',
        startDate: '2020-01',
        highlights: undefined,
      },
    ]);
  });

  it('merges by normalized company name (case-insensitive)', () => {
    const input = [
      {
        title: 'Engineer',
        company: 'Acme Corp',
        startDate: '2020-01',
        endDate: '2022-06',
      },
      {
        title: 'Senior Engineer',
        company: 'acme corp',
        startDate: '2022-06',
        endDate: '2024-06',
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual([
      {
        title: 'Senior Engineer',
        company: 'Acme Corp',
        startDate: '2020-01',
        endDate: '2024-06',
      },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(mergeExperiencesByCompany([])).toEqual([]);
  });

  it('concatenates descriptions when merging', () => {
    const input = [
      {
        title: 'Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2022-06',
        description: 'First role.',
      },
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2022-06',
        endDate: '2024-06',
        description: 'Second role.',
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual([
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2024-06',
        description: 'First role.\n\nSecond role.',
      },
    ]);
  });

  it('deduplicates highlights when merging', () => {
    const input = [
      {
        title: 'Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2022-06',
        highlights: ['Built API', 'Led team'],
      },
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2022-06',
        endDate: '2024-06',
        highlights: ['Led team', 'Scaled system'],
      },
    ];
    expect(mergeExperiencesByCompany(input)).toEqual([
      {
        title: 'Senior Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2024-06',
        highlights: ['Built API', 'Led team', 'Scaled system'],
      },
    ]);
  });
});
