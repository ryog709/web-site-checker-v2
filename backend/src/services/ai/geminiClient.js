/**
 * Gemini API直接通信クライアント
 * HTTPリクエスト送信とレスポンス処理を担当
 */

import fetch from 'node-fetch';

/**
 * Gemini APIクライアント
 */
export class GeminiClient {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-1.5-flash';
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.timeout = config.timeout || 30000; // 30秒
    this.maxTokens = config.maxTokens || 4096;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * テキスト生成リクエストを送信
   * @param {Object} prompt - プロンプトオブジェクト
   * @param {string} prompt.system - システムプロンプト
   * @param {string} prompt.user - ユーザープロンプト
   * @returns {Promise<Object>} APIレスポンス
   * @throws {GeminiApiError} API呼び出しエラー
   */
  async generateContent(prompt) {
    const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: prompt.system },
            { text: prompt.user }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: this.maxTokens,
        temperature: this.temperature,
        topP: 0.8,
        topK: 40
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE'
        }
      ]
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebSiteChecker/2.0'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // レスポンス処理
      const responseData = await response.json();

      if (!response.ok) {
        throw this.createApiError(response.status, responseData);
      }

      return this.parseSuccessResponse(responseData);

    } catch (error) {
      if (error.name === 'AbortError') {
        throw this.createTimeoutError();
      }
      if (error instanceof GeminiApiError) {
        throw error;
      }
      throw this.createNetworkError(error);
    }
  }

  /**
   * 成功レスポンスをパース
   * @param {Object} responseData - APIレスポンスデータ
   * @returns {Object} パースされたレスポンス
   */
  parseSuccessResponse(responseData) {
    try {
      const candidate = responseData.candidates?.[0];
      if (!candidate) {
        throw new Error('No valid response candidate found');
      }

      const content = candidate.content?.parts?.[0]?.text;
      if (!content) {
        throw new Error('No content in response');
      }

      // Geminiが```json```で囲んだレスポンスをクリーンアップ
      let cleanedContent = content.trim();
      if (cleanedContent.startsWith('```json')) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }

      // JSONレスポンスの場合はパースを試行
      let parsedContent;
      try {
        parsedContent = JSON.parse(cleanedContent);
      } catch (jsonError) {
        // JSONでない場合はそのまま文字列として扱う
        parsedContent = { text: cleanedContent };
      }

      return {
        content: parsedContent,
        rawContent: content,
        model: this.model,
        finishReason: candidate.finishReason,
        safetyRatings: candidate.safetyRatings,
        tokensUsed: this.estimateTokens(content),
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      throw new GeminiApiError(
        'RESPONSE_PARSING_ERROR',
        `Failed to parse Gemini response: ${error.message}`,
        500
      );
    }
  }

  /**
   * APIエラーを作成
   * @param {number} status - HTTPステータス
   * @param {Object} responseData - エラーレスポンス
   * @returns {GeminiApiError} APIエラー
   */
  createApiError(status, responseData) {
    const errorMessage = responseData.error?.message || 'Unknown API error';
    const errorCode = responseData.error?.code || 'UNKNOWN_ERROR';

    let code;
    let retryAfter;

    switch (status) {
      case 400:
        code = 'INVALID_REQUEST';
        break;
      case 401:
        code = 'AUTHENTICATION_ERROR';
        break;
      case 403:
        code = 'PERMISSION_DENIED';
        break;
      case 429:
        code = 'RATE_LIMIT_EXCEEDED';
        retryAfter = this.extractRetryAfter(responseData);
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        code = 'SERVER_ERROR';
        break;
      default:
        code = 'API_ERROR';
    }

    const error = new GeminiApiError(code, errorMessage, status);
    if (retryAfter) {
      error.retryAfter = retryAfter;
    }
    return error;
  }

  /**
   * タイムアウトエラーを作成
   * @returns {GeminiApiError} タイムアウトエラー
   */
  createTimeoutError() {
    return new GeminiApiError(
      'TIMEOUT_ERROR',
      `Request timed out after ${this.timeout}ms`,
      408
    );
  }

  /**
   * ネットワークエラーを作成
   * @param {Error} originalError - 元のエラー
   * @returns {GeminiApiError} ネットワークエラー
   */
  createNetworkError(originalError) {
    return new GeminiApiError(
      'NETWORK_ERROR',
      `Network error: ${originalError.message}`,
      0
    );
  }

  /**
   * Retry-Afterヘッダーからリトライ時間を抽出
   * @param {Object} responseData - レスポンスデータ
   * @returns {number|null} リトライまでの秒数
   */
  extractRetryAfter(responseData) {
    // Gemini APIのレスポンス形式に応じて調整
    const retryAfter = responseData.error?.details?.retryAfter;
    return retryAfter ? parseInt(retryAfter, 10) : 60; // デフォルト1分
  }

  /**
   * 簡易的なトークン数推定
   * @param {string} text - テキスト
   * @returns {number} 推定トークン数
   */
  estimateTokens(text) {
    // 簡易的な推定: 日本語の場合は1文字≈1トークン、英語は4文字≈1トークン
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
    const otherChars = text.length - japaneseChars;
    return Math.ceil(japaneseChars + otherChars / 4);
  }

  /**
   * API接続テスト
   * @returns {Promise<boolean>} 接続成功かどうか
   */
  async testConnection() {
    try {
      const testPrompt = {
        system: 'You are a helpful assistant.',
        user: 'Say "connection test successful" in Japanese.'
      };

      await this.generateContent(testPrompt);
      return true;
    } catch (error) {
      console.warn('Gemini API connection test failed:', error.message);
      return false;
    }
  }
}

/**
 * Gemini API専用エラークラス
 */
export class GeminiApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.name = 'GeminiApiError';
    this.code = code;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }

  /**
   * エラーがリトライ可能かどうか判定
   * @returns {boolean} リトライ可能かどうか
   */
  isRetryable() {
    const retryableCodes = [
      'RATE_LIMIT_EXCEEDED',
      'SERVER_ERROR',
      'NETWORK_ERROR',
      'TIMEOUT_ERROR'
    ];
    return retryableCodes.includes(this.code);
  }

  /**
   * エラーが一時的かどうか判定
   * @returns {boolean} 一時的なエラーかどうか
   */
  isTemporary() {
    const temporaryCodes = [
      'RATE_LIMIT_EXCEEDED',
      'SERVER_ERROR',
      'TIMEOUT_ERROR'
    ];
    return temporaryCodes.includes(this.code);
  }
}