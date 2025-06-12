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

  const isCrawlResult = 'results' in result;
  const data = isCrawlResult ? result.results[0] : result;
  
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
      </header>

      <div className="dashboard-content">
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
      </div>
    </div>
  );
};