import { describe, expect, it } from 'bun:test';
import * as readline from 'node:readline';
import { ask } from './prompt';

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
