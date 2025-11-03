/**
 * Analysis Pipeline
 *
 * 各アナライザを統合し、旧API互換のレスポンスを生成
 *
 * @module AnalysisPipeline
 */

import { mapPipelineResultToLegacy } from '../core/legacyResultMapper.js';

/**
 * パイプライン実行
 *
 * @param {string} url - 分析対象URL
 * @param {Object|null} auth - Basic認証情報
 * @returns {Promise<Object>} 旧API形式のレスポンス
 */
export async function run(url, auth = null) {
  console.log('[AnalysisPipeline] Starting analysis pipeline', { url, hasAuth: !!auth });

  // コンテキスト作成
  const context = {
    url,
    auth: auth || null
  };

  try {
    // 各アナライザを並列実行（現在はスタブ）
    const [lighthouse, dom, axe, gemini, browser] = await Promise.all([
      analyzeLighthouse(url).catch(err => ({ error: err.message, errorCode: 'LIGHTHOUSE_FAILED' })),
      analyzeDom(url).catch(err => ({ error: err.message, errorCode: 'DOM_FAILED' })),
      analyzeAxe(url).catch(err => ({ error: err.message, errorCode: 'AXE_FAILED' })),
      analyzeGemini(url).catch(err => ({ error: err.message, errorCode: 'GEMINI_FAILED' })),
      analyzeBrowser(url).catch(err => ({ error: err.message, errorCode: 'BROWSER_FAILED' }))
    ]);

    // パイプライン結果統合
    const pipelineResult = {
      context,
      lighthouse,
      dom,
      axe,
      gemini,
      browser
    };

    console.log('[AnalysisPipeline] Analysis completed', {
      hasLighthouse: !lighthouse?.error,
      hasDom: !dom?.error,
      hasAxe: !axe?.error,
      hasGemini: !gemini?.error,
      hasBrowser: !browser?.error
    });

    // 旧API形式に変換
    return mapPipelineResultToLegacy(pipelineResult);
  } catch (error) {
    console.error('[AnalysisPipeline] Pipeline execution failed', error);
    throw error;
  }
}

/**
 * Lighthouse分析（スタブ）
 *
 * @param {string} url - 分析対象URL
 * @returns {Promise<Object>} Lighthouse分析結果
 */
async function analyzeLighthouse(url) {
  console.log('[AnalysisPipeline:Lighthouse] Stub analyzer called', { url });

  // スタブ: Lighthouse categories 構造を返す
  return {
    categories: {
      performance: { score: 0.85 },
      accessibility: { score: 0.92 },
      'best-practices': { score: 0.88 },
      seo: { score: 0.95 }
    },
    accessibilityIssues: []
  };
}

/**
 * DOM解析（スタブ）
 *
 * @param {string} url - 分析対象URL
 * @returns {Promise<Object>} DOM解析結果
 */
async function analyzeDom(url) {
  console.log('[AnalysisPipeline:DOM] Stub analyzer called', { url });

  // スタブ: metrics + issues + links 構造を返す
  return {
    metrics: {
      loadTimeMs: 1500,
      hasTitle: true,
      hasDescription: true,
      hasH1: true,
      imagesWithoutAlt: 2,
      totalImages: 10,
      resourceCount: 35
    },
    headingIssues: [],
    headingStructure: [
      { level: 1, text: 'Example Heading', position: 0 }
    ],
    imageIssues: [
      {
        type: 'missing-alt',
        src: 'https://example.com/image1.jpg',
        message: 'Image missing alt attribute'
      }
    ],
    imageDetails: [
      {
        src: 'https://example.com/image1.jpg',
        alt: '',
        width: 800,
        height: 600,
        position: 'top'
      }
    ],
    linkIssues: [],
    links: [
      {
        url: url,
        text: 'Home',
        title: 'Homepage'
      }
    ],
    metaIssues: [],
    metaDetails: [
      { name: 'description', content: 'Example description' }
    ],
    htmlStructureIssues: []
  };
}

/**
 * axe-core分析（スタブ）
 *
 * @param {string} url - 分析対象URL
 * @returns {Promise<Object>} axe-core分析結果
 */
async function analyzeAxe(url) {
  console.log('[AnalysisPipeline:Axe] Stub analyzer called', { url });

  // スタブ: violations 構造を返す
  return {
    violations: [
      {
        id: 'color-contrast',
        impact: 'serious',
        description: 'Elements must have sufficient color contrast',
        nodes: [
          {
            html: '<button>Click me</button>',
            target: ['button'],
            failureSummary: 'Fix any of the following:\n  Element has insufficient color contrast'
          }
        ]
      }
    ]
  };
}

/**
 * Gemini分析（スタブ）
 *
 * @param {string} url - 分析対象URL
 * @returns {Promise<Object>} Gemini分析結果
 */
async function analyzeGemini(url) {
  console.log('[AnalysisPipeline:Gemini] Stub analyzer called', { url });

  // スタブ: geminiAnalysis + メタデータ構造を返す
  return {
    geminiAnalysis: {
      contentQuality: {
        score: 85,
        improvements: ['Consider adding more detailed headings'],
        details: 'Overall content quality is good'
      }
    },
    processingTime: 250,
    cached: false
  };
}

/**
 * Browser分析（スタブ）
 *
 * @param {string} url - 分析対象URL
 * @returns {Promise<Object>} Browser分析結果
 */
async function analyzeBrowser(url) {
  console.log('[AnalysisPipeline:Browser] Stub analyzer called', { url });

  // スタブ: consoleErrors 構造を返す
  return {
    consoleErrors: [
      {
        type: 'console',
        level: 'error',
        message: 'Example console error',
        timestamp: new Date().toISOString()
      }
    ]
  };
}