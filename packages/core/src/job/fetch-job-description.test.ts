import { describe, expect, it } from 'bun:test';
import {
  fetchJobDescription,
  type FetchJobDescriptionOptions,
} from './fetch-job-description';

describe('fetchJobDescription', () => {
  it('returns sanitized text when getPage provides content', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => ({
      innerText: () =>
        Promise.resolve(
          '  Senior Engineer at Acme  \n\n  Requirements: 5+ years  '
        ),
    });
    const result = await fetchJobDescription('https://example.com/job', {
      getPage,
    });
    expect(result).toBe('Senior Engineer at Acme\n\nRequirements: 5+ years');
  });

  it('throws when url uses file or non-http protocol', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => ({
      innerText: () => Promise.resolve(''),
    });
    await expect(
      fetchJobDescription('file:///etc/passwd', { getPage })
    ).rejects.toThrow('Please provide a valid http or https URL');
    await expect(
      fetchJobDescription('ftp://example.com/job', { getPage })
    ).rejects.toThrow('Please provide a valid http or https URL');
  });

  it('throws when url is empty', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => ({
      innerText: () => Promise.resolve(''),
    });
    await expect(fetchJobDescription('', { getPage })).rejects.toThrow(
      'Please provide a valid URL.'
    );
    await expect(fetchJobDescription('   ', { getPage })).rejects.toThrow(
      'Please provide a valid URL.'
    );
  });

  it('throws 404 message when getPage throws 404', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => {
      throw new Error(
        "This page doesn't exist or the job may have been removed."
      );
    };
    await expect(
      fetchJobDescription('https://example.com/404', { getPage })
    ).rejects.toThrow(
      "This page doesn't exist or the job may have been removed."
    );
  });

  it('throws network message when getPage throws timeout', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => {
      throw new Error('Timeout 30000ms exceeded');
    };
    await expect(
      fetchJobDescription('https://example.com/slow', { getPage })
    ).rejects.toThrow(
      "We couldn't reach that page. Check the URL or try pasting the job description instead."
    );
  });

  it('throws generic message when getPage throws unknown error', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => {
      throw new Error('Something went wrong');
    };
    await expect(
      fetchJobDescription('https://example.com/job', { getPage })
    ).rejects.toThrow(
      "We couldn't fetch that page. Try pasting the job description as text."
    );
  });

  it('trims and sanitizes whitespace from fetched content', async () => {
    const getPage: FetchJobDescriptionOptions['getPage'] = async () => ({
      innerText: () =>
        Promise.resolve(
          '  \n\n  Job Title  \n\n\n\n  Description here  \n\n  '
        ),
    });
    const result = await fetchJobDescription('https://example.com/job', {
      getPage,
    });
    expect(result).toBe('Job Title\n\nDescription here');
  });
});
