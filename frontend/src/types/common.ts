// 共通で使用される基本的な型定義

export interface BasicAuth {
  username: string;
  password: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  timestamp: string;
}

export type TabType = 'headings' | 'images' | 'links' | 'meta' | 'accessibility' | 'recommendations' | 'siteLinks' | 'consoleErrors';

export type Severity = 'error' | 'warning' | 'info' | 'success';

export interface IssueBase {
  type: string;
  message: string;
  severity: Severity;
}