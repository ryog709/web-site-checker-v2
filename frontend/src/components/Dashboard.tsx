import React, { useState, useMemo } from 'react';
import type { CheckResult, CrawlResult, TabType } from '../types/index.js';
import { ScoreRing } from './ScoreRing.js';
import { SummaryCards } from './SummaryCards.js';
import { TabNavigation } from './TabNavigation.js';
import { TabContent } from './TabContent.js';
import { PageIssuesList } from './PageIssuesList.js';
import { SemanticAnalysisComponent } from './SemanticAnalysis.js';
import { useRecommendationGenerator } from './RecommendationGenerator.js';
import { Calendar, Clock, Globe } from 'lucide-react';

interface DashboardProps {
  result: CheckResult | CrawlResult;
  onCheckPage?: (url: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ result, onCheckPage }) => {
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
    seo: data?.scores?.seo ?? 0
  };

  // 改善提案を生成（分離されたhookを使用）
  const { getRecommendations } = useRecommendationGenerator(data.url);

  // スコアごとの推奨データをメモ化
  const performanceData = useMemo(() => 
    getRecommendations('performance', scores.performance, data.issues), 
    [getRecommendations, scores.performance, data.issues]
  );
  
  const accessibilityData = useMemo(() => 
    getRecommendations('accessibility', scores.accessibility, data.issues), 
    [getRecommendations, scores.accessibility, data.issues]
  );
  
  const bestPracticesData = useMemo(() => 
    getRecommendations('bestpractices', scores.bestpractices, data.issues), 
    [getRecommendations, scores.bestpractices, data.issues]
  );
  
  const seoData = useMemo(() => 
    getRecommendations('seo', scores.seo, data.issues), 
    [getRecommendations, scores.seo, data.issues]
  );

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


  const renderSiteLinks = () => {
    if (isCrawlResult || !data.siteLinks || data.siteLinks.length === 0) return null;
    
    return (
      <div className="site-links-section">
        <div className="section-header">
          <div className="section-title">
            <Globe size={20} />
            <h4>このサイトの他のページ</h4>
            <span className="count-badge info">{data.siteLinks.length}</span>
          </div>
        </div>
        
        <div className="site-links-grid">
          {data.siteLinks.map((link, index) => (
            <div 
              key={index} 
              className="site-link-item"
              onClick={() => onCheckPage?.(link.url)}
            >
              <div className="link-content">
                <div className="link-text">
                  {link.text || 'タイトルなし'}
                </div>
                {link.title && (
                  <div className="link-title">
                    {link.title}
                  </div>
                )}
                <div className="link-url">
                  {link.url}
                </div>
              </div>
              <div className="link-action">
                📊 診断する
              </div>
            </div>
          ))}
        </div>
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
        {isCrawlResult && !selectedPageUrl && (
          <PageIssuesList 
            result={result} 
            onCheckPage={async (url: string) => {
              setSelectedPageUrl(url);
            }}
          />
        )}
        
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
                    recommendations={performanceData.recommendations}
                    recommendationDetails={performanceData.details}
                  />
                  <ScoreRing
                    score={scores.accessibility}
                    label="Accessibility"
                    color="--score-accessibility"
                    recommendations={accessibilityData.recommendations}
                    recommendationDetails={accessibilityData.details}
                  />
                  <ScoreRing
                    score={scores.bestpractices}
                    label="Best Practices"
                    color="--score-best-practices"
                    recommendations={bestPracticesData.recommendations}
                    recommendationDetails={bestPracticesData.details}
                  />
                  <ScoreRing
                    score={scores.seo}
                    label="SEO"
                    color="--score-seo"
                    recommendations={seoData.recommendations}
                    recommendationDetails={seoData.details}
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

            {/* AI分析セクション */}
            {data.semanticAnalysis && (
              <div className="semantic-analysis-section">
                <SemanticAnalysisComponent analysis={data.semanticAnalysis} />
              </div>
            )}

            <div className="details-section">
              <TabNavigation
                activeTab={activeTab}
                onTabChange={setActiveTab}
                issues={data.issues}
              />

              <TabContent
                activeTab={activeTab}
                issues={data.issues}
                auth={result.auth}
              />
            </div>
          </>
        )}
        
        {/* サイトリンクセクション */}
        {renderSiteLinks()}
      </div>
    </div>
  );
};