export interface Contact {
  email: string;
  phone?: string;
}

export interface Socials {
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface Experience {
  title: string;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  highlights?: string[];
}

export interface Education {
  degree: string;
  school: string;
  location?: string;
  startDate: string;
  endDate: string;
  field?: string;
}

export interface Certificate {
  name: string;
  issuer: string;
  date?: string;
  url?: string;
}

export interface Project {
  name: string;
  description?: string;
  url?: string;
  technologies?: string[];
  highlights?: string[];
}

export interface ProfessionalSummary {
  name?: string;
  contact?: Contact;
  socials?: Socials;
  location?: string;
  experiences?: Experience[];
  education?: Education[];
  certificates?: Certificate[];
  projects?: Project[];
}

/** Same shape as ProfessionalSummary, but job-tailored for PDF generation */
export type Resume = ProfessionalSummary;
