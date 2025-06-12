/**
 * URL バリデーション
 * @param {string} url - 検証するURL
 * @returns {string|null} エラーメッセージまたはnull
 */
export function validateUrl(url) {
  if (!url) {
    return 'URL is required';
  }

  if (typeof url !== 'string') {
    return 'URL must be a string';
  }

  try {
    const urlObj = new URL(url);
    
    // HTTPとHTTPSを許可
    if (urlObj.protocol !== 'https:' && urlObj.protocol !== 'http:') {
      return 'Only HTTP and HTTPS URLs are allowed';
    }

    // ローカルホストとIPアドレスを許可（開発用）
    // 本番環境では別途制限を設ける場合は環境変数で制御

    return null;
  } catch (error) {
    return 'Invalid URL format';
  }
}