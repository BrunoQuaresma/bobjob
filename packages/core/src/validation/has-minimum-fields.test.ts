import { describe, expect, it } from 'bun:test';
import type { ProfessionalSummary } from '../types/professional-summary';
import { hasMinimumFields } from './has-minimum-fields';

const validSummary: ProfessionalSummary = {
  name: 'Jane Doe',
  contact: { email: 'jane@example.com' },
  experiences: [
    {
      title: 'Engineer',
      company: 'Acme',
      startDate: '2020-01',
    },
  ],
};

describe('hasMinimumFields', () => {
  it('returns true for valid summary with experiences', () => {
    expect(hasMinimumFields(validSummary)).toBe(true);
  });

  it('returns true for valid summary with education only', () => {
    expect(
      hasMinimumFields({
        name: 'Jane Doe',
        contact: { email: 'jane@example.com' },
        education: [
          {
            degree: 'BS',
            school: 'University',
            startDate: '2015',
            endDate: '2019',
          },
        ],
      })
    ).toBe(true);
  });

  it('returns false when name is missing', () => {
    expect(
      hasMinimumFields({
        ...validSummary,
        name: undefined,
      })
    ).toBe(false);
  });

  it('returns false when name is empty string', () => {
    expect(
      hasMinimumFields({
        ...validSummary,
        name: '',
      })
    ).toBe(false);
  });

  it('returns false when name is whitespace only', () => {
    expect(
      hasMinimumFields({
        ...validSummary,
        name: '   ',
      })
    ).toBe(false);
  });

  it('returns false when contact email is missing', () => {
    expect(
      hasMinimumFields({
        ...validSummary,
        contact: {},
      } as ProfessionalSummary)
    ).toBe(false);
  });

  it('returns false when contact is undefined', () => {
    expect(
      hasMinimumFields({
        ...validSummary,
        contact: undefined,
      })
    ).toBe(false);
  });

  it('returns false when both experiences and education are empty', () => {
    expect(
      hasMinimumFields({
        name: 'Jane Doe',
        contact: { email: 'jane@example.com' },
        experiences: [],
        education: [],
      })
    ).toBe(false);
  });

  it('returns false when both experiences and education are undefined', () => {
    expect(
      hasMinimumFields({
        name: 'Jane Doe',
        contact: { email: 'jane@example.com' },
      })
    ).toBe(false);
  });
});
