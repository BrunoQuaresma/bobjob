import { describe, expect, it } from 'bun:test';
import {
  ProfessionalSummarySchema,
  ContactSchema,
  ExperienceSchema,
} from './professional-summary';

describe('ProfessionalSummarySchema', () => {
  it('accepts valid partial data', () => {
    const result = ProfessionalSummarySchema.safeParse({
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid data with experiences', () => {
    const result = ProfessionalSummarySchema.safeParse({
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
      experiences: [
        {
          title: 'Engineer',
          company: 'Acme',
          startDate: '2020-01',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid structure when contact exists but email is missing', () => {
    const result = ProfessionalSummarySchema.safeParse({
      name: 'Jane Doe',
      contact: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects wrong types for nested fields', () => {
    const result = ProfessionalSummarySchema.safeParse({
      name: 123,
      contact: { email: 'jane@example.com' },
    });
    expect(result.success).toBe(false);
  });

  it('strips unknown keys', () => {
    const result = ProfessionalSummarySchema.safeParse({
      name: 'Jane',
      contact: { email: 'j@e.com' },
      experiences: [],
      _unknownField: 'ignored',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect('_unknownField' in result.data).toBe(false);
    }
  });
});

describe('ContactSchema', () => {
  it('requires email when contact is present', () => {
    const result = ContactSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts valid contact', () => {
    const result = ContactSchema.safeParse({
      email: 'test@example.com',
      phone: '123',
    });
    expect(result.success).toBe(true);
  });
});

describe('ExperienceSchema', () => {
  it('requires title, company, startDate', () => {
    const result = ExperienceSchema.safeParse({
      title: 'Engineer',
      company: 'Acme',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid experience', () => {
    const result = ExperienceSchema.safeParse({
      title: 'Engineer',
      company: 'Acme',
      startDate: '2020-01',
    });
    expect(result.success).toBe(true);
  });
});
