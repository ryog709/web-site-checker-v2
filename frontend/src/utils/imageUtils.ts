/**
 * 画像表示に関するユーティリティ関数
 */

import type { BasicAuth } from '../types/index.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * 外部画像URLをプロキシ経由で表示するURLに変換
 * @param originalUrl - 元の画像URL
 * @param auth - ベーシック認証情報（オプション）
 * @returns プロキシ経由のURL
 */
export function getProxiedImageUrl(originalUrl: string, auth?: BasicAuth): string {
  if (!originalUrl || originalUrl === 'undefined') {
    return '';
  }

  // データURLやローカルファイルはそのまま返す
  if (originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) {
    return originalUrl;
  }

  // 相対URLや無効なURLの場合は空文字を返す
  try {
    new URL(originalUrl);
  } catch {
    return '';
  }

  // プロキシ経由のURLを生成
  let proxyUrl = `${API_BASE_URL}/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
  
  // ベーシック認証情報があれば追加
  if (auth && auth.username && auth.password) {
    const authString = `${auth.username}:${auth.password}`;
    const encodedAuth = btoa(authString); // Base64エンコード
    proxyUrl += `&auth=${encodeURIComponent(encodedAuth)}`;
  }
  
  return proxyUrl;
}

/**
 * 画像が有効かどうかをチェック
 * @param url - 画像URL
 * @returns 有効かどうか
 */
export function isValidImageUrl(url: string): boolean {
  if (!url || url === 'undefined' || url === 'null') {
    return false;
  }

  // データURLは有効
  if (url.startsWith('data:image/')) {
    return true;
  }

  // HTTPSかHTTPのURLかチェック
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 画像のファイル名を取得
 * @param url - 画像URL
 * @returns ファイル名
 */
export function getImageFilename(url: string): string {
  if (!url) {
    return 'unknown';
  }

  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    return filename || 'unknown';
  } catch {
    return url.split('/').pop() || 'unknown';
  }
}