import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

type PdfParseBehavior =
  | { type: 'success'; text: string }
  | { type: 'invalid' }
  | { type: 'password' }
  | { type: 'throw' };

let pdfParseBehavior: PdfParseBehavior = { type: 'success', text: '' };
const mockDestroy = mock(() => Promise.resolve());

mock.module('pdf-parse', () => ({
  PDFParse: class MockPDFParse {
    getText() {
      switch (pdfParseBehavior.type) {
        case 'success':
          return Promise.resolve({ text: pdfParseBehavior.text });
        case 'invalid':
          return Promise.reject(new Error('Invalid PDF structure'));
        case 'password': {
          const err = new Error('Password required');
          (err as Error & { name: string }).name = 'PasswordException';
          return Promise.reject(err);
        }
        case 'throw':
          return Promise.reject(new Error('Parse failed'));
      }
    }
    destroy = mockDestroy;
  },
}));

describe('extractTextFromPdf', () => {
  const testDir = mkdtempSync(join(tmpdir(), 'bobjob-pdf-test-'));

  beforeEach(() => {
    mockDestroy.mockClear();
  });

  it('throws friendly error when path is empty', async () => {
    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    await expect(extractTextFromPdf('')).rejects.toThrow(
      'Please provide a valid file path.'
    );
    await expect(extractTextFromPdf('   ')).rejects.toThrow(
      'Please provide a valid file path.'
    );
  });

  it('throws friendly error when file does not exist', async () => {
    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    const nonexistentPath = join(testDir, 'nonexistent.pdf');
    await expect(extractTextFromPdf(nonexistentPath)).rejects.toThrow(
      'Could not find the file. Please check the path.'
    );
  });

  it('returns extracted text when PDF parses successfully', async () => {
    pdfParseBehavior = { type: 'success', text: 'Hello, resume!' };

    const pdfPath = join(testDir, 'sample.pdf');
    writeFileSync(pdfPath, Buffer.from('%PDF-1.4 fake content'));

    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    const result = await extractTextFromPdf(pdfPath);

    expect(result).toBe('Hello, resume!');
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('throws friendly error when pdf-parse throws', async () => {
    pdfParseBehavior = { type: 'invalid' };

    const pdfPath = join(testDir, 'invalid.pdf');
    writeFileSync(pdfPath, Buffer.from('not a pdf'));

    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    await expect(extractTextFromPdf(pdfPath)).rejects.toThrow(
      "This doesn't look like a valid PDF, or the file may be corrupted."
    );
  });

  it('throws friendly error for password-protected PDF', async () => {
    pdfParseBehavior = { type: 'password' };

    const pdfPath = join(testDir, 'locked.pdf');
    writeFileSync(pdfPath, Buffer.from('%PDF'));

    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    await expect(extractTextFromPdf(pdfPath)).rejects.toThrow(
      'This PDF is password-protected. Please provide an unprotected version.'
    );
  });

  it('calls parser.destroy() even when getText() throws', async () => {
    pdfParseBehavior = { type: 'throw' };

    const pdfPath = join(testDir, 'fail.pdf');
    writeFileSync(pdfPath, Buffer.from('%PDF'));

    const { extractTextFromPdf } = await import('./extract-text-from-pdf');
    await expect(extractTextFromPdf(pdfPath)).rejects.toThrow();

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });
});
