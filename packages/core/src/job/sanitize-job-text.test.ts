import { describe, expect, it } from 'bun:test';
import { sanitizeJobText } from './sanitize-job-text';

describe('sanitizeJobText', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitizeJobText('  hello  ')).toBe('hello');
    expect(sanitizeJobText('\n\nhello\n\n')).toBe('hello');
  });

  it('collapses multiple newlines to max 2', () => {
    expect(sanitizeJobText('a\n\n\n\nb')).toBe('a\n\nb');
    expect(sanitizeJobText('a\n\n\nb')).toBe('a\n\nb');
    expect(sanitizeJobText('a\n\nb')).toBe('a\n\nb');
  });

  it('collapses multiple spaces/tabs to single space', () => {
    expect(sanitizeJobText('a    b')).toBe('a b');
    expect(sanitizeJobText('a\t\tb')).toBe('a b');
    expect(sanitizeJobText('a  \t  b')).toBe('a b');
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeJobText('')).toBe('');
    expect(sanitizeJobText('   ')).toBe('');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeJobText(null as unknown as string)).toBe('');
    expect(sanitizeJobText(undefined as unknown as string)).toBe('');
  });

  it('preserves single newlines and spaces', () => {
    expect(sanitizeJobText('line one\nline two')).toBe('line one\nline two');
    expect(sanitizeJobText('word one word two')).toBe('word one word two');
  });

  it('normalizes Windows line endings', () => {
    expect(sanitizeJobText('a\r\nb')).toBe('a\nb');
    expect(sanitizeJobText('a\rb')).toBe('a\nb');
  });
});
