import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { JobFitAnalysis } from './analyze-job-fit';

const originalKey = process.env.OPENAI_API_KEY;

let mockOutput: JobFitAnalysis | null = {
  matchScore: 78,
  rationale: 'Strong backend experience but limited cloud exposure.',
  clarificationQuestions: [
    'How many years have you worked with AWS or GCP?',
    'Have you led distributed teams?',
  ],
};

const mockGenerateText = mock(async () => ({ output: mockOutput }));

mock.module('ai', () => ({
  generateText: mockGenerateText,
  Output: {
    object: (opts: { schema: unknown }) => opts,
  },
}));

beforeEach(() => {
  mockGenerateText.mockClear();
  mockOutput = {
    matchScore: 78,
    rationale: 'Strong backend experience but limited cloud exposure.',
    clarificationQuestions: [
      'How many years have you worked with AWS or GCP?',
      'Have you led distributed teams?',
    ],
  };
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('analyzeJobFit', () => {
  const validSummary = {
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

  it('returns valid JobFitAnalysis with score, rationale, and questions', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { analyzeJobFit } = await import('./analyze-job-fit');
    const result = await analyzeJobFit(
      validSummary,
      'Senior Backend Engineer at TechCo. Requires 5+ years Node.js, AWS.'
    );

    expect(result).toEqual({
      matchScore: 78,
      rationale: 'Strong backend experience but limited cloud exposure.',
      clarificationQuestions: [
        'How many years have you worked with AWS or GCP?',
        'Have you led distributed teams?',
      ],
    });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('returns empty clarificationQuestions when match is high', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      matchScore: 92,
      rationale: 'Excellent fit for the role.',
      clarificationQuestions: [],
    };

    const { analyzeJobFit } = await import('./analyze-job-fit');
    const result = await analyzeJobFit(
      validSummary,
      'Software Engineer at Acme. Node.js, 3+ years.'
    );

    expect(result.matchScore).toBe(92);
    expect(result.clarificationQuestions).toEqual([]);
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { analyzeJobFit } = await import('./analyze-job-fit');
    await expect(
      analyzeJobFit(validSummary, 'Job description here')
    ).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when professional summary is null', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { analyzeJobFit } = await import('./analyze-job-fit');
    await expect(
      analyzeJobFit(
        null as unknown as Parameters<typeof analyzeJobFit>[0],
        'Job desc'
      )
    ).rejects.toThrow('Professional summary is required');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when professional summary is empty object', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { analyzeJobFit } = await import('./analyze-job-fit');
    await expect(analyzeJobFit({}, 'Job desc')).rejects.toThrow(
      'Professional summary is required'
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when job description is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { analyzeJobFit } = await import('./analyze-job-fit');
    await expect(analyzeJobFit(validSummary, '')).rejects.toThrow(
      'Job description cannot be empty'
    );
    await expect(analyzeJobFit(validSummary, '   ')).rejects.toThrow(
      'Job description cannot be empty'
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws friendly error when LLM returns invalid schema', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      matchScore: 150,
      rationale: 'Good',
      clarificationQuestions: [],
    } as unknown as JobFitAnalysis;

    const { analyzeJobFit } = await import('./analyze-job-fit');
    await expect(
      analyzeJobFit(validSummary, 'Job description')
    ).rejects.toThrow('could not be validated');
  });
});
