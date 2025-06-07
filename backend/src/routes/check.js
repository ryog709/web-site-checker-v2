import express from 'express';
import fetch from 'node-fetch';
import { checkSinglePage, crawlSite } from '../services/checker.js';
import { validateUrl } from '../utils/validation.js';

const router = express.Router();

/**
 * 単一ページの診断API
 * POST /api/check
 */
router.post('/check', async (req, res) => {
  try {
    const { url } = req.body;
    
    // URL バリデーション
    const validationError = validateUrl(url);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await checkSinglePage(url);
    res.json(result);
  } catch (error) {
    console.error('Check API Error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: error.message 
    });
  }
});

/**
 * サイト全体のクロール診断API
 * POST /api/crawl
 */
router.post('/crawl', async (req, res) => {
  try {
    const { startUrl, maxPages = process.env.MAX_PAGES || 30 } = req.body;
    
    // URL バリデーション
    const validationError = validateUrl(startUrl);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    // maxPages バリデーション
    if (maxPages > 50) {
      return res.status(400).json({ 
        error: 'Max pages cannot exceed 50 for performance reasons' 
      });
    }

    const results = await crawlSite(startUrl, maxPages);
    res.json(results);
  } catch (error) {
    console.error('Crawl API Error:', error);
    res.status(500).json({ 
      error: 'Crawling failed',
      message: error.message 
    });
  }
});

/**
 * 画像プロキシAPI
 * GET /api/proxy-image?url=<image_url>
 */
router.get('/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // URLバリデーション
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL' });
    }

    // 画像を取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Web-Site-Checker/2.0)',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: `Failed to fetch image: ${response.statusText}` 
      });
    }

    // Content-Typeをチェック（画像のみ許可）
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return res.status(400).json({ error: 'Not an image' });
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

  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to proxy image',
      message: error.message 
    });
  }
});

export default router;