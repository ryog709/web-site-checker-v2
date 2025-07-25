import React, { useState, useMemo, useCallback } from 'react';
import type { CheckResult, CrawlResult, TabType, RecommendationDetail } from '../types/index.js';
import { ScoreRing } from './ScoreRing.js';
import { SummaryCards } from './SummaryCards.js';
import { TabNavigation } from './TabNavigation.js';
import { TabContent } from './TabContent.js';
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

  // 改善提案を生成（メモ化で重い計算を最適化）
  const getRecommendations = useCallback((category: string, score: number, issues: any) => {
    const recommendations: string[] = [];
    const details: RecommendationDetail[] = [];

    switch (category) {
      case 'performance':
        // 大きな画像の最適化提案
        if (issues?.allImages) {
          const largeImages = issues.allImages.filter((img: any) => 
            (img.width > 1920 || img.height > 1080) && img.filename
          );
          if (largeImages.length > 0) {
            largeImages.slice(0, 3).forEach((img: any) => {
              recommendations.push(`大きな画像を最適化: **${img.filename}** (${img.width}×${img.height}px)`);
            });
            if (largeImages.length > 3) {
              recommendations.push(`他 ${largeImages.length - 3}個の大きな画像も最適化が必要`);
            }
          }
        }
        
        // WebP形式への変換提案（SVGファイルと既にWebP代替画像があるものは除外）
        if (issues?.allImages) {
          const nonWebPImages = issues.allImages.filter((img: any) => 
            img.filename && 
            !img.filename.toLowerCase().includes('.webp') &&
            !img.filename.toLowerCase().includes('.svg') &&
            !img.src.toLowerCase().includes('.svg') &&
            !img.hasWebPAlternative // picture要素でWebP代替画像がある場合は除外
          );
          if (nonWebPImages.length > 3) {
            recommendations.push(`${nonWebPImages.length}個の画像をWebP形式に変換を検討`);
            details.push({
              id: 'webp-conversion',
              title: 'WebP形式への変換',
              description: '次の画像をWebP形式に変換することで、ファイルサイズを大幅に削減できます。（SVGファイルは除外）',
              items: nonWebPImages.slice(0, 10).map((img: any) => ({
                filename: img.filename,
                src: img.src,
                details: `現在のサイズ: ${img.width}×${img.height}px`,
                location: `img要素 (${img.index + 1}番目)${img.isInPicture ? ' - picture要素内' : ''}${img.hasWebPAlternative ? ' - WebP代替画像あり' : ''}`
              }))
            });
          }
        }

        if (score < 50) {
          recommendations.push('未使用CSSの削除');
          recommendations.push('JavaScript分割の実装');
        } else if (score < 90) {
          // header要素内の画像、SVG画像、既にlazy loading設定済みの画像、ファーストビューの画像を遅延読み込み対象から除外
          const lazyLoadCandidates = (issues?.allImages || []).filter((img: any) => 
            !img.isInHeader && 
            !img.isInNav && 
            !img.filename?.toLowerCase().includes('.svg') &&
            !img.src?.toLowerCase().includes('.svg') &&
            !img.hasLazyLoading && // 既にloading="lazy"が設定されている画像は除外
            !img.isInFirstView // ファーストビュー内の画像は除外（LCPに悪影響）
          );
          
          if (lazyLoadCandidates.length > 0) {
            recommendations.push('画像の遅延読み込み実装');
            details.push({
              id: 'lazy-loading',
              title: '画像の遅延読み込み実装',
              description: '以下の画像に遅延読み込み（lazy loading）を実装することで、初期ページ読み込み速度を向上できます。（ヘッダー・ナビゲーション内の画像、SVG画像、既にlazy loading設定済みの画像、ファーストビューの画像は除外）',
              items: lazyLoadCandidates.slice(0, 8).map((img: any) => ({
                filename: img.filename,
                src: img.src,
                element: `<img src="${img.src}" loading="lazy" alt="${img.alt}">`,
                details: 'loading="lazy"属性を追加',
                location: `${img.location || 'content'}エリアの画像${img.position ? ` (上から${Math.round(img.position.top)}px)` : ''}`
              }))
            });
          }
          
          recommendations.push('CDNの活用検討');
          details.push({
            id: 'cdn-usage',
            title: 'CDNの活用検討',
            description: '静的リソースをCDNから配信することで、読み込み速度を向上できます。',
            items: [
              {
                details: '画像ファイルをCDNから配信',
                location: '全ての画像ファイル'
              },
              {
                details: 'CSS/JavaScriptファイルをCDNから配信',
                location: '外部ライブラリファイル'
              }
            ]
          });
        }
        break;
      
      case 'accessibility':
        // alt属性がない画像の具体的な指摘
        if (issues?.images) {
          const noAltImages = issues.images.filter((issue: any) => 
            issue.type === 'no-alt' && issue.src
          );
          if (noAltImages.length > 0) {
            recommendations.push(`${noAltImages.length}個の画像にalt属性を追加`);
            details.push({
              id: 'missing-alt',
              title: 'alt属性の追加',
              description: '以下の画像にalt属性を追加して、スクリーンリーダーでも内容が伝わるようにしてください。',
              items: noAltImages.slice(0, 10).map((issue: any) => {
                const filename = issue.src.split('/').pop() || issue.src;
                return {
                  filename: filename,
                  src: issue.src,
                  element: `<img src="${issue.src}" alt="適切な説明文">`,
                  details: 'alt属性に画像の内容を説明するテキストを追加',
                  location: `${issue.position || '不明'}番目の画像`
                };
              })
            });
          }
        }

        // axeアクセシビリティ違反の具体的な指摘
        if (issues?.accessibility?.axe) {
          issues.accessibility.axe.forEach((violation: any) => {
            if (violation.impact === 'critical' || violation.impact === 'serious') {
              recommendations.push(`${violation.help}`);
            }
          });
        }

        // 見出し構造の問題
        if (issues?.headings) {
          const headingIssues = issues.headings.filter((issue: any) => 
            issue.type === 'skip-level' || issue.type === 'empty-heading'
          );
          if (headingIssues.length > 0) {
            recommendations.push('見出し構造の階層を修正（h1→h2→h3の順序で使用）');
          }
        }
        break;
      
      case 'seo':
        // メタ情報の具体的な問題
        if (issues?.meta) {
          const titleIssues = issues.meta.filter((meta: any) => meta.type === 'title');
          if (titleIssues.length > 0) {
            titleIssues.forEach((issue: any) => {
              recommendations.push(`タイトルタグを修正: ${issue.message}`);
            });
          }

          const descIssues = issues.meta.filter((meta: any) => meta.type === 'description');
          if (descIssues.length > 0) {
            descIssues.forEach((issue: any) => {
              recommendations.push(`メタディスクリプションを修正: ${issue.message}`);
            });
          }
        }

        // 見出し構造の問題
        if (issues?.headings) {
          const h1Issues = issues.headings.filter((issue: any) => 
            issue.type === 'multiple-h1' || issue.type === 'no-h1'
          );
          if (h1Issues.length > 0) {
            recommendations.push('h1タグを1つだけ適切に配置');
          }
        }

        // リンクの問題
        if (issues?.links) {
          const linkIssues = issues.links.filter((issue: any) => 
            issue.type === 'empty-link-text'
          );
          if (linkIssues.length > 0) {
            recommendations.push(`${linkIssues.length}個のリンクに適切なテキストを追加`);
          }
        }
        break;
      
      case 'bestpractices':
        // 画像のサイズ問題
        if (issues?.images) {
          const sizeIssues = issues.images.filter((issue: any) => 
            issue.type === 'no-dimensions'
          );
          if (sizeIssues.length > 0) {
            sizeIssues.slice(0, 3).forEach((issue: any) => {
              const filename = issue.src?.split('/').pop() || 'unknown';
              recommendations.push(`画像のサイズ属性を追加: **${filename}**`);
            });
            if (sizeIssues.length > 3) {
              recommendations.push(`他 ${sizeIssues.length - 3}個の画像にもサイズ属性が必要`);
            }
          }
        }

        // HTTPSの使用
        if (data.url && !data.url.startsWith('https://')) {
          recommendations.push('HTTPSの使用を推奨');
        }

        // 外部リンクのセキュリティ
        if (issues?.links) {
          const externalLinks = issues.links.filter((issue: any) => 
            issue.href && issue.href.startsWith('http') && !issue.href.includes(new URL(data.url).hostname)
          );
          if (externalLinks.length > 0) {
            recommendations.push('外部リンクにrel="noopener noreferrer"を追加');
          }
        }
        break;
    }

    return { recommendations, details };
  }, [data.url]);

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
                    (r.issues?.htmlStructure?.length || 0) +
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
              onClick={() => onCheckPage && onCheckPage(link.url)}
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