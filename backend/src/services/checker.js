import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import AxePuppeteer from '@axe-core/puppeteer';
import * as cheerio from 'cheerio';

/**
 * 単一ページの診断を実行
 * @param {string} url - 診断するURL
 * @returns {Object} 診断結果
 */
export async function checkSinglePage(url) {
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

        // ページアクセス
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });

        // 並列実行で診断を高速化
        const [lighthouseResults, axeResults, domAnalysis] = await Promise.all([
            // runLighthouse(url), // 一時的に無効化
            Promise.resolve({ scores: {}, accessibility: [] }), // ダミーデータ
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
            }
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
export async function crawlSite(startUrl, maxPages = 30) {
    const urls = await discoverUrls(startUrl, maxPages);
    const results = [];

    console.log(`🔍 Discovered ${urls.length} pages to analyze`);

    // 並列実行数を制限（3並列）
    const concurrency = 3;
    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency);
        const batchPromises = batch.map(url =>
            checkSinglePage(url).catch(error => ({
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
        results
    };
}

/**
 * Lighthouse診断を実行
 * @param {string} url - 診断するURL
 * @returns {Object} Lighthouse結果
 */
async function runLighthouse(url) {
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
            }
        }
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

/**
 * axe-core による WCAG 2.1 AA 診断
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
        meta: analyzeMeta($)
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

        // alt属性チェック
        if (alt === undefined) {
            issues.push({
                type: 'alt属性なし',
                element: 'img',
                src: src,
                message: 'alt属性が設定されていません',
                severity: 'error'
            });
        }

        // 幅・高さ属性チェック
        if (!width || !height) {
            issues.push({
                type: 'サイズ属性なし',
                element: 'img',
                src: src,
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

        // 空のリンクテキスト
        if (!text && !$link.find('img[alt]').length) {
            issues.push({
                type: 'リンクテキストなし',
                element: 'a',
                href: href,
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
 * URL発見（クロール）
 * @param {string} startUrl - 開始URL
 * @param {number} maxPages - 最大ページ数
 * @returns {Array} 発見されたURL一覧
 */
async function discoverUrls(startUrl, maxPages) {
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