import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import type { Browser, Page } from 'playwright';
import { renderResumeToPdf } from './render-resume-to-pdf';

const MINIMAL_PDF_HEADER = Buffer.from('%PDF-1.4\n%%EOF');

function createMockBrowser(): Browser {
  return {
    newPage: async (): Promise<Page> => {
      const { writeFile } = await import('node:fs/promises');
      return {
        setContent: async () => {},
        pdf: async (options?: { path?: string }) => {
          const path = options?.path;
          if (path) {
            await writeFile(path, MINIMAL_PDF_HEADER);
          }
        },
      } as unknown as Page;
    },
    close: async () => {},
  } as unknown as Browser;
}

describe('renderResumeToPdf', () => {
  const testDir = mkdtempSync(join(tmpdir(), 'bobjob-render-pdf-test-'));

  const validResume = {
    name: 'Jane Doe',
    contact: { email: 'jane@example.com' },
    experiences: [
      {
        title: 'Engineer',
        company: 'Acme',
        startDate: '2020-01',
        endDate: '2023-06',
      },
    ],
  };

  it('writes PDF to output path when resume is valid', async () => {
    const outputPath = join(testDir, 'resume.pdf');

    await renderResumeToPdf(validResume, outputPath, {
      getBrowser: () => Promise.resolve(createMockBrowser()),
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath);
    expect(content.toString()).toContain('%PDF');
  });

  it('creates parent directory if it does not exist', async () => {
    const outputPath = join(testDir, 'nested', 'dir', 'resume.pdf');

    await renderResumeToPdf(validResume, outputPath, {
      getBrowser: () => Promise.resolve(createMockBrowser()),
    });

    expect(existsSync(outputPath)).toBe(true);
  });

  it('throws when resume is empty', async () => {
    const outputPath = join(testDir, 'empty.pdf');

    await expect(
      renderResumeToPdf(
        {} as Parameters<typeof renderResumeToPdf>[0],
        outputPath,
        {
          getBrowser: () => Promise.resolve(createMockBrowser()),
        }
      )
    ).rejects.toThrow('Resume is required.');
  });

  it('throws when resume lacks minimum fields', async () => {
    const outputPath = join(testDir, 'invalid.pdf');

    await expect(
      renderResumeToPdf(
        { name: 'Jane' } as Parameters<typeof renderResumeToPdf>[0],
        outputPath,
        { getBrowser: () => Promise.resolve(createMockBrowser()) }
      )
    ).rejects.toThrow(
      'Resume must have name, contact.email, and at least one experience or education.'
    );
  });

  it('throws when output path is empty', async () => {
    await expect(
      renderResumeToPdf(validResume, '', {
        getBrowser: () => Promise.resolve(createMockBrowser()),
      })
    ).rejects.toThrow('Output path is required.');

    await expect(
      renderResumeToPdf(validResume, '   ', {
        getBrowser: () => Promise.resolve(createMockBrowser()),
      })
    ).rejects.toThrow('Output path is required.');
  });
});
