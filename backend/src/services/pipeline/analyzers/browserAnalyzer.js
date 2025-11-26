/**
 * Browser-side analyzers: consoleエラー収集とサイト内リンク収集
 */

/* global document */

/**
 * コンソールエラーを収集
 * @param {import('puppeteer').Page} page - 既存ページ
 * @returns {Promise<Array>} コンソールエラー一覧
 */
export async function collectConsoleErrors(page) {
  const consoleErrors = [];

  // エラー監視専用ページを作成
  const errorPage = await page.browser().newPage();

  try {
    // コンソールメッセージ
    errorPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'console-error',
          message: msg.text(),
          timestamp: new Date().toISOString(),
          severity: 'error',
          location: msg.location(),
        });
      }
    });

    // JSエラー
    errorPage.on('pageerror', (error) => {
      consoleErrors.push({
        type: 'javascript-error',
        message: error?.message || 'JavaScript error occurred',
        stack: error?.stack || '',
        timestamp: new Date().toISOString(),
        severity: 'error',
      });
    });

    // リクエストエラー
    errorPage.on('requestfailed', (request) => {
      consoleErrors.push({
        type: 'request-failed',
        message: `Failed to load resource: ${request.url()}`,
        url: request.url(),
        failure: request.failure(),
        timestamp: new Date().toISOString(),
        severity: 'warning',
      });
    });

    // 同じURLにアクセスして収集
    await errorPage.goto(page.url(), {
      waitUntil: 'networkidle2',
    });

    // 収集用に少し待機
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.warn('Failed to collect console errors:', error.message);
  } finally {
    await errorPage.close();
  }

  return consoleErrors;
}

/**
 * ページから同じドメインの他のページリンクを収集
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} currentUrl - 現在のページURL
 * @returns {Promise<Array>} サイト内リンク一覧
 */
export async function collectSiteLinks(page, currentUrl) {
  try {
    const currentDomain = new URL(currentUrl).hostname;

    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map((a) => ({
          href: a.href,
          text: a.textContent?.trim() || '',
          title: a.title || '',
        }))
        .filter((link) => link.href.startsWith('http'));
    });

    const siteLinks = [];
    const seen = new Set();

    for (const link of links) {
      try {
        const linkUrl = new URL(link.href);

        if (linkUrl.hostname !== currentDomain) continue;
        if (link.href === currentUrl) continue;

        const normalizedUrl = linkUrl.origin + linkUrl.pathname;

        const excludeExtensions = [
          '.pdf',
          '.jpg',
          '.jpeg',
          '.png',
          '.gif',
          '.svg',
          '.ico',
          '.css',
          '.js',
          '.xml',
          '.txt',
          '.zip',
        ];
        const hasExcludedExtension = excludeExtensions.some((ext) =>
          normalizedUrl.toLowerCase().endsWith(ext)
        );
        if (hasExcludedExtension) continue;

        const excludePatterns = [
          '/wp-admin/',
          '/admin/',
          '/login',
          '/logout',
          '/search',
          '/contact',
          '/mailto:',
          '/tel:',
          '/feed',
          '/rss',
          '/api/',
          '/.well-known/',
        ];
        const hasExcludedPattern = excludePatterns.some((pattern) =>
          normalizedUrl.toLowerCase().includes(pattern)
        );
        if (hasExcludedPattern) continue;

        const path = linkUrl.pathname;
        const wpExcludePatterns = [
          /\/page\/\d+/i,
          /\/paged\/\d+/i,
          /\/category\//i,
          /\/tag\//i,
          /\/author\//i,
          /\/\d{4}\/\d{2}\//i,
          /\/\d{4}\/$/i,
          /\/trackback/i,
          /\/comment-page-\d+/i,
          /\/attachment\//i,
          /\/embed\//i,
          /\/wp-content\//i,
          /\/wp-includes\//i,
          /\/xmlrpc\.php/i,
          /\/wp-sitemap/i,
        ];

        const hasWpExcludedPattern = wpExcludePatterns.some((pattern) => pattern.test(path));
        if (hasWpExcludedPattern) continue;

        const hasEncodedChars = /%[0-9a-f]{2}/i.test(path);
        if (hasEncodedChars) {
          const hasJapaneseEncoding = /%e[0-9a-f]|%8[0-9a-f]|%9[0-9a-f]/i.test(path);
          if (hasJapaneseEncoding) continue;

          const encodedMatches = path.match(/%[0-9a-f]{2}/gi);
          if (encodedMatches && encodedMatches.length > 2) continue;
        }

        const finalUrl =
          normalizedUrl.endsWith('/') && normalizedUrl !== linkUrl.origin + '/'
            ? normalizedUrl.slice(0, -1)
            : normalizedUrl;

        if (!seen.has(finalUrl)) {
          seen.add(finalUrl);
          siteLinks.push({
            url: finalUrl,
            text: link.text.substring(0, 100),
            title: link.title.substring(0, 100),
          });
        }

        if (siteLinks.length >= 20) break;
      } catch {
        // 無効なURLは無視
      }
    }

    return siteLinks;
  } catch (error) {
    console.warn('Failed to collect site links:', error.message);
    return [];
  }
}
