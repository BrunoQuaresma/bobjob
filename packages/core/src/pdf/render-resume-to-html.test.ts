import { describe, expect, it } from 'bun:test';
import type { ProfessionalSummary } from '../types/professional-summary';
import { renderResumeToHtml } from './render-resume-to-html';

const MINIMAL_TEMPLATE = `
<!DOCTYPE html>
<html><body>
  {{#if name}}<h1>{{name}}</h1>{{/if}}
  {{#if contact.email}}<span>{{contact.email}}</span>{{/if}}
  {{#each experiences}}
  <div class="exp">{{title}} at {{company}} ({{formatDate startDate}} – {{formatDate endDate}})</div>
  {{/each}}
</body></html>
`;

describe('renderResumeToHtml', () => {
  it('renders minimal resume with name, email, and one experience', async () => {
    const resume: ProfessionalSummary = {
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
      experiences: [
        {
          title: 'Software Engineer',
          company: 'Acme',
          startDate: '2020-01',
          endDate: '2023-06',
        },
      ],
    };

    const html = await renderResumeToHtml(resume, {
      templateContent: MINIMAL_TEMPLATE,
    });

    expect(html).toContain('Jane Doe');
    expect(html).toContain('jane@example.com');
    expect(html).toContain('Software Engineer');
    expect(html).toContain('Acme');
    expect(html).toContain('Jan 2020');
    expect(html).toContain('Jun 2023');
  });

  it('handles empty optional sections', async () => {
    const resume: ProfessionalSummary = {
      name: 'John',
      contact: { email: 'john@test.com' },
      experiences: [],
      education: [],
    };

    const template = '<html><body>{{name}} {{contact.email}}</body></html>';
    const html = await renderResumeToHtml(resume, {
      templateContent: template,
    });

    expect(html).toContain('John');
    expect(html).toContain('john@test.com');
  });

  it('formats ISO date 2020-01 as Jan 2020', async () => {
    const template = '<html><body>{{formatDate "2020-01"}}</body></html>';
    const resume: ProfessionalSummary = {
      name: 'X',
      contact: { email: 'x@x.com' },
      experiences: [{ title: 'T', company: 'C', startDate: '2020-01' }],
    };

    const html = await renderResumeToHtml(resume, {
      templateContent: template,
    });

    expect(html).toContain('Jan 2020');
  });

  it('does not render section when array is empty', async () => {
    const template =
      '{{#if (hasItems experiences)}}<section>Experience</section>{{/if}}';
    const resume: ProfessionalSummary = {
      name: 'X',
      contact: { email: 'x@x.com' },
      experiences: [],
    };

    const html = await renderResumeToHtml(resume, {
      templateContent: template,
    });

    expect(html).not.toContain('Experience');
  });

  it('formats full ISO date 2020-01-15 as 15 Jan 2020', async () => {
    const template = '<html><body>{{formatDate "2020-01-15"}}</body></html>';
    const resume: ProfessionalSummary = {
      name: 'X',
      contact: { email: 'x@x.com' },
      experiences: [{ title: 'T', company: 'C', startDate: '2020-01-15' }],
    };

    const html = await renderResumeToHtml(resume, {
      templateContent: template,
    });

    expect(html).toContain('15 Jan 2020');
  });

  it('renders contact section with location last', async () => {
    const resume: ProfessionalSummary = {
      name: 'Jane Doe',
      contact: { email: 'jane@example.com' },
      location: 'San Francisco, CA',
      socials: { linkedin: 'https://linkedin.com/in/jane' },
      experiences: [
        { title: 'Engineer', company: 'Acme', startDate: '2020-01' },
      ],
    };

    const html = await renderResumeToHtml(resume);

    const linkedinPos = html.indexOf('LinkedIn');
    const locationPos = html.indexOf('San Francisco, CA');
    expect(linkedinPos).toBeGreaterThan(-1);
    expect(locationPos).toBeGreaterThan(-1);
    expect(locationPos).toBeGreaterThan(linkedinPos);
  });
});
