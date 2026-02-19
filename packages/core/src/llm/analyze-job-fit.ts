import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { ProfessionalSummary } from '../types/professional-summary';
import { validateApiKey } from '../env/validate-api-key';

const JobFitAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  rationale: z.string().min(1),
  clarificationQuestions: z.array(z.string()).max(5),
});
export type JobFitAnalysis = z.infer<typeof JobFitAnalysisSchema>;

const SYSTEM_PROMPT = `You are an expert at evaluating job fit. Compare the candidate's professional summary against the job description and provide:
1. A match score from 0 to 100 based on skills, experience, and education fit.
2. A brief rationale: one short sentence (max 25 words) explaining the score. Be concise.
3. Zero to five specific, actionable clarification questions the candidate could answer to improve their match. Ask about gaps, relevant experience, or skills that could strengthen their application.
- Return an empty clarificationQuestions array when the match is strong (score >= 85).
- Questions should be concrete and answerable (e.g. "How many years have you led distributed teams?" not "Tell me more about leadership.").`;

/**
 * Analyzes how well a professional summary fits a job description.
 *
 * @param professionalSummary - The candidate's professional summary
 * @param jobDescription - The job description text
 * @returns JobFitAnalysis with match score, rationale, and clarification questions
 * @throws Error if OPENAI_API_KEY is missing, inputs are empty, or LLM/parsing fails
 */
export async function analyzeJobFit(
  professionalSummary: ProfessionalSummary,
  jobDescription: string
): Promise<JobFitAnalysis> {
  if (!validateApiKey()) {
    throw new Error(
      'OPENAI_API_KEY is not set. Please set it in your environment to use this feature.'
    );
  }

  if (
    !professionalSummary ||
    typeof professionalSummary !== 'object' ||
    Array.isArray(professionalSummary) ||
    Object.keys(professionalSummary).length === 0
  ) {
    throw new Error('Professional summary is required.');
  }

  if (
    typeof jobDescription !== 'string' ||
    jobDescription.trim().length === 0
  ) {
    throw new Error('Job description cannot be empty.');
  }

  const summaryJson = JSON.stringify(professionalSummary, null, 2);

  try {
    const { output } = await generateText({
      model: openai('gpt-5.2'),
      system: SYSTEM_PROMPT,
      prompt: `Professional summary:\n\n${summaryJson}\n\nJob description:\n\n${jobDescription.trim()}`,
      output: Output.object({
        schema: JobFitAnalysisSchema,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
      );
    }

    const result = JobFitAnalysisSchema.safeParse(output);
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
        "We couldn't analyze the job fit. " + err.message + ' Please try again.'
      );
    }
    throw new Error("We couldn't analyze the job fit. Please try again.");
  }
}
