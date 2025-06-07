import express from 'express';
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

export default router;