import { generateText, Output } from 'ai';
import { openai } from '@ai-sdk/openai';
import type { ProfessionalSummary } from '../types/professional-summary';
import {
  ProfessionalSummarySchemaForLLM,
  transformLLMOutputToSummary,
} from '../types/professional-summary-llm-schema';
import { validateApiKey } from '../env/validate-api-key';
import { hasMinimumFields } from '../validation/has-minimum-fields';

const SYSTEM_PROMPT = `You are an expert at tailoring resumes for specific jobs. Given a candidate's full professional summary and a job description, produce a job-tailored resume optimized for that role.

Rules:
- Take the candidate's full professional summary and the job description.
- Produce a job-tailored resume: emphasize experiences, education, and skills most relevant to the role.
- Title: Use a single, concise professional title. Pick the most relevant one for the job (e.g. "Senior Software Engineer" or "Frontend Engineer"). Do not use multiple titles or slashes.
- Summary (Profile section): Keep to 1–2 short sentences max. Be direct and punchy; avoid filler.
- Skills: List at most 8 skills, the most relevant for the job. Each skill must be simple and standalone—no parentheses or qualifiers. E.g. use "React", "TypeScript", "Performance" as separate items, not "React (hooks, performance optimization)".
- Experience and project content: Keep descriptions to 1–2 short sentences max; omit if highlights suffice. Prefer bullet highlights over paragraphs. Each highlight: one clear achievement or responsibility, no filler. Limit to 3–5 highlights per experience or project, keeping only the most relevant for the job.
- Keep reverse chronological order for experiences and education (do not reorder by relevance).
- Summarize or trim content to fit a 1-page resume; omit less relevant experiences/education entries entirely if needed to fit.
- Preserve required fields: name, contact.email, at least one experience or education.
- Use ISO date format for dates (e.g. 2020-01, 2024-06).
- Reword highlights to align with job keywords where natural.
- For fields you cannot find, use empty string "" or empty array [].
- Write naturally, as a human would. Avoid em dashes (—) and hyphens in prose; use commas, periods, or rephrase instead. Text should feel human while remaining ATS-friendly.
- Return valid JSON matching the schema.`;

/**
 * Generates a job-tailored resume from a professional summary and job description using an LLM.
 *
 * @param professionalSummary - The candidate's full professional summary
 * @param jobDescription - The job description text
 * @returns Job-tailored ProfessionalSummary optimized for the role
 * @throws Error if OPENAI_API_KEY is missing, inputs are empty, or LLM/parsing fails
 */
export async function generateJobTailoredResume(
  professionalSummary: ProfessionalSummary,
  jobDescription: string
): Promise<ProfessionalSummary> {
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
        schema: ProfessionalSummarySchemaForLLM,
      }),
    });

    if (output == null) {
      throw new Error(
        'The AI returned data that could not be validated. Please try again.'
      );
    }

    const resume = transformLLMOutputToSummary(output);
    if (!hasMinimumFields(resume)) {
      throw new Error(
        'The AI returned a resume that is missing required fields (name, email, or experience/education). Please try again.'
      );
    }

    return resume;
  } catch (err) {
    if (err instanceof Error) {
      if (err.message.includes('OPENAI_API_KEY')) {
        throw err;
      }
      if (err.message.includes('could not be validated')) {
        throw err;
      }
      throw new Error(
        "We couldn't generate your tailored resume. " +
          err.message +
          ' Please try again.',
        { cause: err }
      );
    }
    throw new Error(
      "We couldn't generate your tailored resume. Please try again.",
      { cause: err }
    );
  }
}
