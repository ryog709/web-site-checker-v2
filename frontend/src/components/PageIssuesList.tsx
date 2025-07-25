import React from 'react';
import type { CrawlResult, BasicAuth, Issues } from '../types/index.js';

interface PageIssue {
  url: string;
  totalIssues: number;
  scores: {
    performance?: number;
    accessibility?: number;
    bestpractices?: number;
    seo?: number;
  };
  issues: Issues;
}

interface PageIssuesListProps {
  result: CrawlResult;
  onCheckPage: (url: string, auth?: BasicAuth) => Promise<void>;
}

// サイト全体の問題を集約する関数
const aggregateIssues = (result: CrawlResult): PageIssue[] => {
  const issueMap = new Map();
  
  result.results.forEach(pageResult => {
    const totalIssues = 
      (pageResult.issues?.headings?.length || 0) +
      (pageResult.issues?.images?.length || 0) +
      (pageResult.issues?.links?.length || 0) +
      (pageResult.issues?.meta?.length || 0) +
      (pageResult.issues?.htmlStructure?.length || 0) +
      (pageResult.issues?.accessibility?.lighthouse?.length || 0) +
      (pageResult.issues?.accessibility?.axe?.length || 0);
    
    if (totalIssues > 0) {
      issueMap.set(pageResult.url, {
        url: pageResult.url,
        totalIssues,
        scores: pageResult.scores,
        issues: pageResult.issues
      });
    }
  });
  
  return Array.from(issueMap.values()).sort((a, b) => b.totalIssues - a.totalIssues);
};

// 問題のないページを集約する関数
const aggregateCleanPages = (result: CrawlResult): PageIssue[] => {
  return result.results
    .filter(pageResult => {
      const totalIssues = 
        (pageResult.issues?.headings?.length || 0) +
        (pageResult.issues?.images?.length || 0) +
        (pageResult.issues?.links?.length || 0) +
        (pageResult.issues?.meta?.length || 0) +
        (pageResult.issues?.htmlStructure?.length || 0) +
        (pageResult.issues?.accessibility?.lighthouse?.length || 0) +
        (pageResult.issues?.accessibility?.axe?.length || 0);
      return totalIssues === 0;
    })
    .map(pageResult => ({
      url: pageResult.url,
      totalIssues: 0,
      scores: pageResult.scores,
      issues: pageResult.issues
    }))
    .sort((a, b) => (b.scores?.performance || 0) - (a.scores?.performance || 0));
};

export const PageIssuesList: React.FC<PageIssuesListProps> = ({
  result,
  onCheckPage
}) => {
  const pagesWithIssues = aggregateIssues(result);
  const cleanPages = aggregateCleanPages(result);

  return (
    <div className="pages-overview">
      {pagesWithIssues.length > 0 && (
        <div className="issues-section">
          <h3>🔍 改善が必要なページ（問題数順）</h3>
          <div className="pages-list">
            {pagesWithIssues.map((page) => (
              <div 
                key={page.url} 
                className="page-item clickable"
                onClick={() => onCheckPage(page.url, result.auth)}
                role="button" 
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onCheckPage(page.url, result.auth);
                  }
                }}
              >
                <div className="page-header">
                  <span className="page-url">{page.url}</span>
                  <span className="issues-count">{page.totalIssues}件の問題</span>
                </div>
                <div className="page-scores">
                  <div className="mini-score">
                    <span>Accessibility: {page.scores?.accessibility || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>SEO: {page.scores?.seo || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>Performance: {page.scores?.performance || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>Best Practices: {page.scores?.bestpractices || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cleanPages.length > 0 && (
        <div className="clean-pages-section">
          <h3>✅ 問題のないページ</h3>
          <div className="pages-list">
            {cleanPages.map((page) => (
              <div key={page.url} className="page-item clean">
                <div className="page-header">
                  <span className="page-url">{page.url}</span>
                  <span className="clean-badge">✅ 問題なし</span>
                </div>
                <div className="page-scores">
                  <div className="mini-score">
                    <span>Accessibility: {page.scores?.accessibility || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>SEO: {page.scores?.seo || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>Performance: {page.scores?.performance || 0}</span>
                  </div>
                  <div className="mini-score">
                    <span>Best Practices: {page.scores?.bestpractices || 0}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};