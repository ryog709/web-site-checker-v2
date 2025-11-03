/**
 * Analysis Pipeline
 *
 * 各アナライザを統合し、旧API互換のレスポンスを生成
 *
 * @module AnalysisPipeline
 */

import { checkSinglePage } from '../../checker.js';
import { analyzeLayout } from '../analyzers/layoutAnalyzer.js';
import { analyzeW3C } from '../analyzers/w3cAnalyzer.js';
import { analyzeForms } from '../analyzers/formAnalyzer.js';
import { analyzeMetadata } from '../analyzers/metadataAnalyzer.js';

/**
 * パイプライン実行
 *
 * @param {string} url - 分析対象URL
 * @param {Object|null} auth - Basic認証情報
 * @param {Object} [options]
 * @param {boolean} [options.includeEnhancements=true] - 追加アナライザを実行するか
 * @param {Object|null} [options.baselineResult=null] - 既存のlegacy結果がある場合は再利用
 * @returns {Promise<Object>} 旧API形式のレスポンス
 */
export async function run(url, auth = null, options = {}) {
  const { includeEnhancements = true, baselineResult = null } = options;

  console.log('[AnalysisPipeline] Starting analysis pipeline', {
    url,
    hasAuth: !!auth,
    includeEnhancements,
    hasBaseline: !!baselineResult,
  });

  try {
    const legacyResult = baselineResult ?? (await checkSinglePage(url, auth));

    const issues = { ...legacyResult.issues };

    if (includeEnhancements) {
      const [layout, w3cValidation, forms, metadata] = await Promise.all([
        analyzeLayout({ url, auth }).catch(err => ({ error: err.message, errorCode: 'LAYOUT_FAILED' })),
        analyzeW3C({ url, auth }).catch(err => ({ error: err.message, errorCode: 'W3C_VALIDATION_FAILED' })),
        analyzeForms({ url, auth }).catch(err => ({ error: err.message, errorCode: 'FORM_ANALYSIS_FAILED' })),
        analyzeMetadata({ url, auth }).catch(err => ({ error: err.message, errorCode: 'METADATA_ANALYSIS_FAILED' })),
      ]);

      if (layout) {
        issues.layout = layout;
      }

      if (forms) {
        issues.forms = forms;
      }

      if (metadata) {
        issues.metadata = metadata;
      }

      if (w3cValidation) {
        issues.validation = {
          ...(legacyResult.issues?.validation ?? {}),
          w3c: w3cValidation,
        };
      }
    }

    return {
      ...legacyResult,
      issues,
    };
  } catch (error) {
    console.error('[AnalysisPipeline] Pipeline execution failed', error);
    throw error;
  }
}
