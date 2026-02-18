import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { validateApiKey } from '../env/validate-api-key';

const ExtractResultSchema = z.object({
  company: z.string(),
  jobSlug: z.string(),
});
export type ExtractCompanyAndJobSlugResult = z.infer<
  typeof ExtractResultSchema
>;

const SYSTEM_PROMPT = `You are an expert at extracting job metadata from job descriptions.
Given a job description, extract:
1. company: The company or organization name (e.g. "Acme Corp", "Google")
2. jobSlug: The job title or role (e.g. "Senior Software Engineer", "Product Manager")

Return both as plain strings. If the job description does not clearly state the company or role, use your best inference from context. Never return empty strings.`;

/**
 * Extracts company name and job role from a job description using an LLM.
 *
 * @param jobDescription - The job description text
 * @returns Object with company and jobSlug
 * @throws Error if OPENAI_API_KEY is missing, job description is empty, or LLM fails
 */
export async function extractCompanyAndJobSlug(
  jobDescription: string
): Promise<ExtractCompanyAndJobSlugResult> {
  if (!validateApiKey()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please set it in your environment to use this feature.'
    );
  }

  if (
    typeof jobDescription !== 'string' ||
    jobDescription.trim().length === 0
  ) {
    throw new Error('Job description cannot be empty.');
  }

  try {
    const { output } = await generateText({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: `Extract company and job role from this job description:\n\n${jobDescription.trim()}`,
      output: Output.object({
        schema: ExtractResultSchema,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
      );
    }

    const result = ExtractResultSchema.safeParse(output);
    if (!result.success) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
      );
    }

    return result.data;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('OPENAI_API_KEY')) {
        throw err;
      }
      if (err.message.includes('could not be validated')) {
        throw err;
      }
      throw new Error(
        "We couldn't extract job metadata. " +
          err.message +
          ' Please try again.',
        { cause: err }
      );
    }
    throw new Error("We couldn't extract job metadata. Please try again.", {
      cause: err,
    });
  }
}
