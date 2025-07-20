import type { CheckResult, CrawlResult, BasicAuth } from '../types/index.js';

// Local development API URL
const API_BASE_URL = 'http://localhost:4000/api';

export class ApiError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const fullUrl = `${API_BASE_URL}${url}`;
  console.log('Making API request to:', fullUrl);
  console.log('API_BASE_URL:', API_BASE_URL);
  console.log('Environment:', import.meta.env.PROD ? 'production' : 'development');
  
  try {
    const response = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new ApiError(
        errorData.message || errorData.error || `HTTP ${response.status}`,
        response.status
      );
    }

    const data = await response.json();
    console.log('API Response success:', data);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Network error details:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
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
    body: JSON.stringify({ url: startUrl, auth }),
  });
}

export async function crawlSite(startUrl: string, urls?: string[], auth?: BasicAuth): Promise<CrawlResult> {
  return makeRequest<CrawlResult>('/crawl', {
    method: 'POST',
    body: JSON.stringify({ startUrl, urls, auth }),
  });
}