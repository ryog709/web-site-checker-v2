import { useCallback } from 'react';
import type { Issues, ImageInfo, Issue, AxeViolation, RecommendationDetail } from '../types/index.js';

interface RecommendationResult {
  recommendations: string[];
  details: RecommendationDetail[];
}

export const useRecommendationGenerator = (dataUrl: string) => {
  const getRecommendations = useCallback((category: string, score: number, issues: Issues): RecommendationResult => {
    const recommendations: string[] = [];
    const details: RecommendationDetail[] = [];

    switch (category) {
      case 'performance':
        // 大きな画像の最適化提案
        if (issues?.allImages) {
          const largeImages = issues.allImages.filter((img: ImageInfo) => 
            (img.width > 1920 || img.height > 1080) && img.filename
          );
          if (largeImages.length > 0) {
            largeImages.slice(0, 3).forEach((img: ImageInfo) => {
              recommendations.push(`大きな画像を最適化: **${img.filename}** (${img.width}×${img.height}px)`);
            });
            if (largeImages.length > 3) {
              recommendations.push(`他 ${largeImages.length - 3}個の大きな画像も最適化が必要`);
            }
          }
        }
        
        // WebP形式への変換提案（SVGファイルと既にWebP代替画像があるものは除外）
        if (issues?.allImages) {
          const nonWebPImages = issues.allImages.filter((img: ImageInfo) => 
            img.filename && 
            !img.filename.toLowerCase().includes('.webp') &&
            !img.filename.toLowerCase().includes('.svg') &&
            !img.src.toLowerCase().includes('.svg') &&
            !img.hasWebPAlternative // picture要素でWebP代替画像がある場合は除外
          );
          if (nonWebPImages.length > 3) {
            recommendations.push('WebP形式を使用して画像ファイルサイズを削減');
            details.push({
              id: 'webp-conversion',
              title: 'WebP形式への変換候補',
              description: 'これらの画像をWebP形式に変換することでファイルサイズを削減できます',
              items: nonWebPImages.slice(0, 10).map((img: ImageInfo) => ({
                filename: img.filename,
                src: img.src,
                details: `現在のサイズ: ${img.width}×${img.height}px`
              }))
            });
          }
        }

        // 遅延読み込み（lazy loading）の提案
        if (issues?.allImages) {
          const lazyLoadCandidates = (issues?.allImages || []).filter((img: ImageInfo) => 
            img.loading !== 'lazy' && img.index > 2 // 3番目以降の画像のみ
          );
          if (lazyLoadCandidates.length > 5) {
            recommendations.push('画像の遅延読み込み（lazy loading）を実装');
            details.push({
              id: 'lazy-loading',
              title: '遅延読み込み候補の画像',
              description: 'ファーストビューにない画像に loading="lazy" を追加',
              items: lazyLoadCandidates.slice(0, 8).map((img: ImageInfo) => ({
                src: img.src,
                element: `<img loading="lazy" src="${img.src}" alt="${img.alt || ''}" />`,
                details: `画像番号: ${img.index + 1}`
              }))
            });
          }
        }

        if (score < 50) {
          recommendations.push('Lighthouseパフォーマンステストでより詳細な分析を実行');
        } else if (score < 90) {
          recommendations.push('CSS・JavaScriptファイルの圧縮と統合を検討');
        }
        break;

      case 'accessibility':
        // alt属性なしの画像
        if (issues?.images) {
          const noAltImages = issues.images.filter((issue: Issue) => 
            issue.type === 'missing-alt' || issue.type === 'empty-alt'
          );
          if (noAltImages.length > 0) {
            recommendations.push(`${noAltImages.length}個の画像にalt属性を追加`);
            details.push({
              id: 'missing-alt',
              title: 'alt属性が不足している画像',
              description: 'スクリーンリーダーのためにalt属性を追加してください',
              items: noAltImages.slice(0, 10).map((issue: Issue) => {
                const element = issue.element || issue.filename || issue.src || '';
                return {
                  src: issue.src,
                  element: element,
                  details: issue.message
                };
              })
            });
          }
        }

        // axeアクセシビリティ違反の具体的な指摘
        if (issues?.accessibility?.axe) {
          issues.accessibility.axe.forEach((violation: AxeViolation) => {
            if (violation.impact === 'critical' || violation.impact === 'serious') {
              recommendations.push(`${violation.help}`);
            }
          });
        }

        // 見出し構造の問題
        if (issues?.headings) {
          const headingIssues = issues.headings.filter((issue: Issue) => 
            issue.type === 'skip-level' || issue.type === 'empty-heading'
          );
          if (headingIssues.length > 0) {
            recommendations.push('見出し構造の階層を修正（h1→h2→h3の順序で使用）');
          }
        }
        break;

      case 'seo':
        // メタタグの問題
        if (issues?.meta) {
          const titleIssues = issues.meta.filter((meta: Issue) => meta.type === 'title');
          if (titleIssues.length > 0) {
            titleIssues.forEach((issue: Issue) => {
              recommendations.push(`ページタイトル: ${issue.message}`);
            });
          }

          const descIssues = issues.meta.filter((meta: Issue) => meta.type === 'description');
          if (descIssues.length > 0) {
            descIssues.forEach((issue: Issue) => {
              recommendations.push(`メタディスクリプション: ${issue.message}`);
            });
          }
        }

        // h1タグの問題
        if (issues?.headings) {
          const h1Issues = issues.headings.filter((issue: Issue) => 
            issue.type === 'multiple-h1' || issue.type === 'missing-h1'
          );
          if (h1Issues.length > 0) {
            if (h1Issues.some(issue => issue.type === 'missing-h1')) {
              recommendations.push('ページにh1タグを追加');
            }
            if (h1Issues.some(issue => issue.type === 'multiple-h1')) {
              recommendations.push('h1タグは1ページに1つまで');
            }
          }
        }

        // リンクテキストの問題
        if (issues?.links) {
          const linkIssues = issues.links.filter((issue: Issue) => 
            issue.type === 'empty-link-text' || issue.type === 'generic-link-text'
          );
          if (linkIssues.length > 0) {
            recommendations.push('リンクテキストを具体的で分かりやすい内容に');
          }
        }
        break;

      case 'bestpractices':
        // 画像サイズの問題
        if (issues?.images) {
          const sizeIssues = issues.images.filter((issue: Issue) => 
            issue.type === 'oversized-image'
          );
          if (sizeIssues.length > 0) {
            sizeIssues.slice(0, 3).forEach((issue: Issue) => {
              recommendations.push(`画像サイズ最適化: ${issue.element}`);
            });
          }
        }

        // HTTPSの使用
        if (dataUrl && !dataUrl.startsWith('https://')) {
          recommendations.push('HTTPSの使用を推奨');
        }

        // 外部リンクのセキュリティ
        if (issues?.links) {
          const externalLinks = issues.links.filter((issue: Issue) => 
            issue.href && issue.href.startsWith('http') && !issue.href.includes(new URL(dataUrl).hostname)
          );
          if (externalLinks.length > 0) {
            recommendations.push('外部リンクにrel="noopener noreferrer"を追加');
          }
        }
        break;
    }

    return { recommendations, details };
  }, [dataUrl]);

  return { getRecommendations };
};