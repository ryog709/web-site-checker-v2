import type { CheckResult, CrawlResult, BasicAuth } from '../types/index.js';

const API_BASE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`;

export class ApiError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
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
    console.error('Network error details:', error);
    throw new ApiError(`Network error or server unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function checkSinglePage(url: string, auth?: BasicAuth): Promise<CheckResult> {
  return makeRequest<CheckResult>('/check', {
    method: 'POST',
    body: JSON.stringify({ url, auth }),
  });
}

export interface PageCountResult {
  totalPages: number;
  urls: string[];
}

export async function countPages(startUrl: string, auth?: BasicAuth): Promise<PageCountResult> {
  return makeRequest<PageCountResult>('/count-pages', {
    method: 'POST',
    body: JSON.stringify({ startUrl, auth }),
  });
}

export async function crawlSite(startUrl: string, urls?: string[], auth?: BasicAuth): Promise<CrawlResult> {
  return makeRequest<CrawlResult>('/crawl', {
    method: 'POST',
    body: JSON.stringify({ startUrl, urls, auth }),
  });
}