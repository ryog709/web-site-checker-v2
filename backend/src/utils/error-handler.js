/**
 * APIエラーハンドリングに関するユーティリティ関数群
 */

/**
 * 標準的なAPIエラーレスポンスを生成
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {number} statusCode - HTTPステータスコード
 * @param {string} error - エラータイトル
 * @param {string} message - エラーメッセージ
 * @param {Object} additionalData - 追加データ（オプション）
 */
export function sendErrorResponse(res, statusCode, error, message, additionalData = {}) {
    const errorResponse = {
        error,
        message,
        ...additionalData
    };
    
    res.status(statusCode).json(errorResponse);
}

/**
 * バリデーションエラーを処理
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {string} validationError - バリデーションエラーメッセージ
 */
export function handleValidationError(res, validationError) {
    // エラーメッセージを日本語化
    const jpErrorMessages = {
        'URL is required': 'URLを入力してください',
        'Invalid URL format': '正しいURL形式で入力してください',
        'URL must start with http:// or https://': 'URLは http:// または https:// で始まる必要があります',
        'Invalid URL': '無効なURLです'
    };
    
    const jpMessage = jpErrorMessages[validationError] || validationError;
    sendErrorResponse(res, 400, '入力エラー', jpMessage);
}

/**
 * 内部サーバーエラーを処理
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {Error} error - エラーオブジェクト
 * @param {string} operation - 実行していた操作名
 */
export function handleInternalError(res, error, operation) {
    console.error(`${operation} Error:`, error);
    
    // 操作名を日本語化
    const operationNames = {
        'Check': 'ページチェック',
        'Crawl': 'サイトクロール',
        'Page Count': 'ページ数カウント',
        'Image Proxy': '画像取得'
    };
    
    const jpOperation = operationNames[operation] || operation;
    const errorMessage = error.message || '予期しないエラーが発生しました';
    const errorTitle = `${jpOperation}に失敗しました`;
    
    sendErrorResponse(res, 500, errorTitle, errorMessage);
}

/**
 * 非同期ルートハンドラーをラップしてエラー処理を自動化
 * @param {Function} asyncHandler - 非同期ルートハンドラー関数
 * @param {string} operation - 操作名（エラーログ用）
 * @returns {Function} エラーハンドリング付きのルートハンドラー
 */
export function asyncRouteHandler(asyncHandler, operation) {
    return async (req, res, next) => {
        try {
            await asyncHandler(req, res, next);
        } catch (error) {
            handleInternalError(res, error, operation);
        }
    };
}

/**
 * URLバリデーション付きルートハンドラー
 * @param {Function} asyncHandler - 非同期ルートハンドラー関数
 * @param {string} operation - 操作名
 * @param {string} urlField - リクエストボディ内のURLフィールド名（デフォルト: 'url'）
 * @returns {Function} バリデーション＋エラーハンドリング付きのルートハンドラー
 */
export function validateUrlRouteHandler(asyncHandler, operation, urlField = 'url') {
    return async (req, res, next) => {
        try {
            const { validateUrl } = await import('./validation.js');
            const url = req.body[urlField];
            
            // URL バリデーション
            const validationError = validateUrl(url);
            if (validationError) {
                return handleValidationError(res, validationError);
            }
            
            await asyncHandler(req, res, next);
        } catch (error) {
            handleInternalError(res, error, operation);
        }
    };
}

/**
 * 画像プロキシ用のエラーハンドリング
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {Error} error - エラーオブジェクト
 */
export function handleImageProxyError(res, error) {
    console.error('Image proxy error:', error);
    
    // ネットワークエラーか判定
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return sendErrorResponse(res, 404, '画像が見つかりません', '指定された画像が見つからないか、アクセスできません');
    }
    
    // タイムアウトエラーか判定
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
        return sendErrorResponse(res, 408, 'タイムアウトエラー', '画像の取得がタイムアウトしました');
    }
    
    // その他のエラー
    sendErrorResponse(res, 500, '画像の取得に失敗', error.message);
}

/**
 * Express ミドルウェア形式のグローバルエラーハンドラー
 * @param {Error} err - エラーオブジェクト
 * @param {Object} req - Express リクエストオブジェクト
 * @param {Object} res - Express レスポンスオブジェクト
 * @param {Function} next - 次のミドルウェア関数
 */
export function globalErrorHandler(err, req, res, next) {
    console.error('Global Error Handler:', err);
    
    // レスポンスが既に送信されている場合はスキップ
    if (res.headersSent) {
        return next(err);
    }
    
    // 開発環境ではスタックトレースも含める
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorResponse = {
        error: 'サーバーエラー',
        message: err.message || '予期しないエラーが発生しました'
    };
    
    if (isDevelopment) {
        errorResponse.stack = err.stack;
    }
    
    res.status(err.status || 500).json(errorResponse);
}