/**
 * Gemini AI設定管理
 */

/**
 * Gemini設定を取得
 * @returns {Object} Gemini設定オブジェクト
 */
export function getGeminiConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    enabled: process.env.GEMINI_ENABLED === 'true',
    rateLimitPerMinute: parseInt(process.env.GEMINI_RATE_LIMIT_PER_MINUTE) || 30,
    timeout: parseInt(process.env.GEMINI_TIMEOUT) || 30000,
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS) || 4096,
    temperature: parseFloat(process.env.GEMINI_TEMPERATURE) || 0.7
  };
}

/**
 * Gemini設定が有効かどうか検証
 * @returns {boolean} 設定が有効かどうか
 */
export function isGeminiConfigValid() {
  const config = getGeminiConfig();

  if (!config.enabled) {
    return false;
  }

  if (!config.apiKey || config.apiKey === 'your_gemini_api_key_here') {
    console.warn('Gemini API key is not configured properly');
    return false;
  }

  return true;
}

/**
 * Gemini設定の詳細検証
 * @returns {Object} 検証結果
 */
export function validateGeminiConfig() {
  const config = getGeminiConfig();
  const errors = [];
  const warnings = [];

  // 必須項目チェック
  if (!config.apiKey) {
    errors.push('GEMINI_API_KEY is required');
  } else if (config.apiKey === 'your_gemini_api_key_here') {
    errors.push('GEMINI_API_KEY must be set to a valid API key');
  }

  // 数値範囲チェック
  if (config.rateLimitPerMinute < 1 || config.rateLimitPerMinute > 100) {
    warnings.push('GEMINI_RATE_LIMIT_PER_MINUTE should be between 1 and 100');
  }

  if (config.timeout < 1000 || config.timeout > 60000) {
    warnings.push('GEMINI_TIMEOUT should be between 1000ms and 60000ms');
  }

  if (config.maxTokens < 512 || config.maxTokens > 8192) {
    warnings.push('GEMINI_MAX_TOKENS should be between 512 and 8192');
  }

  if (config.temperature < 0 || config.temperature > 1) {
    warnings.push('GEMINI_TEMPERATURE should be between 0 and 1');
  }

  // モデル名チェック
  const supportedModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  if (!supportedModels.includes(config.model)) {
    warnings.push(`GEMINI_MODEL should be one of: ${supportedModels.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}