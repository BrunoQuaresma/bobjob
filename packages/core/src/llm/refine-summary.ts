import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ProfessionalSummary } from '../types/professional-summary';
import {
  ProfessionalSummarySchemaForLLM,
  transformLLMOutputToSummary,
} from '../types/professional-summary-llm-schema';
import { validateApiKey } from '../env/validate-api-key';

const SYSTEM_PROMPT = `You are an expert at merging professional information. Given an existing professional summary and additional text from the candidate (e.g. resume excerpt, cover letter, or notes), return an updated professional summary that incorporates the new information.

Rules:
- Preserve all existing data; do not remove or alter information unless the new text directly updates it.
- Add or enrich experiences, education, highlights, skills, or descriptions based on the new text.
- Keep experience descriptions and highlights short and direct; prefer bullets over long prose. Keep the summary paragraph to 1–2 short sentences.
- Use ISO date format for dates (e.g. 2020-01, 2024-06).
- For fields you cannot find, use empty string "" or empty array [].
- Return valid JSON matching the schema.

Return only the updated JSON, no other text.`;

/**
 * Merges additional text into an existing professional summary using an LLM.
 *
 * @param summary - The current professional summary
 * @param newText - Raw text with additional professional information to incorporate
 * @returns Updated ProfessionalSummary with merged information
 * @throws Error if OPENAI_API_KEY is missing, or if LLM/parsing fails
 */
export async function refineSummaryWithText(
  summary: ProfessionalSummary,
  newText: string
): Promise<ProfessionalSummary> {
  if (typeof newText !== 'string' || newText.trim().length === 0) {
    throw new Error('Additional text cannot be empty.');
  }

  if (!validateApiKey()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please set it in your environment to use this feature.'
    );
  }

  const prompt = `Current professional summary:\n\n${JSON.stringify(summary, null, 2)}\n\nAdditional information to incorporate:\n\n${newText.trim()}`;

  try {
    const { output } = await generateText({
      model: openai('gpt-5-mini'),
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({
        schema: ProfessionalSummarySchemaForLLM,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
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
        "We couldn't refine your summary. " + err.message + ' Please try again.'
      );
    }
    throw new Error("We couldn't refine your summary. Please try again.");
  }
}
