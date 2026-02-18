export function validateApiKey(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

export function warnIfApiKeyMissing(): void {
  if (!validateApiKey()) {
    console.warn(
      'OPENAI_API_KEY is not set. Set it in your environment to use AI features.'
    );
  }
}
