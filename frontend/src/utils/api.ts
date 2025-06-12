import type { CheckResult, CrawlResult, BasicAuth } from '../types/index.js';

const API_BASE_URL = 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

async function makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error or server unavailable');
  }
}

export async function checkSinglePage(url: string, auth?: BasicAuth): Promise<CheckResult> {
  return makeRequest<CheckResult>('/check', {
    method: 'POST',
    body: JSON.stringify({ url, auth }),
  });
}

export async function crawlSite(startUrl: string, maxPages: number = 30, auth?: BasicAuth): Promise<CrawlResult> {
  return makeRequest<CrawlResult>('/crawl', {
    method: 'POST',
    body: JSON.stringify({ startUrl, maxPages, auth }),
  });
}