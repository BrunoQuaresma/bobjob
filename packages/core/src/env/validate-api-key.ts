export function validateApiKey(): boolean {
  const key = process.env.OPENAI_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

export type WarnIfApiKeyMissingOptions = {
  onWarn?: (message: string) => void;
};

export function warnIfApiKeyMissing(
  options?: WarnIfApiKeyMissingOptions
): void {
  if (!validateApiKey()) {
    const message =
      'OPENAI_API_KEY is not set. Set it in your environment to use AI features.';
    if (options?.onWarn) {
      options.onWarn(message);
    } else {
      console.warn(message);
    }
  }
}
