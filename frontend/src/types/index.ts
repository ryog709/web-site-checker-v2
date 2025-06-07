export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestpractices: number;
  seo: number;
  pwa: number;
}

export interface ImageInfo {
  index: number;
  src: string;
  originalSrc: string;
  alt: string;
  title: string;
  width: number | null;
  height: number | null;
  hasAlt: boolean;
  hasDimensions: boolean;
  filename: string;
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
  severity: 'error' | 'warning' | 'info';
  src?: string;
  href?: string;
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
    accessibility: {
      lighthouse: LighthouseIssue[];
      axe: AxeViolation[];
    };
  };
  error?: string;
}

export interface CrawlResult {
  startUrl: string;
  totalPages: number;
  timestamp: string;
  results: CheckResult[];
}

export type TabType = 'headings' | 'images' | 'image-issues' | 'links' | 'meta' | 'accessibility';