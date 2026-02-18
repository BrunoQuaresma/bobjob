import { describe, expect, it } from 'bun:test';
import * as readline from 'node:readline';
import { ask, askMultiline } from './prompt';

function createMockReadline(answers: string[]): readline.Interface {
  let index = 0;
  const rl = {
    question: (_query: string, callback: (answer: string) => void) => {
      const answer =
        (index < answers.length ? answers[index++] : undefined) ?? '';
      callback(answer);
    },
    close: () => {},
    off: () => {},
    once: () => {},
  } as unknown as readline.Interface;
  return rl;
}

function createMockReadlineForMultiline(lines: string[]): readline.Interface {
  const lineListeners: Array<(line: string) => void> = [];
  const closeListeners: Array<() => void> = [];
  return {
    setPrompt: () => {},
    prompt: () => {
      for (const line of [...lines, '']) {
        for (const cb of lineListeners) {
          cb(line);
        }
        if (line === '') {
          for (const cb of closeListeners) {
            cb();
          }
        }
      }
    },
    on: (event: string, listener: (line: string) => void) => {
      if (event === 'line') lineListeners.push(listener);
      if (event === 'close') closeListeners.push(listener as () => void);
    },
    off: () => {},
    once: () => {},
    close: () => {},
  } as unknown as readline.Interface;
}

describe('ask', () => {
  it('returns trimmed user input', async () => {
    const rl = createMockReadline(['  hello world  ']);
    const result = await ask('What is your name?', { rl });
    expect(result).toBe('hello world');
  });

  it('returns empty string for blank input', async () => {
    const rl = createMockReadline(['']);
    const result = await ask('Anything?', { rl });
    expect(result).toBe('');
  });

  it('returns empty string for whitespace-only input', async () => {
    const rl = createMockReadline(['   \t\n  ']);
    const result = await ask('Anything?', { rl });
    expect(result).toBe('');
  });

  it('preserves input with internal spaces', async () => {
    const rl = createMockReadline(['John Doe']);
    const result = await ask('Name?', { rl });
    expect(result).toBe('John Doe');
  });
});

describe('askMultiline', () => {
  it('returns concatenated lines until empty line', async () => {
    const rl = createMockReadlineForMultiline([
      'line one',
      'line two',
      'line three',
    ]);
    const result = await askMultiline('Paste text:', { rl });
    expect(result).toBe('line one\nline two\nline three');
  });

  it('returns empty string when first line is empty', async () => {
    const rl = createMockReadlineForMultiline([]);
    const result = await askMultiline('Paste text:', { rl });
    expect(result).toBe('');
  });

  it('returns trimmed result', async () => {
    const rl = createMockReadlineForMultiline(['  hello  ', '  world  ']);
    const result = await askMultiline('Paste:', { rl });
    expect(result).toBe('hello  \n  world');
  });

  it('returns single line when one line then empty', async () => {
    const rl = createMockReadlineForMultiline(['https://example.com/job']);
    const result = await askMultiline('URL or text:', { rl });
    expect(result).toBe('https://example.com/job');
  });
});
