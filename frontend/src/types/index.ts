export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestpractices: number;
  seo: number;
}

export interface ImageInfo {
  index: number;
  src: string;
  originalSrc: string;
  alt: string; // imgタグのalt属性 または SVGのaria-label/title
  title: string;
  width: number | null;
  height: number | null;
  hasAlt: boolean; // imgではalt属性の有無、SVGではaria-label/titleの有無
  hasDimensions: boolean;
  filename: string;
  type?: 'svg' | 'img'; // 画像の種類（通常の画像 or インラインSVG）
  role?: string; // SVGのrole属性（img, presentation等）
}

export interface HeadingImage {
  src: string;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
  filename: string;
}

export interface Heading {
  level: number;
  tag: string;
  text: string;
  index: number;
  images: HeadingImage[];
  hasImage?: boolean;
  isEmpty?: boolean;
}

export interface Issue {
  type: string;
  element?: string;
  message: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  src?: string;
  href?: string;
  className?: string;
  position?: number;
  suggestion?: string;
  linkText?: string;
  linkHtml?: string;
}

export interface LighthouseIssue {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue?: string;
}

export interface AxeViolation {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: number;
}

export interface ConsoleError {
  type: 'console-error' | 'javascript-error' | 'request-failed';
  message: string;
  timestamp: string;
  severity: 'error' | 'warning';
  location?: {
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  stack?: string;
  url?: string;
  failure?: {
    errorText: string;
  };
}

export interface MetaInfo {
  type: string;
  name: string;
  content: string;
  length?: number;
  property?: string;
}

export interface SiteLink {
  url: string;
  text: string;
  title: string;
}

export interface CheckResult {
  url: string;
  timestamp: string;
  scores: LighthouseScores;
  issues: {
    headings: Issue[];
    headingsStructure: Heading[]; // 新しい項目を追加
    images: Issue[];
    allImages: ImageInfo[]; // 全ての画像情報を追加
    links: Issue[];
    meta: Issue[];
    allMeta: MetaInfo[]; // 全てのメタ情報を追加
    htmlStructure: Issue[]; // HTML構造チェック結果を追加
    accessibility: {
      lighthouse: LighthouseIssue[];
      axe: AxeViolation[];
    };
    consoleErrors: ConsoleError[]; // コンソールエラーを追加
  };
  siteLinks?: SiteLink[]; // 他ページへのリンク一覧を追加
  auth?: BasicAuth; // 使用された認証情報を保存
  error?: string;
}

export interface CrawlResult {
  startUrl: string;
  totalPages: number;
  timestamp: string;
  results: CheckResult[];
  auth?: BasicAuth; // 使用された認証情報を保存
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface CheckRequest {
  url: string;
  auth?: BasicAuth;
}

export interface CrawlRequest {
  startUrl: string;
  maxPages: number;
  auth?: BasicAuth;
}

export type TabType = 'headings' | 'images' | 'image-issues' | 'links' | 'meta' | 'html-structure' | 'accessibility' | 'console-errors';