/**
 * Legacy Result Mapper
 * 
 * 新パイプライン出力を旧API `/api/check` レスポンス形式に変換
 * 
 * @module legacyResultMapper
 */

import { normalizeUrl } from '../../../utils/url-utils.js';

/**
 * パイプライン結果を旧APIレスポンス形式に変換
 * 
 * @param {Object} pipelineResult - パイプライン実行結果
 * @param {Object} pipelineResult.context - 実行コンテキスト
 * @param {string} pipelineResult.context.url - 分析対象URL
 * @param {Object|null} pipelineResult.context.auth - Basic認証情報
 * @param {Object|null} pipelineResult.lighthouse - Lighthouse分析結果
 * @param {Object|null} pipelineResult.dom - DOM解析結果
 * @param {Object|null} pipelineResult.axe - axe-core分析結果
 * @param {Object|null} pipelineResult.gemini - Gemini分析結果
 * @param {Object|null} pipelineResult.browser - ブラウザ監視結果
 * @returns {Object} 旧API形式のレスポンス
 */
export function mapPipelineResultToLegacy(pipelineResult) {
  console.log('[legacyResultMapper] mapPipelineResultToLegacy called', {
    hasLighthouse: !!pipelineResult.lighthouse,
    hasDom: !!pipelineResult.dom,
    hasAxe: !!pipelineResult.axe,
    hasGemini: !!pipelineResult.gemini,
    hasBrowser: !!pipelineResult.browser
  });

  const response = {
    url: pipelineResult.context.url,
    timestamp: new Date().toISOString(),
    scores: mapLighthouseScores(pipelineResult.lighthouse, pipelineResult.dom),
    issues: mapIssuesBundle(pipelineResult),
    siteLinks: mapSiteLinks(pipelineResult.dom?.links || [], pipelineResult.context.url),
    semanticAnalysis: mapSemanticAnalysis(pipelineResult.gemini),
    auth: pipelineResult.context.auth || null
  };

  console.log('[legacyResultMapper] Response structure created', {
    hasScores: !!response.scores,
    issueCategories: Object.keys(response.issues),
    siteLinksCount: response.siteLinks.length,
    hasSemanticAnalysis: !!response.semanticAnalysis
  });

  return response;
}

/**
 * Lighthouseスコア変換（フォールバック含む）
 * 
 * @param {Object|null} lighthouseResult - Lighthouse分析結果
 * @param {Object|null} domResult - DOM解析結果（フォールバック用）
 * @returns {Object} 旧API形式のスコア
 */
export function mapLighthouseScores(lighthouseResult, domResult) {
  console.log('[legacyResultMapper] mapLighthouseScores called', {
    hasLighthouse: !!lighthouseResult,
    hasCategories: !!lighthouseResult?.categories
  });

  if (lighthouseResult?.categories) {
    const scores = {
      performance: Math.round((lighthouseResult.categories.performance?.score || 0) * 100),
      accessibility: Math.round((lighthouseResult.categories.accessibility?.score || 0) * 100),
      bestpractices: Math.round((lighthouseResult.categories['best-practices']?.score || 0) * 100),
      seo: Math.round((lighthouseResult.categories.seo?.score || 0) * 100)
    };

    console.log('[legacyResultMapper] Lighthouse scores mapped', scores);
    return scores;
  }

  // フォールバック: calculateBasicScores相当
  console.log('[legacyResultMapper] Using fallback scores from DOM');
  return calculateBasicScoresFromDom(domResult);
}

/**
 * DOM解析結果から簡易スコア算出（フォールバック）
 * checker.js の calculateBasicScores ロジックを移植
 * 
 * @param {Object|null} domResult - DOM解析結果
 * @param {Object} domResult.metrics - パフォーマンス・SEO・アクセシビリティのメトリクス
 * @param {number} domResult.metrics.loadTimeMs - ページ読み込み時間（ミリ秒）
 * @param {boolean} domResult.metrics.hasTitle - titleタグの有無
 * @param {boolean} domResult.metrics.hasDescription - meta descriptionの有無
 * @param {boolean} domResult.metrics.hasH1 - h1タグの有無
 * @param {number} domResult.metrics.imagesWithoutAlt - alt属性なし画像数
 * @param {number} domResult.metrics.totalImages - 総画像数
 * @param {number} domResult.metrics.resourceCount - リソース数
 * @returns {Object} 簡易スコア
 */
function calculateBasicScoresFromDom(domResult) {
  console.log('[legacyResultMapper] calculateBasicScoresFromDom called', {
    hasMetrics: !!domResult?.metrics
  });

  // metricsがない場合はデフォルト値を返す
  if (!domResult?.metrics) {
    const defaultScores = {
      performance: 75,
      accessibility: 70,
      bestpractices: 75,
      seo: 70
    };
    console.log('[legacyResultMapper] No metrics available, using defaults', defaultScores);
    return defaultScores;
  }

  const metrics = domResult.metrics;

  // スコア算出（checker.js と同じロジック）
  const performance = Math.max(0, 100 - Math.floor((metrics.loadTimeMs || 0) / 50)); // 5秒で0点
  const accessibility = Math.max(0, 100 - ((metrics.imagesWithoutAlt || 0) * 10));
  const seo = (metrics.hasTitle ? 40 : 0) + (metrics.hasDescription ? 40 : 0) + (metrics.hasH1 ? 20 : 0);
  const bestpractices = Math.max(0, 100 - Math.max(0, (metrics.resourceCount || 0) - 50)); // 50リソース超で減点

  const scores = {
    performance,
    accessibility,
    bestpractices,
    seo
  };

  console.log('[legacyResultMapper] Scores calculated from DOM metrics', {
    metrics,
    scores
  });

  return scores;
}

/**
 * Issues統合
 * 
 * @param {Object} pipelineResult - パイプライン実行結果
 * @returns {Object} 旧API形式のissuesバンドル
 */
export function mapIssuesBundle(pipelineResult) {
  console.log('[legacyResultMapper] mapIssuesBundle called');

  const issues = {
    headings: pipelineResult.dom?.headingIssues || [],
    headingsStructure: pipelineResult.dom?.headingStructure || [],
    images: pipelineResult.dom?.imageIssues || [],
    allImages: pipelineResult.dom?.imageDetails || [],
    links: pipelineResult.dom?.linkIssues || [],
    meta: pipelineResult.dom?.metaIssues || [],
    allMeta: pipelineResult.dom?.metaDetails || [],
    htmlStructure: pipelineResult.dom?.htmlStructureIssues || [],
    accessibility: {
      lighthouse: pipelineResult.lighthouse?.accessibilityIssues || [],
      axe: pipelineResult.axe?.violations || []
    },
    consoleErrors: pipelineResult.browser?.consoleErrors || []
  };

  console.log('[legacyResultMapper] Issues bundle created', {
    headingsCount: issues.headings.length,
    imagesCount: issues.images.length,
    linksCount: issues.links.length,
    axeViolationsCount: issues.accessibility.axe.length,
    consoleErrorsCount: issues.consoleErrors.length
  });

  return issues;
}

/**
 * サイトリンク変換
 * 
 * @param {Array} links - DOM解析で取得したリンク配列
 * @param {string} baseUrl - ベースURL（同一ドメイン判定用）
 * @returns {Array} 旧API形式のsiteLinks配列
 */
export function mapSiteLinks(links, baseUrl) {
  console.log('[legacyResultMapper] mapSiteLinks called', {
    inputLinksCount: links.length,
    baseUrl
  });

  const baseUrlObj = new URL(baseUrl);
  
  const siteLinks = links
    .filter(link => {
      try {
        const linkUrlObj = new URL(link.url, baseUrl);
        return linkUrlObj.hostname === baseUrlObj.hostname;
      } catch {
        return false;
      }
    })
    .filter(link => !isWordPressSpecialUrl(link.url))
    .map(link => ({
      url: normalizeUrl(link.url),
      text: (link.text || '').substring(0, 100),
      title: (link.title || '').substring(0, 100)
    }))
    .slice(0, 20);

  console.log('[legacyResultMapper] Site links filtered and mapped', {
    outputLinksCount: siteLinks.length
  });

  return siteLinks;
}

/**
 * WordPress特殊URL判定
 * 
 * @param {string} url - 判定対象URL
 * @returns {boolean} 特殊URLの場合true
 */
function isWordPressSpecialUrl(url) {
  const specialPatterns = ['/feed/', '/comments/', '/trackback/'];
  return specialPatterns.some(pattern => url.includes(pattern));
}

/**
 * Gemini分析結果変換
 * 
 * @param {Object|null} geminiResult - Gemini分析結果
 * @returns {Object} 旧API形式のsemanticAnalysis
 */
export function mapSemanticAnalysis(geminiResult) {
  console.log('[legacyResultMapper] mapSemanticAnalysis called', {
    hasGeminiResult: !!geminiResult,
    hasError: !!geminiResult?.error
  });

  if (!geminiResult || geminiResult.error) {
    const errorResponse = {
      isEnabled: true,
      error: geminiResult?.error || 'Gemini analysis failed',
      errorCode: geminiResult?.errorCode || 'UNKNOWN_ERROR'
    };

    console.log('[legacyResultMapper] Semantic analysis error response', errorResponse);
    return errorResponse;
  }

  const successResponse = {
    isEnabled: true,
    geminiAnalysis: geminiResult.geminiAnalysis,
    processingTime: geminiResult.processingTime,
    cached: geminiResult.cached
  };

  console.log('[legacyResultMapper] Semantic analysis success response', {
    hasGeminiAnalysis: !!successResponse.geminiAnalysis,
    processingTime: successResponse.processingTime,
    cached: successResponse.cached
  });

  return successResponse;
}