import { z } from 'zod';

export const ContactSchema = z.object({
  email: z.string(),
  phone: z.string().optional(),
});

export const SocialsSchema = z.object({
  linkedin: z.string().optional(),
  github: z.string().optional(),
  portfolio: z.string().optional(),
});

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const EducationSchema = z.object({
  degree: z.string(),
  school: z.string(),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  field: z.string().optional(),
});

export const CertificateSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  date: z.string().optional(),
  url: z.string().optional(),
});

export const ProjectSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  url: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
});

export const ProfessionalSummarySchema = z.object({
  name: z.string().optional(),
  contact: ContactSchema.optional(),
  socials: SocialsSchema.optional(),
  location: z.string().optional(),
  experiences: z.array(ExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
  certificates: z.array(CertificateSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
});

export type Contact = z.infer<typeof ContactSchema>;
export type Socials = z.infer<typeof SocialsSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProfessionalSummary = z.infer<typeof ProfessionalSummarySchema>;

/** Same shape as ProfessionalSummary, but job-tailored for PDF generation */
export type Resume = ProfessionalSummary;
