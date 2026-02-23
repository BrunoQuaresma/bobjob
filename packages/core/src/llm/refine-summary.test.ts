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

const refinedSummary: ProfessionalSummary = {
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

let mockOutput: ProfessionalSummary = refinedSummary;

const mockGenerateText = mock(async () => ({ output: mockOutput }));

mock.module('ai', () => ({
  generateText: mockGenerateText,
  Output: {
    object: (opts: { schema: unknown }) => opts,
  },
}));

beforeEach(() => {
  mockGenerateText.mockClear();
  mockOutput = refinedSummary;
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('refineSummaryWithText', () => {
  it('returns refined summary when new text provided', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { refineSummaryWithText } = await import('./refine-summary');
    const result = await refineSummaryWithText(
      validSummary,
      'I have 3 years AWS experience and led a distributed team of 5.'
    );

    expect(result).toEqual(refinedSummary);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('throws when newText is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { refineSummaryWithText } = await import('./refine-summary');
    await expect(refineSummaryWithText(validSummary, '')).rejects.toThrow(
      'Additional text cannot be empty'
    );
    await expect(refineSummaryWithText(validSummary, '   ')).rejects.toThrow(
      'Additional text cannot be empty'
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { refineSummaryWithText } = await import('./refine-summary');
    await expect(
      refineSummaryWithText(validSummary, 'Additional experience: AWS')
    ).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws friendly error when LLM returns invalid schema', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      name: 'Jane',
      contact: { email: 123 },
    } as unknown as ProfessionalSummary;

    const { refineSummaryWithText } = await import('./refine-summary');
    await expect(
      refineSummaryWithText(validSummary, 'New info: AWS certified')
    ).rejects.toThrow('could not be validated');
  });
});
