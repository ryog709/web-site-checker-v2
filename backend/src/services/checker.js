import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import AxePuppeteer from '@axe-core/puppeteer';
import * as cheerio from 'cheerio';

/**
 * 単一ページの診断を実行
 * @param {string} url - 診断するURL
 * @param {Object} auth - ベーシック認証情報 (オプション)
 * @returns {Object} 診断結果
 */
export async function checkSinglePage(url, auth = null) {
    // グローバル変数として現在のURLを保存（画像URL解決用）
    global.currentUrl = url;
    
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--enable-chrome-browser-cloud-management',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    try {
        const page = await browser.newPage();

        // ベーシック認証の設定
        if (auth && auth.username && auth.password) {
            await page.authenticate({
                username: auth.username,
                password: auth.password
            });
        }

        // ページアクセス
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });

        // 並列実行で診断を高速化
        const [lighthouseResults, axeResults, domAnalysis] = await Promise.all([
            runLighthouse(url, auth, browser),
            runAxeCore(page),
            analyzeDom(page)
        ]);

        return {
            url,
            timestamp: new Date().toISOString(),
            scores: lighthouseResults.scores,
            issues: {
                ...domAnalysis,
                accessibility: {
                    lighthouse: lighthouseResults.accessibility,
                    axe: axeResults
                }
            },
            auth: auth // 認証情報を結果に含める
        };
    } finally {
        await browser.close();
    }
}

/**
 * サイト全体のクロール診断を実行
 * @param {string} startUrl - 開始URL
 * @param {number} maxPages - 最大ページ数
 * @returns {Object} クロール結果
 */
export async function crawlSite(startUrl, maxPages = 30, auth = null) {
    const urls = await discoverUrls(startUrl, maxPages, auth);
    const results = [];

    console.log(`🔍 Discovered ${urls.length} pages to analyze`);

    // 並列実行数を制限（3並列）
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchPromises = batch.map(url =>
            checkSinglePage(url, auth).catch(error => ({
                url,
                error: error.message,
                timestamp: new Date().toISOString()
            }))
        );

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        console.log(`✅ Completed ${Math.min(i + concurrency, urls.length)}/${urls.length} pages`);
    }

    return {
        startUrl,
        totalPages: results.length,
        timestamp: new Date().toISOString(),
        results,
        auth: auth // 認証情報を結果に含める
    };
}

/**
 * Lighthouse診断を実行（Puppeteerブラウザを使用）
 * @param {string} url - 診断するURL
 * @param {Object} auth - ベーシック認証情報
 * @param {Object} browser - Puppeteerブラウザインスタンス
 * @returns {Object} Lighthouse結果
 */
async function runLighthouse(url, auth = null, browser = null) {
    try {
        // Puppeteerブラウザが提供されている場合はそれを使用
        if (browser) {
            const endpoint = browser.wsEndpoint();
            const {
                lhr
            } = await lighthouse(url, {
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
                settings: {
                    maxWaitForFcp: 15 * 1000,
                    maxWaitForLoad: 35 * 1000,
                    formFactor: 'desktop',
                    throttling: {
                        rttMs: 40,
                        throughputKbps: 10240,
                        cpuSlowdownMultiplier: 1,
                        requestLatencyMs: 0,
                        downloadThroughputKbps: 0,
                        uploadThroughputKbps: 0
                    },
                    screenEmulation: {
                        mobile: false,
                        width: 1350,
                        height: 940,
                        deviceScaleFactor: 1,
                        disabled: false,
                    },
                    // ベーシック認証が必要な場合
                    ...(auth && auth.username && auth.password && {
                        extraHeaders: {
                            'Authorization': `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`
                        }
                    })
                }
            }, {
                port: new URL(endpoint).port
            });

            // スコアを0-100スケールに変換
            const scores = {
                performance: Math.round((lhr.categories.performance?.score || 0) * 100),
                accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
                bestpractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
                seo: Math.round((lhr.categories.seo?.score || 0) * 100),
                pwa: Math.round((lhr.categories.pwa?.score || 0) * 100)
            };

            // アクセシビリティの失敗項目のみ抽出
            const accessibilityIssues = [];
            if (lhr.categories.accessibility?.auditRefs) {
                for (const auditRef of lhr.categories.accessibility.auditRefs) {
                    const audit = lhr.audits[auditRef.id];
                    if (audit && audit.score !== null && audit.score < 1) {
                        accessibilityIssues.push({
                            id: audit.id,
                            title: audit.title,
                            description: audit.description,
                            score: audit.score,
                            displayValue: audit.displayValue
                        });
                    }
                }
            }

            return {
                scores,
                accessibility: accessibilityIssues
            };
        }
    } catch (error) {
        console.warn('Lighthouse analysis failed:', error.message);
    }
    
    // フォールバック: 基本的なメトリクスから簡易スコアを算出
    return await calculateBasicScores(url, browser);
}

/**
 * 基本的なメトリクスから簡易スコアを算出
 * @param {string} url - 対象URL
 * @param {Object} browser - Puppeteerブラウザインスタンス
 * @returns {Object} 簡易スコア
 */
async function calculateBasicScores(url, browser) {
    try {
        const page = await browser.newPage();
        
        // パフォーマンスメトリクスを測定
        const start = Date.now();
        await page.goto(url, { waitUntil: 'networkidle2' });
        const loadTime = Date.now() - start;
        
        // 基本的なメトリクスを取得
        const metrics = await page.evaluate(() => {
            return {
                // SEO関連
                hasTitle: !!document.querySelector('title')?.textContent?.trim(),
                hasDescription: !!document.querySelector('meta[name="description"]'),
                hasH1: !!document.querySelector('h1'),
                
                // アクセシビリティ関連
                imagesWithoutAlt: document.querySelectorAll('img:not([alt])').length,
                totalImages: document.querySelectorAll('img').length,
                
                // パフォーマンス関連
                resourceCount: performance.getEntriesByType('resource').length,
                
                // PWA関連
                hasManifest: !!document.querySelector('link[rel="manifest"]'),
                hasServiceWorker: 'serviceWorker' in navigator
            };
        });
        
        await page.close();
        
        // スコア算出（0-100）
        const performance = Math.max(0, 100 - Math.floor(loadTime / 50)); // 5秒で0点
        const accessibility = Math.max(0, 100 - (metrics.imagesWithoutAlt * 10));
        const seo = (metrics.hasTitle ? 40 : 0) + (metrics.hasDescription ? 40 : 0) + (metrics.hasH1 ? 20 : 0);
        const bestpractices = Math.max(0, 100 - Math.max(0, metrics.resourceCount - 50)); // 50リソース超で減点
        const pwa = (metrics.hasManifest ? 50 : 0) + (metrics.hasServiceWorker ? 50 : 0);
        
        return {
            scores: {
                performance,
                accessibility,
                bestpractices,
                seo,
                pwa
            },
            accessibility: []
        };
    } catch (error) {
        console.warn('Basic score calculation failed:', error.message);
        return {
            scores: {
                performance: 0,
                accessibility: 0,
                bestpractices: 0,
                seo: 0,
                pwa: 0
            },
            accessibility: []
        };
    }
}

/**
 * axe-core による WCAG 2.2 AA 診断
 * @param {Object} page - Puppeteer page instance
 * @returns {Array} axe違反結果
 */
async function runAxeCore(page) {
    if (process.env.CHECK_A11Y === 'false') {
        return [];
    }

    try {
        const results = await new AxePuppeteer(page)
            .withRules(['wcag2a', 'wcag2aa'])
            .analyze();

        return results.violations.map(violation => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            helpUrl: violation.helpUrl,
            tags: violation.tags,
            nodes: violation.nodes.length
        }));
    } catch (error) {
        console.warn('axe-core analysis failed:', error.message);
        return [];
    }
}

/**
 * DOM解析による各種問題検出
 * @param {Object} page - Puppeteer page instance
 * @returns {Object} DOM解析結果
 */
async function analyzeDom(page) {
    const content = await page.content();
    const $ = cheerio.load(content);

    return {
        headings: analyzeHeadings($),
        headingsStructure: getAllHeadings($), // 新しい項目を追加
        images: analyzeImages($),
        allImages: getAllImages($), // 全ての画像情報を追加
        links: analyzeLinks($),
        meta: analyzeMeta($),
        allMeta: getAllMeta($) // 全てのメタ情報を追加
    };
}

/**
 * 全ての見出しを階層構造で取得
 * @param {Object} $ - Cheerio instance
 * @returns {Array} 全見出し一覧（階層情報付き）
 */
function getAllHeadings($) {
    const headings = $('h1, h2, h3, h4, h5, h6').get();
    
    return headings.map((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const $heading = $(heading);
        let text = $heading.text().trim();
        const images = [];
        
        // 見出し内の画像情報を詳細取得
        $heading.find('img').each((i, img) => {
            const $img = $(img);
            const alt = $img.attr('alt') || '';
            const title = $img.attr('title') || '';
            const src = $img.attr('src');
            const width = $img.attr('width');
            const height = $img.attr('height');
            
            // 相対URLを絶対URLに変換（簡易版）
            let absoluteSrc = src;
            if (src && !src.startsWith('http') && !src.startsWith('data:')) {
                if (src.startsWith('//')) {
                    absoluteSrc = 'https:' + src;
                } else if (src.startsWith('/')) {
                    absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
                } else {
                    absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
                }
            }
            
            images.push({
                src: absoluteSrc,
                alt: alt,
                title: title,
                width: width ? parseInt(width) : null,
                height: height ? parseInt(height) : null,
                filename: src ? src.split('/').pop().split('.')[0] : ''
            });
        });
        
        // テキストが空で画像がある場合、画像情報を含める
        if (!text && images.length > 0) {
            const imageTexts = images.map(img => 
                img.alt || img.title || img.filename || '無題画像'
            );
            text = imageTexts.join(', ');
        }
        
        return {
            level,
            tag: heading.tagName.toLowerCase(),
            text: text || '',
            index,
            images: images,
            hasImage: images.length > 0,
            isEmpty: !text && images.length === 0
        };
    });
}

/**
 * 見出し階層の解析
 * @param {Object} $ - Cheerio instance
 * @returns {Array} 見出し問題一覧
 */
function analyzeHeadings($) {
    const issues = [];
    const headings = $('h1, h2, h3, h4, h5, h6').get();

    let previousLevel = 0;

    headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const $heading = $(heading);
        const text = $heading.text().trim();
        const hasImages = $heading.find('img').length > 0;

        // 空の見出し（画像がある場合は問題なし）
        if (!text && !hasImages) {
            issues.push({
                type: '空の見出し',
                element: heading.tagName,
                message: '見出しが空です',
                severity: 'error'
            });
        }

        // 見出しレベルのスキップ
        if (index > 0 && level > previousLevel + 1) {
            issues.push({
                type: '見出しレベルスキップ',
                element: heading.tagName,
                message: `見出しレベルがh${previousLevel}からh${level}にスキップしています`,
                severity: 'warning'
            });
        }

        previousLevel = level;
    });

    // h1の数チェック
    const h1Count = $('h1').length;
    if (h1Count === 0) {
        issues.push({
            type: 'h1なし',
            message: 'h1見出しが見つかりません',
            severity: 'error'
        });
    } else if (h1Count > 1) {
        issues.push({
            type: '複数h1',
            message: `h1見出しが複数あります（${h1Count}個）`,
            severity: 'warning'
        });
    }

    return issues;
}

/**
 * 全ての画像情報を取得
 * @param {Object} $ - Cheerio instance
 * @returns {Array} 全画像一覧（詳細情報付き）
 */
function getAllImages($) {
    const images = [];
    
    $('img').each((index, img) => {
        const $img = $(img);
        const src = $img.attr('src');
        const alt = $img.attr('alt');
        const title = $img.attr('title');
        const width = $img.attr('width');
        const height = $img.attr('height');
        
        // 相対URLを絶対URLに変換
        let absoluteSrc = src;
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            if (src.startsWith('//')) {
                absoluteSrc = 'https:' + src;
            } else if (src.startsWith('/')) {
                absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
            } else {
                absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
            }
        }
        
        images.push({
            index: index + 1,
            src: absoluteSrc,
            originalSrc: src,
            alt: alt || '',
            title: title || '',
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            hasAlt: !!alt,
            hasDimensions: !!(width && height),
            filename: src ? src.split('/').pop() : 'unknown'
        });
    });
    
    return images;
}

/**
 * 画像の解析
 * @param {Object} $ - Cheerio instance
 * @returns {Array} 画像問題一覧
 */
function analyzeImages($) {
    const issues = [];

    $('img').each((index, img) => {
        const $img = $(img);
        const src = $img.attr('src');
        const alt = $img.attr('alt');
        const width = $img.attr('width');
        const height = $img.attr('height');

        // 相対URLを絶対URLに変換
        let absoluteSrc = src;
        if (src && !src.startsWith('http') && !src.startsWith('data:')) {
            if (src.startsWith('//')) {
                absoluteSrc = 'https:' + src;
            } else if (src.startsWith('/')) {
                absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
            } else {
                absoluteSrc = new URL(src, global.currentUrl || 'https://example.com').href;
            }
        }

        // alt属性チェック
        if (alt === undefined) {
            issues.push({
                type: 'alt属性なし',
                element: 'img',
                src: absoluteSrc,
                message: 'alt属性が設定されていません',
                severity: 'error'
            });
        }

        // 幅・高さ属性チェック
        if (!width || !height) {
            issues.push({
                type: 'サイズ不備',
                element: 'img',
                src: absoluteSrc,
                message: 'width属性またはheight属性が設定されていません',
                severity: 'warning'
            });
        }
    });

    return issues;
}

/**
 * リンクの解析
 * @param {Object} $ - Cheerio instance
 * @returns {Array} リンク問題一覧
 */
function analyzeLinks($) {
    const issues = [];

    $('a').each((index, link) => {
        const $link = $(link);
        const href = $link.attr('href');
        const text = $link.text().trim();
        const target = $link.attr('target');
        const rel = $link.attr('rel');
        const html = $link.html();

        // 空のリンクテキスト
        if (!text && !$link.find('img[alt]').length) {
            issues.push({
                type: 'リンクテキストなし',
                element: 'a',
                href: href,
                linkText: text || '（テキストなし）',
                linkHtml: html || '',
                message: 'リンクにアクセス可能なテキストがありません',
                severity: 'error'
            });
        }

        // 外部リンクのセキュリティ
        if (target === '_blank' && (!rel || !rel.includes('noopener'))) {
            issues.push({
                type: 'セキュリティ不備',
                element: 'a',
                href: href,
                linkText: text || '（テキストなし）',
                linkHtml: html || '',
                message: '外部リンクにrel="noopener"が設定されていません',
                severity: 'warning'
            });
        }
    });

    return issues;
}

/**
 * メタ情報の解析
 * @param {Object} $ - Cheerio instance
 * @returns {Array} メタ問題一覧
 */
function analyzeMeta($) {
    const issues = [];

    // 必須メタタグのチェック
    const requiredMeta = [{
            name: 'title',
            selector: 'title',
            message: 'titleタグがありません'
        },
        {
            name: 'description',
            selector: 'meta[name="description"]',
            message: 'meta descriptionが設定されていません'
        },
        {
            name: 'viewport',
            selector: 'meta[name="viewport"]',
            message: 'viewport meta tagが設定されていません'
        }
    ];

    requiredMeta.forEach(meta => {
        if ($(meta.selector).length === 0) {
            issues.push({
                type: 'メタタグなし',
                element: meta.name,
                message: meta.message,
                severity: 'error'
            });
        }
    });

    // OGタグのチェック
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:url'];
    const missingOgTags = ogTags.filter(tag => $(`meta[property="${tag}"]`).length === 0);

    if (missingOgTags.length > 0) {
        issues.push({
            type: 'OGタグなし',
            message: `Open Graphタグが不足しています: ${missingOgTags.join(', ')}`,
            severity: 'info'
        });
    }

    return issues;
}

/**
 * 全てのメタ情報を取得
 * @param {Object} $ - Cheerio instance
 * @returns {Array} メタ情報一覧
 */
function getAllMeta($) {
    const metaInfo = [];

    // titleタグ
    const title = $('title').text().trim();
    if (title) {
        metaInfo.push({
            type: 'title',
            name: 'ページタイトル',
            content: title,
            length: title.length
        });
    }

    // meta description
    const description = $('meta[name="description"]').attr('content');
    if (description) {
        metaInfo.push({
            type: 'description',
            name: 'ページ説明',
            content: description.trim(),
            length: description.trim().length
        });
    }

    // meta viewport
    const viewport = $('meta[name="viewport"]').attr('content');
    if (viewport) {
        metaInfo.push({
            type: 'viewport',
            name: 'ビューポート設定',
            content: viewport.trim()
        });
    }

    // Open Graphタグ
    const ogTags = [
        { property: 'og:title', name: 'OG タイトル' },
        { property: 'og:description', name: 'OG 説明' },
        { property: 'og:image', name: 'OG 画像' },
        { property: 'og:url', name: 'OG URL' },
        { property: 'og:type', name: 'OG タイプ' },
        { property: 'og:site_name', name: 'OG サイト名' }
    ];

    ogTags.forEach(tag => {
        const content = $(`meta[property="${tag.property}"]`).attr('content');
        if (content) {
            metaInfo.push({
                type: 'og',
                name: tag.name,
                content: content.trim(),
                property: tag.property
            });
        }
    });

    // Twitter Cardタグ
    const twitterTags = [
        { name: 'twitter:card', displayName: 'Twitter カード' },
        { name: 'twitter:title', displayName: 'Twitter タイトル' },
        { name: 'twitter:description', displayName: 'Twitter 説明' },
        { name: 'twitter:image', displayName: 'Twitter 画像' }
    ];

    twitterTags.forEach(tag => {
        const content = $(`meta[name="${tag.name}"]`).attr('content');
        if (content) {
            metaInfo.push({
                type: 'twitter',
                name: tag.displayName,
                content: content.trim(),
                property: tag.name
            });
        }
    });

    // その他の重要なmetaタグ
    const otherMeta = [
        { name: 'keywords', displayName: 'キーワード' },
        { name: 'author', displayName: '著者' },
        { name: 'robots', displayName: 'ロボット指示' },
        { name: 'canonical', displayName: '正規URL', selector: 'link[rel="canonical"]', attr: 'href' }
    ];

    otherMeta.forEach(meta => {
        let content;
        if (meta.selector) {
            content = $(meta.selector).attr(meta.attr);
        } else {
            content = $(`meta[name="${meta.name}"]`).attr('content');
        }
        
        if (content) {
            metaInfo.push({
                type: 'other',
                name: meta.displayName,
                content: content.trim()
            });
        }
    });

    return metaInfo;
}

/**
 * URL発見（クロール）
 * @param {string} startUrl - 開始URL
 * @param {number} maxPages - 最大ページ数
 * @returns {Array} 発見されたURL一覧
 */
async function discoverUrls(startUrl, maxPages, auth = null) {
    const browser = await puppeteer.launch({
        headless: 'new',
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--enable-chrome-browser-cloud-management',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    try {
        const visited = new Set();
        const toVisit = [startUrl];
        const discovered = [];
        const startDomain = new URL(startUrl).hostname;

        while (toVisit.length > 0 && discovered.length < maxPages) {
            const currentUrl = toVisit.shift();

            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);
            discovered.push(currentUrl);

            try {
                const page = await browser.newPage();
                
                // ベーシック認証の設定
                if (auth && auth.username && auth.password) {
                    await page.authenticate({
                        username: auth.username,
                        password: auth.password
                    });
                }
                
                await page.goto(currentUrl, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                // ページ内のリンクを取得
                const links = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll('a[href]'))
                        .map(a => a.href)
                        .filter(href => href.startsWith('http'));
                });

                await page.close();

                // 同一ドメインのリンクのみ追加
                for (const link of links) {
                    try {
                        const linkUrl = new URL(link);
                        if (linkUrl.hostname === startDomain && !visited.has(link) && !toVisit.includes(link)) {
                            toVisit.push(link);
                        }
                    } catch (e) {
                        // 無効なURLは無視
                    }
                }
            } catch (error) {
                console.warn(`Failed to crawl ${currentUrl}:`, error.message);
            }
        }

        return discovered;
    } finally {
        await browser.close();
    }
}