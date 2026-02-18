import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ProfessionalSummary } from '../types/professional-summary';

const originalKey = process.env.OPENAI_API_KEY;

const validSummary: ProfessionalSummary = {
  name: 'Jane Doe',
  contact: { email: 'jane@example.com' },
  experiences: [
    {
      title: 'Software Engineer',
      company: 'Acme',
      startDate: '2020-01',
      endDate: '2024-06',
    },
  ],
};

const mergedSummary: ProfessionalSummary = {
  name: 'Jane Doe',
  contact: { email: 'jane@example.com' },
  experiences: [
    {
      title: 'Software Engineer',
      company: 'Acme',
      startDate: '2020-01',
      endDate: '2024-06',
      highlights: ['3 years AWS experience', 'Led distributed team of 5'],
    },
  ],
};

let mockOutput: ProfessionalSummary = mergedSummary;

const mockGenerateText = mock(async () => ({ output: mockOutput }));

mock.module('ai', () => ({
  generateText: mockGenerateText,
  Output: {
    object: (opts: { schema: unknown }) => opts,
  },
}));

beforeEach(() => {
  mockGenerateText.mockClear();
  mockOutput = mergedSummary;
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('incorporateClarificationsIntoSummary', () => {
  it('returns summary unchanged when clarifications is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { incorporateClarificationsIntoSummary } =
      await import('./incorporate-clarifications');
    const result = await incorporateClarificationsIntoSummary(validSummary, []);

    expect(result).toEqual(validSummary);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('returns merged summary when clarifications provided', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { incorporateClarificationsIntoSummary } =
      await import('./incorporate-clarifications');
    const result = await incorporateClarificationsIntoSummary(validSummary, [
      { question: 'How many years AWS?', answer: '3 years' },
      { question: 'Led teams?', answer: 'Yes, 5 people' },
    ]);

    expect(result).toEqual(mergedSummary);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { incorporateClarificationsIntoSummary } =
      await import('./incorporate-clarifications');
    await expect(
      incorporateClarificationsIntoSummary(validSummary, [
        { question: 'Q?', answer: 'A' },
      ])
    ).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws friendly error when LLM returns invalid schema', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    // contact.email must be string; number fails validation
    mockOutput = {
      name: 'Jane',
      contact: { email: 123 },
    } as unknown as ProfessionalSummary;

    const { incorporateClarificationsIntoSummary } =
      await import('./incorporate-clarifications');
    await expect(
      incorporateClarificationsIntoSummary(validSummary, [
        { question: 'Q?', answer: 'A' },
      ])
    ).rejects.toThrow('could not be validated');
  });
});
