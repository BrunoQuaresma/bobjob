import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import {
  ProfessionalSummarySchema,
  type ProfessionalSummary,
} from '../types/professional-summary';
import { validateApiKey } from '../env/validate-api-key';

const SYSTEM_PROMPT = `You are an expert at merging professional information. Given an existing professional summary and clarification Q&A pairs from the candidate, return an updated professional summary that incorporates the new information.

Rules:
- Preserve all existing data; do not remove or alter information unless the clarification directly updates it.
- Add or enrich experiences, education, highlights, or descriptions based on the answers.
- Use ISO date format for dates (e.g. 2020-01, 2024-06).
- Return valid JSON matching the ProfessionalSummary schema.

Return only the updated JSON, no other text.`;

export type Clarification = { question: string; answer: string };

/**
 * Merges clarification Q&A pairs into an existing professional summary using an LLM.
 *
 * @param summary - The current professional summary
 * @param clarifications - Array of question/answer pairs to incorporate
 * @returns Updated ProfessionalSummary with merged information
 * @throws Error if OPENAI_API_KEY is missing, or if LLM/parsing fails
 */
export async function incorporateClarificationsIntoSummary(
  summary: ProfessionalSummary,
  clarifications: Clarification[]
): Promise<ProfessionalSummary> {
  if (clarifications.length === 0) {
    return summary;
  }

  if (!validateApiKey()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please set it in your environment to use this feature.'
    );
  }

  const qaBlock = clarifications
    .map((c) => `Q: ${c.question}\nA: ${c.answer}`)
    .join('\n\n');

  const prompt = `Current professional summary:\n\n${JSON.stringify(summary, null, 2)}\n\nClarifications to incorporate:\n\n${qaBlock}`;

  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      system: SYSTEM_PROMPT,
      prompt,
      output: Output.object({
        schema: ProfessionalSummarySchema,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
      );
    }

    const result = ProfessionalSummarySchema.safeParse(output);
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
        "We couldn't incorporate your answers. " +
          err.message +
          ' Please try again.'
      );
    }
    throw new Error("We couldn't incorporate your answers. Please try again.");
  }
}
