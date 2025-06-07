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
    
    // HTTPSのみ許可
    if (urlObj.protocol !== 'https:') {
      return 'Only HTTPS URLs are allowed';
    }

    // ローカルホストの確認
    if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
      return 'Localhost URLs are not allowed';
    }

    // IPアドレスの確認（簡易）
    if (/^\d+\.\d+\.\d+\.\d+$/.test(urlObj.hostname)) {
      return 'IP addresses are not allowed';
    }

    return null;
  } catch (error) {
    return 'Invalid URL format';
  }
}