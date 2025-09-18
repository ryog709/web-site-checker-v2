/**
 * Gemini AI分析サービス
 * ビジネスロジック、回路ブレーカー、リトライ、レート制限を提供
 */

import { GeminiClient, GeminiApiError } from './geminiClient.js';
import { buildPrompt } from './promptBuilder.js';

/**
 * レート制限管理クラス
 */
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  /**
   * リクエストが許可されるかチェック
   * @returns {boolean} リクエスト許可状況
   */
  isAllowed() {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // ウィンドウ外のリクエストを削除
    this.requests = this.requests.filter(timestamp => timestamp > windowStart);

    if (this.requests.length < this.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  /**
   * 次のリクエスト可能時刻を取得
   * @returns {number} ミリ秒
   */
  getRetryAfter() {
    if (this.requests.length === 0) return 0;

    const oldestRequest = Math.min(...this.requests);
    const retryTime = oldestRequest + this.windowMs - Date.now();
    return Math.max(0, retryTime);
  }
}

/**
 * 回路ブレーカークラス
 */
class CircuitBreaker {
  constructor(failureThreshold = 5, recoveryTimeout = 60000) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.reset();
  }

  reset() {
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailure = null;
    this.nextAttempt = null;
  }

  /**
   * リクエスト実行可能かチェック
   * @returns {boolean} 実行可能かどうか
   */
  canExecute() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN状態
    return true;
  }

  /**
   * 成功時の処理
   */
  onSuccess() {
    this.reset();
  }

  /**
   * 失敗時の処理
   */
  onFailure() {
    this.failures++;
    this.lastFailure = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
    }
  }

  /**
   * 現在の状態を取得
   * @returns {Object} 回路ブレーカーの状態
   */
  getState() {
    return {
      isOpen: this.state === 'OPEN',
      failures: this.failures,
      lastFailure: this.lastFailure,
      nextAttempt: this.nextAttempt ? new Date(this.nextAttempt) : null
    };
  }
}

/**
 * Gemini分析サービス
 */
export class GeminiService {
  constructor(config) {
    this.config = config;
    this.client = new GeminiClient(config);
    this.rateLimiter = new RateLimiter(
      config.rateLimitPerMinute || 30,
      60 * 1000 // 1分
    );
    this.circuitBreaker = new CircuitBreaker();
    this.cache = new Map();
    this.cacheExpiryMs = 30 * 60 * 1000; // 30分
  }

  /**
   * Web分析を実行
   * @param {Object} analysisRequest - 分析リクエスト
   * @returns {Promise<Object>} 分析結果
   */
  async analyzeWebsite(analysisRequest) {
    const { url, lighthouseResults, axeResults, analysisType = 'content-quality' } = analysisRequest;

    // 機能が無効化されている場合は早期リターン
    if (!this.config.enabled) {
      return {
        isEnabled: false,
        error: 'Gemini analysis is disabled'
      };
    }

    // キャッシュチェック
    const cacheKey = this.generateCacheKey(analysisRequest);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return {
        geminiAnalysis: cached,
        isEnabled: true,
        cached: true
      };
    }

    // レート制限チェック
    if (!this.rateLimiter.isAllowed()) {
      throw new GeminiApiError(
        'RATE_LIMIT_EXCEEDED',
        'Too many requests. Please try again later.',
        429,
        this.rateLimiter.getRetryAfter()
      );
    }

    // 回路ブレーカーチェック
    if (!this.circuitBreaker.canExecute()) {
      const state = this.circuitBreaker.getState();
      throw new GeminiApiError(
        'CIRCUIT_BREAKER_OPEN',
        `Service temporarily unavailable. Next attempt: ${state.nextAttempt}`,
        503
      );
    }

    try {
      const startTime = Date.now();

      // プロンプト生成
      const prompt = buildPrompt(analysisType, {
        url,
        lighthouseResults,
        axeResults
      });

      // Gemini APIコール（リトライ付き）
      const response = await this.executeWithRetry(
        () => this.client.generateContent(prompt),
        3 // 最大3回リトライ
      );

      // レスポンス処理
      const analysisResult = this.processAnalysisResponse(response, analysisType);
      const processingTime = Date.now() - startTime;

      // キャッシュに保存
      this.setCache(cacheKey, analysisResult);

      // 成功を回路ブレーカーに通知
      this.circuitBreaker.onSuccess();

      return {
        geminiAnalysis: analysisResult,
        isEnabled: true,
        processingTime,
        cached: false
      };

    } catch (error) {
      // 失敗を回路ブレーカーに通知
      if (error instanceof GeminiApiError && error.isTemporary()) {
        this.circuitBreaker.onFailure();
      }

      return {
        isEnabled: true,
        error: error.message,
        errorCode: error.code || 'UNKNOWN_ERROR',
        processingTime: Date.now() - (this.lastRequestTime || Date.now())
      };
    }
  }

  /**
   * リトライ付きでfunction実行
   * @param {Function} operation - 実行する操作
   * @param {number} maxRetries - 最大リトライ回数
   * @returns {Promise<any>} 操作結果
   */
  async executeWithRetry(operation, maxRetries) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // リトライ不可能なエラーの場合は即座に失敗
        if (!(error instanceof GeminiApiError) || !error.isRetryable()) {
          throw error;
        }

        // 最後の試行の場合はエラーをスロー
        if (attempt === maxRetries) {
          throw error;
        }

        // 指数関数的バックオフ
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        await this.delay(backoffMs);
      }
    }

    throw lastError;
  }

  /**
   * 分析レスポンスを処理
   * @param {Object} response - Gemini APIレスポンス
   * @param {string} analysisType - 分析タイプ
   * @returns {Object} 処理された分析結果
   */
  processAnalysisResponse(response, analysisType) {
    const baseResult = {
      generatedAt: response.generatedAt,
      modelUsed: response.model,
      tokensUsed: response.tokensUsed
    };

    // JSON形式の場合は構造化データとして処理
    if (typeof response.content === 'object' && response.content !== null) {
      switch (analysisType) {
        case 'content-quality':
          return {
            ...baseResult,
            contentQuality: {
              score: response.content.score || 0,
              improvements: response.content.improvements || [],
              details: response.content.details || ''
            }
          };

        case 'usability':
          return {
            ...baseResult,
            usabilityInsights: {
              score: response.content.score || 0,
              recommendations: response.content.recommendations || [],
              details: response.content.details || ''
            }
          };

        case 'comprehensive':
          return {
            ...baseResult,
            comprehensiveAnalysis: {
              overallScore: response.content.overallScore || 0,
              strengths: response.content.strengths || [],
              weaknesses: response.content.weaknesses || [],
              priorityActions: response.content.priorityActions || [],
              detailedReport: response.content.detailedReport || ''
            }
          };
      }
    }

    // テキスト形式の場合は単純な形式で返す
    return {
      ...baseResult,
      textAnalysis: response.rawContent
    };
  }

  /**
   * キャッシュキーを生成
   * @param {Object} request - リクエストオブジェクト
   * @returns {string} キャッシュキー
   */
  generateCacheKey(request) {
    const keyData = {
      url: request.url,
      analysisType: request.analysisType,
      // Lighthouseスコアをキーに含めて、スコア変更時は新しい分析を実行
      scores: {
        performance: request.lighthouseResults?.performance?.score,
        accessibility: request.lighthouseResults?.accessibility?.score,
        seo: request.lighthouseResults?.seo?.score
      }
    };

    return Buffer.from(JSON.stringify(keyData)).toString('base64');
  }

  /**
   * キャッシュから取得
   * @param {string} key - キャッシュキー
   * @returns {Object|null} キャッシュされたデータ
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.cacheExpiryMs) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * キャッシュに保存
   * @param {string} key - キャッシュキー
   * @param {Object} data - 保存するデータ
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // キャッシュサイズ制限 (100エントリー)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  /**
   * サービス状態を取得
   * @returns {Object} サービス状態
   */
  getStatus() {
    return {
      enabled: this.config.enabled,
      model: this.config.model,
      circuitBreaker: this.circuitBreaker.getState(),
      cacheSize: this.cache.size,
      rateLimitRemaining: this.config.rateLimitPerMinute - this.rateLimiter.requests.length
    };
  }

  /**
   * 接続テスト
   * @returns {Promise<boolean>} 接続成功かどうか
   */
  async testConnection() {
    if (!this.config.enabled) return false;

    try {
      return await this.client.testConnection();
    } catch (error) {
      console.warn('Gemini service connection test failed:', error.message);
      return false;
    }
  }

  /**
   * 指定時間待機
   * @param {number} ms - 待機時間（ミリ秒）
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 回路ブレーカーをリセット
   */
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}