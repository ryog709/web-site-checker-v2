import React, { useState } from 'react';
import type { CheckResult, CrawlResult, TabType } from '../types/index.js';
import { ScoreRing } from './ScoreRing.js';
import { SummaryCards } from './SummaryCards.js';
import { TabNavigation } from './TabNavigation.js';
import { TabContent } from './TabContent.js';
import { Calendar, Clock, Globe } from 'lucide-react';

interface DashboardProps {
  result: CheckResult | CrawlResult;
}

export const Dashboard: React.FC<DashboardProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<TabType>('headings');
  const [selectedPageUrl, setSelectedPageUrl] = useState<string | null>(null);

  const isCrawlResult = 'results' in result;
  
  // サイト全体診断で特定のページが選択されている場合はそのページを表示
  let data: CheckResult;
  if (isCrawlResult) {
    if (selectedPageUrl) {
      const selectedPage = result.results.find(r => r.url === selectedPageUrl);
      data = selectedPage || result.results[0];
    } else {
      data = result.results[0];
    }
  } else {
    data = result;
  }
  
  // スコアにデフォルト値を設定
  const scores = {
    performance: data?.scores?.performance ?? 0,
    accessibility: data?.scores?.accessibility ?? 0,
    bestpractices: data?.scores?.bestpractices ?? 0,
    seo: data?.scores?.seo ?? 0,
    pwa: data?.scores?.pwa ?? 0
  };

  if (!data || data.error) {
    return (
      <div className="dashboard error-state">
        <h2>診断結果</h2>
        <div className="error-message" role="alert">
          診断中にエラーが発生しました: {data?.error || '不明なエラー'}
        </div>
      </div>
    );
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // サイト全体の問題を集約する関数
  const aggregateIssues = () => {
    if (!isCrawlResult) return [];
    
    const issueMap = new Map();
    
    result.results.forEach(pageResult => {
      const totalIssues = 
        (pageResult.issues?.headings?.length || 0) +
        (pageResult.issues?.images?.length || 0) +
        (pageResult.issues?.links?.length || 0) +
        (pageResult.issues?.meta?.length || 0) +
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

  const renderCrawlOverview = () => {
    if (!isCrawlResult || selectedPageUrl) return null;
    
    const issuesPages = aggregateIssues();
    const totalPages = result.results.length;
    const pagesWithIssues = issuesPages.length;
    const cleanPages = totalPages - pagesWithIssues;
    
    return (
      <div className="crawl-overview">
        <div className="overview-summary">
          <h3>サイト全体診断サマリー</h3>
          <div className="summary-stats">
            <div className="stat-item success">
              <span className="stat-number">{cleanPages}</span>
              <span className="stat-label">問題なし</span>
            </div>
            <div className="stat-item warning">
              <span className="stat-number">{pagesWithIssues}</span>
              <span className="stat-label">要改善</span>
            </div>
            <div className="stat-item info">
              <span className="stat-number">{totalPages}</span>
              <span className="stat-label">総ページ数</span>
            </div>
          </div>
        </div>
        
        {issuesPages.length > 0 && (
          <div className="issues-pages">
            <h4>改善が必要なページ（問題数順）</h4>
            <div className="pages-list">
              {issuesPages.map(page => (
                <div 
                  key={page.url} 
                  className="page-item"
                  onClick={() => setSelectedPageUrl(page.url)}
                >
                  <div className="page-header">
                    <span className="page-url">{page.url}</span>
                    <span className="issues-count">{page.totalIssues}件の問題</span>
                  </div>
                  <div className="page-scores">
                    <div className="mini-score">
                      <span>A11y: {page.scores?.accessibility || 0}</span>
                    </div>
                    <div className="mini-score">
                      <span>SEO: {page.scores?.seo || 0}</span>
                    </div>
                    <div className="mini-score">
                      <span>Performance: {page.scores?.performance || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {cleanPages > 0 && (
          <div className="clean-pages">
            <h4>問題のないページ ({cleanPages}ページ)</h4>
            <div className="pages-list">
              {result.results
                .filter(r => {
                  const totalIssues = 
                    (r.issues?.headings?.length || 0) +
                    (r.issues?.images?.length || 0) +
                    (r.issues?.links?.length || 0) +
                    (r.issues?.meta?.length || 0) +
                    (r.issues?.accessibility?.lighthouse?.length || 0) +
                    (r.issues?.accessibility?.axe?.length || 0);
                  return totalIssues === 0;
                })
                .map(page => (
                  <div 
                    key={page.url} 
                    className="page-item clean"
                    onClick={() => setSelectedPageUrl(page.url)}
                  >
                    <div className="page-header">
                      <span className="page-url">{page.url}</span>
                      <span className="clean-badge">✅ 問題なし</span>
                    </div>
                    <div className="page-scores">
                      <div className="mini-score">
                        <span>A11y: {page.scores?.accessibility || 0}</span>
                      </div>
                      <div className="mini-score">
                        <span>SEO: {page.scores?.seo || 0}</span>
                      </div>
                      <div className="mini-score">
                        <span>Performance: {page.scores?.performance || 0}</span>
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

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h2>診断結果</h2>
        <div className="result-meta">
          <div className="meta-item">
            <Globe size={16} />
            <span>{isCrawlResult ? result.startUrl : data.url}</span>
          </div>
          <div className="meta-item">
            <Calendar size={16} />
            <span>{formatTimestamp(result.timestamp)}</span>
          </div>
          {isCrawlResult && (
            <div className="meta-item">
              <Clock size={16} />
              <span>{result.totalPages}ページ診断完了</span>
            </div>
          )}
        </div>
        {isCrawlResult && selectedPageUrl && (
          <div className="page-navigation">
            <button 
              className="back-button"
              onClick={() => setSelectedPageUrl(null)}
            >
              ← サイト全体診断に戻る
            </button>
            <span className="current-page">現在のページ: {selectedPageUrl}</span>
          </div>
        )}
      </header>

      <div className="dashboard-content">
        {/* サイト全体診断の概要表示 */}
        {renderCrawlOverview()}
        
        {/* 個別ページの詳細表示または単一ページ診断の結果 */}
        {(!isCrawlResult || selectedPageUrl) && (
          <>
            <div className="dashboard-grid">
              <div className="scores-section">
                <h3>Lighthouseスコア</h3>
                <div className="score-rings">
                  <ScoreRing
                    score={scores.performance}
                    label="Performance"
                    color="--score-performance"
                  />
                  <ScoreRing
                    score={scores.accessibility}
                    label="Accessibility"
                    color="--score-accessibility"
                  />
                  <ScoreRing
                    score={scores.bestpractices}
                    label="Best Practices"
                    color="--score-best-practices"
                  />
                  <ScoreRing
                    score={scores.seo}
                    label="SEO"
                    color="--score-seo"
                  />
                  <ScoreRing
                    score={scores.pwa}
                    label="PWA"
                    color="--score-pwa"
                  />
                </div>
              </div>

              <div className="summary-section">
                <h3>問題サマリー</h3>
                <SummaryCards
                  issues={data.issues}
                  isCrawlResult={isCrawlResult}
                  totalPages={isCrawlResult ? result.totalPages : 1}
                />
              </div>
            </div>

            <div className="details-section">
              <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                issues={data.issues}
              />

              <TabContent
                activeTab={activeTab}
                issues={data.issues}
                isCrawlResult={isCrawlResult}
                allResults={isCrawlResult ? result.results : [data]}
                auth={result.auth}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};