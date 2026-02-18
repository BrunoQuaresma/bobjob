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
    {
      title: 'Intern',
      company: 'Startup Co',
      startDate: '2019-06',
      endDate: '2019-12',
    },
  ],
};

const tailoredResume: ProfessionalSummary = {
  name: 'Jane Doe',
  contact: { email: 'jane@example.com' },
  experiences: [
    {
      title: 'Software Engineer',
      company: 'Acme',
      startDate: '2020-01',
      endDate: '2024-06',
      highlights: ['Built scalable APIs', 'Led team of 3'],
    },
  ],
};

const jobDescription =
  'We are looking for a Senior Software Engineer with 3+ years experience.';

let mockOutput: ProfessionalSummary = tailoredResume;

const mockGenerateText = mock(async () => ({ output: mockOutput }));

mock.module('ai', () => ({
  generateText: mockGenerateText,
  Output: {
    object: (opts: { schema: unknown }) => opts,
  },
}));

beforeEach(() => {
  mockGenerateText.mockClear();
  mockOutput = tailoredResume;
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('generateJobTailoredResume', () => {
  it('returns tailored resume when given valid summary and job description', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    const result = await generateJobTailoredResume(
      validSummary,
      jobDescription
    );

    expect(result).toEqual(tailoredResume);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const options = (
      mockGenerateText.mock.calls[0] as unknown as [
        { system: string; prompt: string },
      ]
    )?.[0];
    expect(options).toBeDefined();
    expect(options?.system).toContain('job-tailored resume');
    expect(options?.prompt).toContain('Professional summary:');
    expect(options?.prompt).toContain(JSON.stringify(validSummary, null, 2));
    expect(options?.prompt).toContain(jobDescription);
  });

  it('throws when API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(validSummary, jobDescription)
    ).rejects.toThrow('OPENAI_API_KEY is not set');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when professional summary is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume({} as ProfessionalSummary, jobDescription)
    ).rejects.toThrow('Professional summary is required');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when professional summary is null', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(
        null as unknown as ProfessionalSummary,
        jobDescription
      )
    ).rejects.toThrow('Professional summary is required');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when job description is empty', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(generateJobTailoredResume(validSummary, '')).rejects.toThrow(
      'Job description cannot be empty'
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when job description is whitespace only', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(validSummary, '   \n\t  ')
    ).rejects.toThrow('Job description cannot be empty');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when professional summary is array', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(
        [] as unknown as ProfessionalSummary,
        jobDescription
      )
    ).rejects.toThrow('Professional summary is required');
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it('throws when LLM returns resume missing required fields', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      name: 'Jane',
      contact: { email: 'jane@example.com' },
      // No experiences or education - fails hasMinimumFields
    } as ProfessionalSummary;

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(validSummary, jobDescription)
    ).rejects.toThrow('missing required fields');
  });

  it('throws friendly error when LLM returns invalid schema', async () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    mockOutput = {
      name: 'Jane',
      contact: { email: 123 },
    } as unknown as ProfessionalSummary;

    const { generateJobTailoredResume } =
      await import('./generate-job-tailored-resume');
    await expect(
      generateJobTailoredResume(validSummary, jobDescription)
    ).rejects.toThrow('could not be validated');
  });
});
