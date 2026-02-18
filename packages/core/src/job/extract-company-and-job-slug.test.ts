import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { ExtractCompanyAndJobSlugResult } from './extract-company-and-job-slug';

const originalKey = process.env.OPENAI_API_KEY;

let mockOutput: ExtractCompanyAndJobSlugResult | null = {
  company: 'Acme Corp',
  jobSlug: 'Senior Software Engineer',
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
    company: 'Acme Corp',
    jobSlug: 'Senior Software Engineer',
  };
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('extractCompanyAndJobSlug', () => {
  it('returns company and jobSlug from job description', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { extractCompanyAndJobSlug } =
      await import('./extract-company-and-job-slug');
    const result = await extractCompanyAndJobSlug(
      'Senior Software Engineer at Acme Corp. 5+ years Node.js.'
    );

    expect(result).toEqual({
      company: 'Acme Corp',
      jobSlug: 'Senior Software Engineer',
    });
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it('returns extracted values when LLM infers from context', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      company: 'TechCo',
      jobSlug: 'Backend Engineer',
    };

    const { extractCompanyAndJobSlug } =
      await import('./extract-company-and-job-slug');
    const result = await extractCompanyAndJobSlug(
      'Backend Engineer. TechCo is hiring. Requirements: Go, Kubernetes.'
    );

    expect(result.company).toBe('TechCo');
    expect(result.jobSlug).toBe('Backend Engineer');
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { extractCompanyAndJobSlug } =
      await import('./extract-company-and-job-slug');
    await expect(
      extractCompanyAndJobSlug('Job description here')
    ).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when job description is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { extractCompanyAndJobSlug } =
      await import('./extract-company-and-job-slug');
    await expect(extractCompanyAndJobSlug('')).rejects.toThrow(
      'Job description cannot be empty'
    );
    await expect(extractCompanyAndJobSlug('   ')).rejects.toThrow(
      'Job description cannot be empty'
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws friendly error when LLM returns invalid schema', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = null;

    const { extractCompanyAndJobSlug } =
      await import('./extract-company-and-job-slug');
    await expect(extractCompanyAndJobSlug('Job description')).rejects.toThrow(
      'could not be validated'
    );
  });
});
