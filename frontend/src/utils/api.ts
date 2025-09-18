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

interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
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
      const errorData: ApiResponse<unknown> = await response.json().catch(() => ({}));
      console.error('API Error Response:', errorData);
      
      // HTTPステータスコードに基づく日本語エラーメッセージ
      const statusMessages: Record<number, string> = {
        400: '入力内容に誤りがあります',
        401: '認証が必要です',
        403: 'アクセスが拒否されました',
        404: 'リソースが見つかりません',
        408: 'リクエストがタイムアウトしました',
        429: 'リクエストが多すぎます。しばらく待ってから再試行してください',
        500: 'サーバーエラーが発生しました',
        502: 'ゲートウェイエラーが発生しました',
        503: 'サービスが一時的に利用できません',
        504: 'ゲートウェイタイムアウトが発生しました'
      };
      
      const defaultMessage = statusMessages[response.status] || `HTTPエラー ${response.status}`;
      
      throw new ApiError(
        errorData.message || errorData.error || defaultMessage,
        response.status
      );
    }

    const data: T = await response.json();
    console.log('API Response success:', data);
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Network error details:', error);
    console.error('Error type:', typeof error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    
    // ネットワークエラーの詳細な日本語メッセージ
    let networkErrorMessage = 'ネットワークエラーが発生しました';
    
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        networkErrorMessage = 'サーバーに接続できません。サーバーが起動しているか確認してください';
      } else if (error.message.includes('NetworkError')) {
        networkErrorMessage = 'ネットワーク接続を確認してください';
      } else if (error.message.includes('timeout')) {
        networkErrorMessage = '接続がタイムアウトしました。もう一度お試しください';
      }
    }
    
    throw new ApiError(networkErrorMessage);
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