import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

const FILE_NOT_FOUND_MESSAGE =
  'Could not find the file. Please check the path.';
const PERMISSION_DENIED_MESSAGE =
  'Could not read the file. Please check permissions.';
const INVALID_PDF_MESSAGE =
  "This doesn't look like a valid PDF, or the file may be corrupted.";
const PASSWORD_PROTECTED_MESSAGE =
  'This PDF is password-protected. Please provide an unprotected version.';
const GENERIC_ERROR_MESSAGE =
  "We couldn't extract text from this PDF. Try a different file or paste your resume as text.";

function isNodeErr(
  err: unknown
): err is NodeJS.ErrnoException & { code: string } {
  return err instanceof Error && 'code' in err;
}

function isPasswordException(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'PasswordException' || /password/i.test(err.message))
  );
}

/**
 * Extracts text from a PDF file.
 *
 * @param filePath - Absolute or relative path to the PDF file
 * @returns The extracted text (may be empty string)
 * @throws Error with a user-friendly message on parse failure
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  if (typeof filePath !== 'string' || filePath.trim().length === 0) {
    throw new Error('Please provide a valid file path.');
  }

  let buffer: Buffer;
  try {
    buffer = await readFile(filePath);
  } catch (err) {
    if (isNodeErr(err) && err.code === 'ENOENT') {
      throw new Error(FILE_NOT_FOUND_MESSAGE);
    }
    if (isNodeErr(err) && err.code === 'EISDIR') {
      throw new Error(FILE_NOT_FOUND_MESSAGE);
    }
    if (isNodeErr(err) && err.code === 'EACCES') {
      throw new Error(PERMISSION_DENIED_MESSAGE);
    }
    throw new Error(GENERIC_ERROR_MESSAGE);
  }

  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text ?? '';
  } catch (err) {
    if (isPasswordException(err)) {
      throw new Error(PASSWORD_PROTECTED_MESSAGE);
    }
    if (
      err instanceof Error &&
      /invalid|corrupt|malformed/i.test(err.message)
    ) {
      throw new Error(INVALID_PDF_MESSAGE);
    }
    throw new Error(GENERIC_ERROR_MESSAGE);
  } finally {
    await parser.destroy();
  }
}
