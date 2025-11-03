import express from 'express';
import fetch from 'node-fetch';
import { checkSinglePage, crawlSite, countPages } from '../services/checker.js';
import { run as runPipeline } from '../services/pipeline/AnalysisPipeline/index.js';
import {
    validateUrlRouteHandler,
    asyncRouteHandler,
    sendErrorResponse
} from '../utils/error-handler.js';

const router = express.Router();

/**
 * 単一ページの診断API
 * POST /api/check
 */
router.post('/check', validateUrlRouteHandler(async (req, res) => {
    const { url, auth, enhanced } = req.body;
    const includeEnhancements = Boolean(enhanced);

    const legacyResult = await checkSinglePage(url, auth);
    const result = await runPipeline(url, auth, {
        includeEnhancements,
        baselineResult: legacyResult,
    });

    res.json(result);
}, 'Analysis'));

/**
 * パイプライン版診断API（新実装）
 * POST /api/check-pipeline
 */
router.post('/check-pipeline', validateUrlRouteHandler(async (req, res) => {
    const { url, auth } = req.body;
    const result = await runPipeline(url, auth, { includeEnhancements: true });
    res.json(result);
}, 'Pipeline Analysis'));

/**
 * ページ数カウントAPI
 * POST /api/count-pages
 */
router.post('/count-pages', validateUrlRouteHandler(async (req, res) => {
    const { url, auth } = req.body;
    const result = await countPages(url, auth);
    res.json(result);
}, 'Page counting'));

/**
 * サイト全体のクロール診断API
 * POST /api/crawl
 */
router.post('/crawl', validateUrlRouteHandler(async (req, res) => {
    const { startUrl, urls, auth } = req.body;
    const results = await crawlSite(startUrl, urls, auth);
    res.json(results);
}, 'Crawling', 'startUrl'));

/**
 * 画像プロキシAPI
 * GET /api/proxy-image?url=<image_url>&auth=<base64_encoded_credentials>
 */
router.get('/proxy-image', asyncRouteHandler(async (req, res) => {
    const { url, auth } = req.query;
    
    if (!url) {
        return sendErrorResponse(res, 400, 'Missing parameter', 'URL parameter is required');
    }

    // URLバリデーション
    try {
        new URL(url);
    } catch (e) {
        return sendErrorResponse(res, 400, 'Invalid URL', 'The provided URL is not valid');
    }

    // ヘッダーを準備
    const headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; Web-Site-Checker/2.0)',
    };

    // ベーシック認証が必要な場合
    if (auth) {
        try {
            // Base64でエンコードされた認証情報を使用
            headers['Authorization'] = `Basic ${auth}`;
        } catch (e) {
            console.warn('Invalid auth parameter:', e.message);
        }
    }

    // 画像を取得
    const response = await fetch(url, {
        headers,
        timeout: 10000,
    });

    if (!response.ok) {
        return sendErrorResponse(res, response.status, 'Fetch failed', `Failed to fetch image: ${response.statusText}`);
    }

    // Content-Typeをチェック（画像のみ許可）
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
        return sendErrorResponse(res, 400, 'Invalid content type', 'The requested resource is not an image');
    }

    // CORSヘッダーを設定
    res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Cross-Origin-Resource-Policy': 'cross-origin'
    });

    // 画像データをストリーミング
    response.body.pipe(res);
}, 'Image proxy'));

export default router;
