import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ProfessionalSummary } from '../types/professional-summary';
import {
  ProfessionalSummarySchemaForLLM,
  transformLLMOutputToSummary,
} from '../types/professional-summary-llm-schema';
import { validateApiKey } from '../env/validate-api-key';

const SYSTEM_PROMPT = `You are an expert at extracting structured professional information from resume text.
Extract all available information into the provided JSON schema.
- Use ISO date format for dates (e.g. 2020-01, 2024-06). Use "present" or the current month if the role is ongoing.
- For fields you cannot find, use empty string "" or empty array [].
- For experiences and education, extract title, company/school, dates, and any highlights or descriptions.
- Keep the structure clean and well-organized.`;

/**
 * Generates a structured ProfessionalSummary from raw resume text using an LLM.
 *
 * @param rawText - Raw resume or professional info text (from PDF or user input)
 * @returns Parsed and validated ProfessionalSummary
 * @throws Error if OPENAI_API_KEY is missing, or if LLM/parsing fails
 */
export async function generateSummaryFromText(
  rawText: string
): Promise<ProfessionalSummary> {
  if (!validateApiKey()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please set it in your environment to use this feature.'
    );
  }

  if (typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Raw text cannot be empty.');
  }

  try {
    const { output } = await generateText({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt: `Extract professional summary from this resume text:\n\n${rawText}`,
      output: Output.object({
        schema: ProfessionalSummarySchemaForLLM,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again with clearer resume text.'
      );
    }

    return transformLLMOutputToSummary(output);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('OPENAI_API_KEY')) {
        throw err;
      }
      if (err.message.includes('could not be validated')) {
        throw err;
      }
      throw new Error(
        "We couldn't process your resume. " +
          err.message +
          ' Please try again or paste your info in a simpler format.'
      );
    }
    throw new Error(
      "We couldn't process your resume. Please try again or paste your info in a simpler format."
    );
  }
}
