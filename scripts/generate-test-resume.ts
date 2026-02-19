#!/usr/bin/env bun
/**
 * Generates a PDF resume for testing purposes using mock data.
 * Output is always written to ~/resumes/
 */

import { homedir } from 'node:os';
import { join } from 'node:path';
import { renderResumeToPdf } from '@bobjob/core';
import type { ProfessionalSummary } from '@bobjob/core';

const MOCK_RESUME: ProfessionalSummary = {
  name: 'Jane Doe',
  title: 'Senior Software Engineer',
  contact: {
    email: 'jane.doe@example.com',
    phone: '+1 (555) 123-4567',
  },
  socials: {
    linkedin: 'https://linkedin.com/in/janedoe',
    github: 'https://github.com/janedoe',
    portfolio: 'https://janedoe.dev',
  },
  location: 'San Francisco, CA',
  summary:
    'Passionate software engineer with 8+ years of experience building scalable web applications. Strong advocate for clean code, testing, and developer experience.',
  skills: [
    'TypeScript',
    'React',
    'Node.js',
    'PostgreSQL',
    'AWS',
    'Docker',
    'CI/CD',
    'System Design',
  ],
  experiences: [
    {
      title: 'Senior Software Engineer',
      company: 'Acme Corp',
      location: 'San Francisco, CA',
      startDate: '2021-03',
      endDate: '2024-06',
      description:
        'Led a team of 5 engineers building the core platform. Improved system reliability from 99.5% to 99.99% uptime.',
      highlights: [
        'Architected and shipped a new microservices platform serving 2M+ daily requests',
        'Mentored 3 junior engineers; 2 promoted within 18 months',
        'Reduced deployment time from 45 min to 8 min through CI/CD improvements',
      ],
    },
    {
      title: 'Software Engineer',
      company: 'StartupXYZ',
      location: 'Remote',
      startDate: '2018-01',
      endDate: '2021-02',
      description:
        'Full-stack development for a B2B SaaS product. Built features end-to-end from design to deployment.',
      highlights: [
        'Built real-time collaboration features using WebSockets',
        'Implemented automated E2E testing; reduced regression bugs by 60%',
        'Designed and developed REST API used by 50+ enterprise customers',
      ],
    },
    {
      title: 'Junior Developer',
      company: 'Tech Solutions Inc',
      location: 'Austin, TX',
      startDate: '2016-06',
      endDate: '2017-12',
      highlights: [
        'Developed internal tools that saved 20 hours/week for the support team',
        'Fixed critical security vulnerabilities in legacy codebase',
      ],
    },
  ],
  education: [
    {
      degree: 'B.S. Computer Science',
      school: 'University of California',
      location: 'Berkeley, CA',
      startDate: '2012-08',
      endDate: '2016-05',
      field: 'Software Engineering',
    },
  ],
  certificates: [
    {
      name: 'AWS Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2022-03',
    },
    {
      name: 'Kubernetes Administrator',
      issuer: 'CNCF',
      date: '2023-01',
    },
  ],
  projects: [
    {
      name: 'Open Source CLI Tool',
      description: 'A popular CLI for developers with 10k+ GitHub stars.',
      url: 'https://github.com/janedoe/cli-tool',
      technologies: ['TypeScript', 'Node.js', 'Rust'],
      highlights: [
        'Maintained by a community of 50+ contributors',
        'Featured in JavaScript Weekly and Node Weekly',
      ],
    },
  ],
};

const OUTPUT_DIR = join(homedir(), 'Documents', 'Resumes');
const OUTPUT_FILENAME = `test-resume-${Date.now()}.pdf`;
const OUTPUT_PATH = join(OUTPUT_DIR, OUTPUT_FILENAME);

async function main(): Promise<void> {
  console.log('Generating test PDF resume...');
  await renderResumeToPdf(MOCK_RESUME, OUTPUT_PATH);
  console.log(`Done! Resume saved to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error('Failed to generate resume:', err);
  process.exit(1);
});
