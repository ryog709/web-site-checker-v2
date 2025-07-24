/**
 * URL処理に関するユーティリティ関数群
 */

/**
 * 相対URLを絶対URLに変換する
 * @param {string} src - 変換対象のURL
 * @param {string} baseUrl - ベースURL
 * @returns {string} 絶対URL
 */
export function resolveAbsoluteUrl(src, baseUrl) {
    if (!src) return '';
    
    // すでに絶対URLまたはdata URLの場合はそのまま返す
    if (src.startsWith('http') || src.startsWith('data:')) {
        return src;
    }
    
    try {
        return new URL(src, baseUrl || 'https://example.com').href;
    } catch (error) {
        try {
            // フォールバック: プロトコルとホストを追加して再試行
            return new URL(src, baseUrl || 'https://example.com').href;
        } catch (fallbackError) {
            console.warn('URL解決に失敗:', src, fallbackError.message);
            return src; // 変換できない場合は元のURLを返す
        }
    }
}

/**
 * URLが有効かどうかをチェック
 * @param {string} url - チェック対象のURL
 * @returns {boolean} 有効な場合true
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * HTTPまたはHTTPS URLかどうかをチェック
 * @param {string} url - チェック対象のURL
 * @returns {boolean} HTTPまたはHTTPS URLの場合true
 */
export function isHttpUrl(url) {
    return typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));
}

/**
 * URLから同一ドメインのリンクのみをフィルタリング
 * @param {Array} links - リンクの配列
 * @param {string} baseUrl - ベースURL
 * @returns {Array} 同一ドメインのリンクのみ
 */
export function filterSameDomainLinks(links, baseUrl) {
    if (!isValidUrl(baseUrl)) return [];
    
    try {
        const baseDomain = new URL(baseUrl).hostname;
        
        return links.filter(link => {
            if (!link.href || !isHttpUrl(link.href)) return false;
            
            try {
                const linkDomain = new URL(link.href).hostname;
                return linkDomain === baseDomain;
            } catch {
                return false;
            }
        });
    } catch {
        return [];
    }
}

/**
 * WordPress特有のURLパターンを除外
 * @param {Array} urls - URL配列
 * @returns {Array} フィルタリング後のURL配列
 */
export function filterWordPressUrls(urls) {
    const wpExcludePatterns = [
        // WordPress管理・システム系
        /\/wp-admin\//,
        /\/wp-content\//,
        /\/wp-includes\//,
        /\/wp-json\//,
        /\/wp-sitemap/i,
        /\/xmlrpc\.php/i,
        
        // アーカイブ・ページネーション系
        /\/page\/\d+/i,
        /\/paged\/\d+/i,
        /\/category\//i,
        /\/tag\//i,
        /\/author\//i,
        /\/\d{4}\/\d{2}\//i, // 日付アーカイブ
        /\/\d{4}\/$/i, // 年アーカイブ
        /\/trackback/i,
        /\/comment-page-\d+/i,
        /\/attachment\//i,
        /\/embed\//i,
        
        // クエリパラメータ系
        /\?attachment_id=/,
        /\?author=/,
        /\?cat=/,
        /\?tag=/,
        /\?m=\d+/,
        /\?p=\d+/,
        /\?page_id=/,
        /\?s=/,
        /\?page=/,
        /\?paged=/,
        /\?replytocom=/,
        
        // ログイン・フィード系
        /wp-login\.php/,
        /wp-register\.php/,
        /\/feed\//,
        /\/rss/
    ];
    
    return urls.filter(url => {
        return !wpExcludePatterns.some(pattern => pattern.test(url));
    });
}

/**
 * 特殊なパスパターンを除外
 * @param {Array} urls - URL配列
 * @returns {Array} フィルタリング後のURL配列
 */
export function filterSpecialPaths(urls) {
    const excludePatterns = [
        '/admin/', '/login', '/logout',
        '/search', '/contact', '/mailto:', '/tel:',
        '/feed', '/rss', '/api/', '/.well-known/'
    ];
    
    return urls.filter(url => {
        const lowerUrl = url.toLowerCase();
        return !excludePatterns.some(pattern => lowerUrl.includes(pattern));
    });
}

/**
 * 日本語エンコードされたURLを除外
 * @param {Array} urls - URL配列
 * @returns {Array} フィルタリング後のURL配列
 */
export function filterJapaneseEncodedUrls(urls) {
    return urls.filter(url => {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname;
            
            const hasEncodedChars = /%[0-9a-f]{2}/i.test(path);
            if (!hasEncodedChars) return true;
            
            // %e3で始まるものは日本語のひらがな・カタカナ・漢字
            // %83や%82なども日本語の可能性が高い
            const hasJapaneseEncoding = /%e[0-9a-f]|%8[0-9a-f]|%9[0-9a-f]/i.test(path);
            if (hasJapaneseEncoding) return false;
            
            // その他のエンコード文字が多い場合も除外
            const encodedMatches = path.match(/%[0-9a-f]{2}/gi);
            if (encodedMatches && encodedMatches.length > 2) return false;
            
            return true;
        } catch {
            return false;
        }
    });
}

/**
 * ファイル拡張子による除外
 * @param {Array} urls - URL配列
 * @returns {Array} フィルタリング後のURL配列
 */
export function filterFileExtensions(urls) {
    const excludeExtensions = [
        '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.rar', '.tar', '.gz',
        '.mp3', '.mp4', '.avi', '.mov', '.wmv',
        '.css', '.js', '.json', '.xml'
    ];
    
    return urls.filter(url => {
        try {
            const urlObj = new URL(url);
            const path = urlObj.pathname.toLowerCase();
            return !excludeExtensions.some(ext => path.endsWith(ext));
        } catch {
            return false;
        }
    });
}

/**
 * 包括的なURL フィルタリング
 * @param {Array} urls - URL配列  
 * @param {string} baseUrl - ベースURL
 * @returns {Array} フィルタリング後のURL配列
 */
export function filterCrawlableUrls(urls, baseUrl) {
    let filtered = urls;
    
    // 有効なHTTP URLのみ
    filtered = filtered.filter(url => isHttpUrl(url) && isValidUrl(url));
    
    // 同一ドメインのみ
    filtered = filterSameDomainLinks(filtered.map(url => ({href: url})), baseUrl)
                .map(link => link.href);
    
    // ファイル拡張子による除外
    filtered = filterFileExtensions(filtered);
    
    // 特殊パス除外
    filtered = filterSpecialPaths(filtered);
    
    // WordPress パターン除外
    filtered = filterWordPressUrls(filtered);
    
    // 日本語エンコード除外
    filtered = filterJapaneseEncodedUrls(filtered);
    
    // 重複除去
    filtered = deduplicateUrls(filtered);
    
    return filtered;
}

/**
 * 日本語を含むURLをエンコード判定
 * @param {string} url - チェック対象のURL
 * @returns {boolean} 日本語を含む場合true
 */
export function containsJapanese(url) {
    // ひらがな、カタカナ、漢字の範囲をチェック
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    return japaneseRegex.test(url);
}

/**
 * URLの正規化（末尾のスラッシュ除去、プロトコル統一など）
 * @param {string} url - 正規化対象のURL
 * @returns {string} 正規化されたURL
 */
export function normalizeUrl(url) {
    if (!url || typeof url !== 'string') return '';
    
    try {
        const urlObj = new URL(url);
        
        // HTTPSを優先
        if (urlObj.protocol === 'http:') {
            urlObj.protocol = 'https:';
        }
        
        // 末尾のスラッシュを除去（ルートパス以外）
        if (urlObj.pathname !== '/' && urlObj.pathname.endsWith('/')) {
            urlObj.pathname = urlObj.pathname.slice(0, -1);
        }
        
        // デフォルトポート番号を除去
        if ((urlObj.protocol === 'https:' && urlObj.port === '443') ||
            (urlObj.protocol === 'http:' && urlObj.port === '80')) {
            urlObj.port = '';
        }
        
        return urlObj.href;
    } catch {
        return url; // 正規化できない場合は元のURLを返す
    }
}

/**
 * URLの配列から重複を除去
 * @param {Array} urls - URL配列
 * @returns {Array} 重複除去後のURL配列
 */
export function deduplicateUrls(urls) {
    const seen = new Set();
    return urls.filter(url => {
        const normalized = normalizeUrl(url);
        if (seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
}