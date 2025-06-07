export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestpractices: number;
  seo: number;
  pwa: number;
}

export interface Heading {
  level: number;
  tag: string;
  text: string;
  index: number;
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

export type TabType = 'headings' | 'images' | 'links' | 'meta' | 'accessibility';