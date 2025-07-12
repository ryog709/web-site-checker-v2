import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import AxePuppeteer from '@axe-core/puppeteer';
import * as cheerio from 'cheerio';

/**
 * Puppeteerブラウザの共通設定を取得
 * @returns {Object} Puppeteerブラウザ設定
 */
function getBrowserConfig() {
    return {
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
    };
}

/**
 * ベーシック認証の設定
 * @param {Object} page - Puppeteerページインスタンス
 * @param {Object} auth - 認証情報
 */
async function setupAuth(page, auth) {
    if (auth && auth.username && auth.password) {
        await page.authenticate({
            username: auth.username,
            password: auth.password
        });
    }
}

/**
 * 単一ページの診断を実行
 * @param {string} url - 診断するURL
 * @param {Object} auth - ベーシック認証情報 (オプション)
 * @returns {Object} 診断結果
 */
export async function checkSinglePage(url, auth = null) {
    // グローバル変数として現在のURLを保存（画像URL解決用）
    global.currentUrl = url;

    const browser = await puppeteer.launch(getBrowserConfig());

    try {
        const page = await browser.newPage();
        await setupAuth(page, auth);

        // ページアクセス
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });

        // 並列実行で診断を高速化
        const [lighthouseResults, axeResults, domAnalysis, consoleErrors] = await Promise.all([
            runLighthouse(url, auth, browser),
            runAxeCore(page),
            analyzeDom(page),
            collectConsoleErrors(page)
        ]);

        // 同じドメインの他のページリンクを収集
        const siteLinks = await collectSiteLinks(page, url);

        return {
            url,
            timestamp: new Date().toISOString(),
            scores: lighthouseResults.scores,
            issues: {
                ...domAnalysis,
                accessibility: {
                    lighthouse: lighthouseResults.accessibility,
                    axe: axeResults
                },
                consoleErrors: consoleErrors
            },
            siteLinks, // 他ページへのリンク一覧を追加
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
export async function crawlSite(startUrl, urls = null, auth = null) {
    const urlsToAnalyze = urls || await discoverUrls(startUrl, auth);
    const results = [];

    console.log(`🔍 Discovered ${urlsToAnalyze.length} pages to analyze`);

    // 並列実行数を制限（3並列）
    const concurrency = 3;
    for (let i = 0; i < urlsToAnalyze.length; i += concurrency) {
        const batch = urlsToAnalyze.slice(i, i + concurrency);
        const batchPromises = batch.map(url =>
            checkSinglePage(url, auth).catch(error => ({
                url,
                error: error?.message || 'Unknown error occurred',
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
            // WebSocket URLが利用可能かチェック
            const endpoint = browser.wsEndpoint();
            if (!endpoint) {
                console.warn('Browser WebSocket endpoint not available, falling back to basic scores');
                return await calculateBasicScores(url, browser);
            }

            // URLからポート番号を抽出
            const wsUrl = new URL(endpoint);
            const port = parseInt(wsUrl.port);

            if (!port || isNaN(port)) {
                console.warn('Invalid port from WebSocket URL, falling back to basic scores');
                return await calculateBasicScores(url, browser);
            }

            const {
                lhr
            } = await lighthouse(url, {
                onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
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
                port: port
            });

            // スコアを0-100スケールに変換
            const scores = {
                performance: Math.round((lhr.categories.performance?.score || 0) * 100),
                accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
                bestpractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
                seo: Math.round((lhr.categories.seo?.score || 0) * 100)
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
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });
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

            };
        });

        await page.close();

        // スコア算出（0-100）
        const performance = Math.max(0, 100 - Math.floor(loadTime / 50)); // 5秒で0点
        const accessibility = Math.max(0, 100 - (metrics.imagesWithoutAlt * 10));
        const seo = (metrics.hasTitle ? 40 : 0) + (metrics.hasDescription ? 40 : 0) + (metrics.hasH1 ? 20 : 0);
        const bestpractices = Math.max(0, 100 - Math.max(0, metrics.resourceCount - 50)); // 50リソース超で減点

        return {
            scores: {
                performance,
                accessibility,
                bestpractices,
                seo
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
                seo: 0
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
            .options({
                runOnly: {
                    type: 'tag',
                    values: ['wcag2a', 'wcag2aa']
                }
            })
            .analyze();

        return results.violations.map(violation => ({
            id: violation.id,
            impact: violation.impact,
            description: violation.description,
            help: violation.help,
            helpUrl: violation.helpUrl,
            tags: violation.tags,
            nodes: violation.nodes.length,
            target: violation.nodes.length > 0 && violation.nodes[0].target ? violation.nodes[0].target : null
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
        images: await analyzeImages($),
        allImages: getAllImages($), // 全ての画像情報を追加
        links: analyzeLinks($),
        meta: analyzeMeta($),
        allMeta: getAllMeta($), // 全てのメタ情報を追加
        htmlStructure: analyzeHtmlStructure(content) // HTML構造チェックを追加
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

        // 親要素情報を取得
        const isInHeader = $img.closest('header').length > 0;
        const isInNav = $img.closest('nav').length > 0;
        const isInFooter = $img.closest('footer').length > 0;
        
        // picture要素内かどうかと、WebP代替画像の有無をチェック
        const pictureParent = $img.closest('picture');
        let hasWebPAlternative = false;
        let webpSources = [];
        
        if (pictureParent.length > 0) {
            // picture要素内のsource要素でWebPを探す
            pictureParent.find('source[type="image/webp"]').each((i, source) => {
                const $source = $(source);
                const srcset = $source.attr('srcset');
                if (srcset) {
                    hasWebPAlternative = true;
                    webpSources.push({
                        srcset: srcset,
                        media: $source.attr('media') || '',
                        sizes: $source.attr('sizes') || ''
                    });
                }
            });
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
            filename: src ? src.split('/').pop() : 'unknown',
            isInHeader: isInHeader,
            isInNav: isInNav,
            isInFooter: isInFooter,
            location: isInHeader ? 'header' : isInNav ? 'nav' : isInFooter ? 'footer' : 'content',
            isInPicture: pictureParent.length > 0,
            hasWebPAlternative: hasWebPAlternative,
            webpSources: webpSources,
            loading: $img.attr('loading') || null, // loading属性の値を取得
            hasLazyLoading: $img.attr('loading') === 'lazy' // lazy loading設定済みかどうか
        });
    });

    // SVGタグも画像として処理（アクセシビリティチェック対象）
    $('svg').each((index, svg) => {
        const $svg = $(svg);
        const role = $svg.attr('role');
        const ariaLabel = $svg.attr('aria-label');
        const title = $svg.find('title').text();
        const width = $svg.attr('width');
        const height = $svg.attr('height');

        images.push({
            index: images.length + 1,
            src: 'svg-inline',
            originalSrc: 'svg-inline',
            alt: ariaLabel || title || '', // SVGではaria-labelまたはtitleが代替テキストの役割
            title: title || '',
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            hasAlt: !!(ariaLabel || title), // SVGのアクセシビリティ判定
            hasDimensions: !!(width && height),
            filename: 'inline-svg',
            type: 'svg',
            role: role
        });
    });

    return images;
}

/**
 * 画像の解析
 * @param {Object} $ - Cheerio instance
 * @returns {Array} 画像問題一覧
 */
async function analyzeImages($) {
    const issues = [];

    // imgタグの処理
    for (const img of $('img').toArray()) {
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

        // ファイルサイズチェック（1MB以上）
        if (absoluteSrc && !absoluteSrc.startsWith('data:')) {
            try {
                const response = await fetch(absoluteSrc, { method: 'HEAD' });
                const contentLength = response.headers.get('content-length');
                
                if (contentLength) {
                    const sizeInBytes = parseInt(contentLength);
                    const sizeInMB = sizeInBytes / (1024 * 1024);
                    
                    if (sizeInMB >= 1) {
                        issues.push({
                            type: 'ファイルサイズ過大',
                            element: 'img',
                            src: absoluteSrc,
                            message: `画像ファイルサイズが${sizeInMB.toFixed(2)}MBです。1MB以上の画像は表示速度に影響します`,
                            severity: 'warning',
                            fileSize: sizeInBytes,
                            fileSizeMB: sizeInMB
                        });
                    }
                }
            } catch (error) {
                // ネットワークエラーは無視（画像が取得できない場合）
                console.warn(`画像サイズ取得エラー: ${absoluteSrc}`, error.message);
            }
        }
    }

    // SVGタグのアクセシビリティチェック
    $('svg').each((index, svg) => {
        const $svg = $(svg);
        const role = $svg.attr('role');
        const ariaLabel = $svg.attr('aria-label');
        const ariaLabelledby = $svg.attr('aria-labelledby');
        const title = $svg.find('title').text();

        // SVGには以下のいずれかが必要：
        // 1. role="img" + aria-label または title
        // 2. role="presentation" (装飾的な場合)
        // 3. aria-labelledby で説明要素を参照
        if (role !== 'img' && role !== 'presentation' && !ariaLabel && !ariaLabelledby && !title) {
            const classAttr = $svg.attr('class');
            const id = $svg.attr('id');

            issues.push({
                type: 'SVGアクセシビリティ',
                element: 'svg',
                message: 'SVGにアクセシブルな説明が設定されていません。装飾目的なら role="presentation" を追加してください。',
                severity: 'warning',
                details: {
                    role: role,
                    ariaLabel: ariaLabel,
                    ariaLabelledby: ariaLabelledby,
                    hasTitle: !!title,
                    class: classAttr,
                    id: id,
                    suggestion: '装飾目的なら <svg role="presentation" ...> を追加。意味があるSVGなら aria-label または <title> を追加。'
                }
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
    const ogTags = [{
            property: 'og:title',
            name: 'OG タイトル'
        },
        {
            property: 'og:description',
            name: 'OG 説明'
        },
        {
            property: 'og:image',
            name: 'OG 画像'
        },
        {
            property: 'og:url',
            name: 'OG URL'
        },
        {
            property: 'og:type',
            name: 'OG タイプ'
        },
        {
            property: 'og:site_name',
            name: 'OG サイト名'
        }
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
    const twitterTags = [{
            name: 'twitter:card',
            displayName: 'Twitter カード'
        },
        {
            name: 'twitter:title',
            displayName: 'Twitter タイトル'
        },
        {
            name: 'twitter:description',
            displayName: 'Twitter 説明'
        },
        {
            name: 'twitter:image',
            displayName: 'Twitter 画像'
        }
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
    const otherMeta = [{
            name: 'keywords',
            displayName: 'キーワード'
        },
        {
            name: 'author',
            displayName: '著者'
        },
        {
            name: 'robots',
            displayName: 'ロボット指示'
        },
        {
            name: 'canonical',
            displayName: '正規URL',
            selector: 'link[rel="canonical"]',
            attr: 'href'
        }
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
 * ページ数をカウント（実際のクロールなし）
 * @param {string} startUrl - 開始URL
 * @param {Object} auth - 認証情報
 * @returns {Object} ページ数とURL一覧
 */
async function countPages(startUrl, auth = null) {
    const browser = await puppeteer.launch(getBrowserConfig());

    try {
        const visited = new Set();
        // 開始URLを正規化
        const startUrlObj = new URL(startUrl);
        const normalizedStartUrl = startUrlObj.origin + startUrlObj.pathname;
        const finalStartUrl = normalizedStartUrl.endsWith('/') && normalizedStartUrl !== startUrlObj.origin + '/' ?
            normalizedStartUrl.slice(0, -1) :
            normalizedStartUrl;

        const toVisit = [finalStartUrl];
        const discovered = [];
        const startDomain = startUrlObj.hostname;

        // すべてのページを発見するまでクロール
        while (toVisit.length > 0) {
            const currentUrl = toVisit.shift();

            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);
            discovered.push(currentUrl);

            try {
                const page = await browser.newPage();

                await setupAuth(page, auth);

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

                // 同一ドメインのリンクのみ追加（改善されたフィルタリング）
                for (const link of links) {
                    try {
                        const linkUrl = new URL(link);

                        // 同一ドメインかチェック
                        if (linkUrl.hostname !== startDomain) continue;

                        // URLを正規化（フラグメントとクエリパラメータを除去）
                        const normalizedUrl = linkUrl.origin + linkUrl.pathname;

                        // 不要なファイル拡張子を除外
                        const excludeExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.css', '.js', '.xml', '.txt', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
                        const hasExcludedExtension = excludeExtensions.some(ext =>
                            normalizedUrl.toLowerCase().endsWith(ext)
                        );
                        if (hasExcludedExtension) continue;

                        // 特殊なパスを除外
                        const excludePatterns = [
                            '/wp-admin/', '/admin/', '/login', '/logout',
                            '/search', '/contact', '/mailto:', '/tel:',
                            '/feed', '/rss', '/api/', '/.well-known/'
                        ];
                        const hasExcludedPattern = excludePatterns.some(pattern =>
                            normalizedUrl.toLowerCase().includes(pattern)
                        );
                        if (hasExcludedPattern) continue;

                        // URLエンコードされた曖昧なスラッグを除外（特に日本語）
                        const path = linkUrl.pathname;
                        const hasEncodedChars = /%[0-9a-f]{2}/i.test(path);
                        if (hasEncodedChars) {
                            // %e3で始まるものは日本語のひらがな・カタカナ・漢字
                            // %83や%82なども日本語の可能性が高い
                            const hasJapaneseEncoding = /%e[0-9a-f]|%8[0-9a-f]|%9[0-9a-f]/i.test(path);
                            if (hasJapaneseEncoding) continue;

                            // その他のエンコード文字が多い場合も除外
                            const encodedMatches = path.match(/%[0-9a-f]{2}/gi);
                            if (encodedMatches && encodedMatches.length > 2) continue;
                        }

                        // WordPressのページネーションと特殊URLパターンを除外
                        const wpExcludePatterns = [
                            /\/page\/\d+/i, // /page/2, /page/3 等
                            /\/paged\/\d+/i, // /paged/2 等
                            /\/category\//i, // カテゴリーアーカイブ
                            /\/tag\//i, // タグアーカイブ
                            /\/author\//i, // 作者アーカイブ
                            /\/\d{4}\/\d{2}\//i, // /2023/12/ 日付アーカイブ
                            /\/\d{4}\/$/i, // /2023/ 年アーカイブ
                            /\/trackback/i, // トラックバック
                            /\/comment-page-\d+/i, // コメントページネーション
                            /\/attachment\//i, // 添付ファイル
                            /\/embed\//i, // 埋め込み
                            /\/wp-content\//i, // WordPress コンテンツ
                            /\/wp-includes\//i, // WordPress インクルード
                            /\/xmlrpc\.php/i, // XML-RPC
                            /\/wp-sitemap/i // WordPressサイトマップ
                        ];

                        const hasWpExcludedPattern = wpExcludePatterns.some(pattern =>
                            pattern.test(path)
                        );
                        if (hasWpExcludedPattern) continue;

                        // クエリパラメータにページネーションが含まれている場合も除外
                        const searchParams = linkUrl.searchParams;
                        if (searchParams.has('page') || searchParams.has('paged') ||
                            searchParams.has('p') || searchParams.has('cat') ||
                            searchParams.has('tag') || searchParams.has('author')) {
                            continue;
                        }

                        // 末尾のスラッシュを統一
                        const finalUrl = normalizedUrl.endsWith('/') && normalizedUrl !== linkUrl.origin + '/' ?
                            normalizedUrl.slice(0, -1) :
                            normalizedUrl;

                        // 重複チェック（正規化されたURLで）
                        if (!visited.has(finalUrl) && !toVisit.includes(finalUrl)) {
                            toVisit.push(finalUrl);
                        }
                    } catch (e) {
                        // 無効なURLは無視
                    }
                }
            } catch (e) {
                console.warn(`Failed to process ${currentUrl}:`, e.message);
            }
        }

        return {
            totalPages: discovered.length,
            urls: discovered
        };
    } finally {
        await browser.close();
    }
}

/**
 * URL発見（クロール）
 * @param {string} startUrl - 開始URL
 * @param {Object} auth - 認証情報
 * @returns {Array} 発見されたURL一覧
 */
async function discoverUrls(startUrl, auth = null) {
    const browser = await puppeteer.launch(getBrowserConfig());

    try {
        const visited = new Set();
        // 開始URLを正規化
        const startUrlObj = new URL(startUrl);
        const normalizedStartUrl = startUrlObj.origin + startUrlObj.pathname;
        const finalStartUrl = normalizedStartUrl.endsWith('/') && normalizedStartUrl !== startUrlObj.origin + '/' ?
            normalizedStartUrl.slice(0, -1) :
            normalizedStartUrl;

        const toVisit = [finalStartUrl];
        const discovered = [];
        const startDomain = startUrlObj.hostname;

        while (toVisit.length > 0) {
            const currentUrl = toVisit.shift();

            if (visited.has(currentUrl)) continue;
            visited.add(currentUrl);
            discovered.push(currentUrl);

            try {
                const page = await browser.newPage();

                await setupAuth(page, auth);

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

                // 同一ドメインのリンクのみ追加（改善されたフィルタリング）
                for (const link of links) {
                    try {
                        const linkUrl = new URL(link);

                        // 同一ドメインかチェック
                        if (linkUrl.hostname !== startDomain) continue;

                        // URLを正規化（フラグメントとクエリパラメータを除去）
                        const normalizedUrl = linkUrl.origin + linkUrl.pathname;

                        // 不要なファイル拡張子を除外
                        const excludeExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.css', '.js', '.xml', '.txt', '.zip', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
                        const hasExcludedExtension = excludeExtensions.some(ext =>
                            normalizedUrl.toLowerCase().endsWith(ext)
                        );
                        if (hasExcludedExtension) continue;

                        // 特殊なパスを除外
                        const excludePatterns = [
                            '/wp-admin/', '/admin/', '/login', '/logout',
                            '/search', '/contact', '/mailto:', '/tel:',
                            '/feed', '/rss', '/api/', '/.well-known/'
                        ];
                        const hasExcludedPattern = excludePatterns.some(pattern =>
                            normalizedUrl.toLowerCase().includes(pattern)
                        );
                        if (hasExcludedPattern) continue;

                        // URLエンコードされた曖昧なスラッグを除外（特に日本語）
                        const path = linkUrl.pathname;
                        const hasEncodedChars = /%[0-9a-f]{2}/i.test(path);
                        if (hasEncodedChars) {
                            // %e3で始まるものは日本語のひらがな・カタカナ・漢字
                            // %83や%82なども日本語の可能性が高い
                            const hasJapaneseEncoding = /%e[0-9a-f]|%8[0-9a-f]|%9[0-9a-f]/i.test(path);
                            if (hasJapaneseEncoding) continue;

                            // その他のエンコード文字が多い場合も除外
                            const encodedMatches = path.match(/%[0-9a-f]{2}/gi);
                            if (encodedMatches && encodedMatches.length > 2) continue;
                        }

                        // WordPressのページネーションと特殊URLパターンを除外
                        const wpExcludePatterns = [
                            /\/page\/\d+/i, // /page/2, /page/3 等
                            /\/paged\/\d+/i, // /paged/2 等
                            /\/category\//i, // カテゴリーアーカイブ
                            /\/tag\//i, // タグアーカイブ
                            /\/author\//i, // 作者アーカイブ
                            /\/\d{4}\/\d{2}\//i, // /2023/12/ 日付アーカイブ
                            /\/\d{4}\/$/i, // /2023/ 年アーカイブ
                            /\/trackback/i, // トラックバック
                            /\/comment-page-\d+/i, // コメントページネーション
                            /\/attachment\//i, // 添付ファイル
                            /\/embed\//i, // 埋め込み
                            /\/wp-content\//i, // WordPress コンテンツ
                            /\/wp-includes\//i, // WordPress インクルード
                            /\/xmlrpc\.php/i, // XML-RPC
                            /\/wp-sitemap/i // WordPressサイトマップ
                        ];

                        const hasWpExcludedPattern = wpExcludePatterns.some(pattern =>
                            pattern.test(path)
                        );
                        if (hasWpExcludedPattern) continue;

                        // クエリパラメータにページネーションが含まれている場合も除外
                        const searchParams = linkUrl.searchParams;
                        if (searchParams.has('page') || searchParams.has('paged') ||
                            searchParams.has('p') || searchParams.has('cat') ||
                            searchParams.has('tag') || searchParams.has('author')) {
                            continue;
                        }

                        // 末尾のスラッシュを統一
                        const finalUrl = normalizedUrl.endsWith('/') && normalizedUrl !== linkUrl.origin + '/' ?
                            normalizedUrl.slice(0, -1) :
                            normalizedUrl;

                        // 重複チェック（正規化されたURLで）
                        if (!visited.has(finalUrl) && !toVisit.includes(finalUrl)) {
                            toVisit.push(finalUrl);
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

/**
 * コンソールエラーを収集
 * @param {Object} page - Puppeteer page instance
 * @returns {Array} コンソールエラー一覧
 */
async function collectConsoleErrors(page) {
    const consoleErrors = [];

    // 新しいページを作成してエラー収集用にセットアップ
    const errorPage = await page.browser().newPage();

    try {
        // コンソールメッセージをリスン
        errorPage.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push({
                    type: 'console-error',
                    message: msg.text(),
                    timestamp: new Date().toISOString(),
                    severity: 'error',
                    location: msg.location()
                });
            }
        });

        // JavaScriptエラーをリスン
        errorPage.on('pageerror', error => {
            consoleErrors.push({
                type: 'javascript-error',
                message: error?.message || 'JavaScript error occurred',
                stack: error?.stack || '',
                timestamp: new Date().toISOString(),
                severity: 'error'
            });
        });

        // リクエストエラーをリスン
        errorPage.on('requestfailed', request => {
            consoleErrors.push({
                type: 'request-failed',
                message: `Failed to load resource: ${request.url()}`,
                url: request.url(),
                failure: request.failure(),
                timestamp: new Date().toISOString(),
                severity: 'warning'
            });
        });

        // ページにアクセスしてエラーを収集
        await errorPage.goto(page.url(), {
            waitUntil: 'networkidle2'
        });

        // 少し待ってエラーを収集
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        console.warn('Failed to collect console errors:', error.message);
    } finally {
        await errorPage.close();
    }

    return consoleErrors;
}

/**
 * ページから同じドメインの他のページリンクを収集
 * @param {Object} page - Puppeteer page instance
 * @param {string} currentUrl - 現在のページURL
 * @returns {Array} サイト内リンク一覧
 */
async function collectSiteLinks(page, currentUrl) {
    try {
        const currentDomain = new URL(currentUrl).hostname;

        // ページ内のリンクを取得
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => ({
                    href: a.href,
                    text: a.textContent?.trim() || '',
                    title: a.title || ''
                }))
                .filter(link => link.href.startsWith('http'));
        });

        const siteLinks = [];
        const seen = new Set();

        for (const link of links) {
            try {
                const linkUrl = new URL(link.href);

                // 同一ドメインかチェック
                if (linkUrl.hostname !== currentDomain) continue;

                // 現在のページは除外
                if (link.href === currentUrl) continue;

                // URLを正規化
                const normalizedUrl = linkUrl.origin + linkUrl.pathname;

                // 不要なファイル拡張子を除外
                const excludeExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.ico', '.css', '.js', '.xml', '.txt', '.zip'];
                const hasExcludedExtension = excludeExtensions.some(ext =>
                    normalizedUrl.toLowerCase().endsWith(ext)
                );
                if (hasExcludedExtension) continue;

                // 特殊なパスを除外
                const excludePatterns = [
                    '/wp-admin/', '/admin/', '/login', '/logout',
                    '/search', '/contact', '/mailto:', '/tel:',
                    '/feed', '/rss', '/api/', '/.well-known/'
                ];
                const hasExcludedPattern = excludePatterns.some(pattern =>
                    normalizedUrl.toLowerCase().includes(pattern)
                );
                if (hasExcludedPattern) continue;

                // WordPressのページネーションと特殊URLパターンを除外
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
                    /\/wp-sitemap/i
                ];

                const hasWpExcludedPattern = wpExcludePatterns.some(pattern =>
                    pattern.test(path)
                );
                if (hasWpExcludedPattern) continue;

                // URLエンコードされた日本語を除外
                const hasEncodedChars = /%[0-9a-f]{2}/i.test(path);
                if (hasEncodedChars) {
                    const hasJapaneseEncoding = /%e[0-9a-f]|%8[0-9a-f]|%9[0-9a-f]/i.test(path);
                    if (hasJapaneseEncoding) continue;

                    const encodedMatches = path.match(/%[0-9a-f]{2}/gi);
                    if (encodedMatches && encodedMatches.length > 2) continue;
                }

                // 末尾のスラッシュを統一
                const finalUrl = normalizedUrl.endsWith('/') && normalizedUrl !== linkUrl.origin + '/' ?
                    normalizedUrl.slice(0, -1) :
                    normalizedUrl;

                // 重複チェック
                if (!seen.has(finalUrl)) {
                    seen.add(finalUrl);
                    siteLinks.push({
                        url: finalUrl,
                        text: link.text.substring(0, 100), // テキストを100文字に制限
                        title: link.title.substring(0, 100)
                    });
                }

                // 最大20個まで
                if (siteLinks.length >= 20) break;

            } catch (e) {
                // 無効なURLは無視
            }
        }

        return siteLinks;
    } catch (error) {
        console.warn('Failed to collect site links:', error.message);
        return [];
    }
}

/**
 * HTML構造の分析（閉じタグとネスト構造のチェック）
 * @param {string} htmlContent - HTMLコンテンツ
 * @returns {Array} HTML構造の問題一覧
 */
function analyzeHtmlStructure(htmlContent) {
    const issues = [];

    try {
        // 閉じタグの問題をチェック
        checkUnclosedTags(htmlContent, issues);

        // ネスト構造のチェック
        checkNestingIssues(htmlContent, issues);

        // 問題がない場合の表示
        if (issues.length === 0) {
            issues.push({
                type: '正常',
                message: '閉じタグは問題ありません',
                severity: 'success'
            });
            issues.push({
                type: '正常',
                message: '不正なネスト構造はありません',
                severity: 'success'
            });
        }

    } catch (error) {
        console.warn('HTML structure analysis failed:', error.message);
    }

    return issues;
}


/**
 * 閉じタグの問題をチェック
 */
function checkUnclosedTags(htmlContent, issues) {
    // 自己完結型タグ（void elements）
    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    // 開始タグと終了タグをマッチング
    const tagRegex = /<(\/?)([\w-]+)(?:\s[^>]*)?>/gi;
    const stack = [];
    const tagPositions = [];
    let match;

    while ((match = tagRegex.exec(htmlContent)) !== null) {
        const isClosing = match[1] === '/';
        const tagName = match[2].toLowerCase();
        const position = match.index;

        // void elementsはスキップ
        if (voidElements.includes(tagName)) continue;

        if (isClosing) {
            const lastOpen = stack.pop();
            if (!lastOpen || lastOpen.name !== tagName) {
                // 対応する開始タグがない、または異なるタグ
                const className = extractClassName(htmlContent, position);
                issues.push({
                    type: '閉じタグエラー',
                    element: tagName,
                    className: className,
                    message: `</${tagName}> に対応する開始タグが見つかりません`,
                    severity: 'error',
                    position: position
                });
            }
        } else {
            stack.push({
                name: tagName,
                position: position
            });
            tagPositions.push({
                name: tagName,
                position: position,
                type: 'open'
            });
        }
    }

    // 閉じられていないタグ
    stack.forEach(tag => {
        const className = extractClassName(htmlContent, tag.position);
        issues.push({
            type: '未閉じタグ',
            element: tag.name,
            className: className,
            message: `<${tag.name}> タグが閉じられていません`,
            severity: 'error',
            position: tag.position,
            suggestion: `</${tag.name}> で閉じてください`
        });
    });
}

/**
 * ネスト構造の問題をチェック
 */
function checkNestingIssues(htmlContent, issues) {
    // 不正なネストのパターン
    const invalidNesting = [{
            parent: 'p',
            child: 'div',
            message: 'p要素内にdiv要素をネストできません'
        },
        {
            parent: 'p',
            child: 'p',
            message: 'p要素内にp要素をネストできません'
        },
        {
            parent: 'a',
            child: 'a',
            message: 'a要素内にa要素をネストできません'
        },
        {
            parent: 'button',
            child: 'button',
            message: 'button要素内にbutton要素をネストできません'
        },
        {
            parent: 'button',
            child: 'a',
            message: 'button要素内にa要素をネストできません'
        },
        {
            parent: 'h1|h2|h3|h4|h5|h6',
            child: 'h1|h2|h3|h4|h5|h6',
            message: '見出し要素内に見出し要素をネストできません'
        }
    ];

    invalidNesting.forEach(rule => {
        const parentPattern = new RegExp(`<(${rule.parent})(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(${rule.parent})>`, 'gi');
        let parentMatch;

        while ((parentMatch = parentPattern.exec(htmlContent)) !== null) {
            const innerContent = parentMatch[2];
            const childPattern = new RegExp(`<(${rule.child})(?:\\s[^>]*)?>`, 'i');

            if (childPattern.test(innerContent)) {
                const className = extractClassName(htmlContent, parentMatch.index);
                issues.push({
                    type: '不正なネスト',
                    element: `${parentMatch[1]} > ${rule.child}`,
                    className: className,
                    message: rule.message,
                    severity: 'error',
                    position: parentMatch.index
                });
            }
        }
    });
}

/**
 * 指定位置周辺からclass名を抽出
 */
function extractClassName(htmlContent, position) {
    const surroundingText = htmlContent.substring(Math.max(0, position - 100), position + 200);
    const classMatch = surroundingText.match(/class\s*=\s*["']([^"']+)["']/i);
    return classMatch ? classMatch[1] : null;
}

export {
    countPages
};