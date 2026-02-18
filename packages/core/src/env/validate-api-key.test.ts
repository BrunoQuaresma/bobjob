import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { validateApiKey, warnIfApiKeyMissing } from './validate-api-key';

const originalKey = process.env.OPENAI_API_KEY;

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

afterEach(() => {
  if (originalKey !== undefined) {
    process.env.OPENAI_API_KEY = originalKey;
  } else {
    delete process.env.OPENAI_API_KEY;
  }
});

describe('validateApiKey', () => {
  it('returns true when OPENAI_API_KEY is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    expect(validateApiKey()).toBe(true);
  });

  it('returns false when OPENAI_API_KEY is not set', () => {
    expect(validateApiKey()).toBe(false);
  });

  it('returns false when OPENAI_API_KEY is empty string', () => {
    process.env.OPENAI_API_KEY = '';
    expect(validateApiKey()).toBe(false);
  });

  it('returns false when OPENAI_API_KEY is whitespace only', () => {
    process.env.OPENAI_API_KEY = '   ';
    expect(validateApiKey()).toBe(false);
  });

  it('returns true when OPENAI_API_KEY has content', () => {
    process.env.OPENAI_API_KEY = 'sk-valid-key';
    expect(validateApiKey()).toBe(true);
  });
});

describe('warnIfApiKeyMissing', () => {
  it('calls onWarn when key is missing and onWarn provided', () => {
    const onWarn = (msg: string) => {
      expect(msg).toContain('OPENAI_API_KEY');
      expect(msg).toContain('not set');
    };
    warnIfApiKeyMissing({ onWarn });
  });

  it('calls console.warn when key is missing and no onWarn provided', () => {
    let called = false;
    const mockWarn = (msg: string) => {
      called = true;
      expect(msg).toContain('OPENAI_API_KEY');
    };
    const warnSpy = console.warn;
    console.warn = mockWarn;
    warnIfApiKeyMissing();
    expect(called).toBe(true);
    console.warn = warnSpy;
  });

  it('does not call onWarn when key is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    let called = false;
    warnIfApiKeyMissing({
      onWarn: () => {
        called = true;
      },
    });
    expect(called).toBe(false);
  });

  it('does not call console.warn when key is set', () => {
    process.env.OPENAI_API_KEY = 'sk-test';
    let called = false;
    const warnSpy = console.warn;
    console.warn = () => {
      called = true;
    };
    warnIfApiKeyMissing();
    expect(called).toBe(false);
    console.warn = warnSpy;
  });
});
