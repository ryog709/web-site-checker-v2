import { countPages } from '../backend/src/services/checker.js';
import { validateUrl } from '../backend/src/utils/validation.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url, auth } = req.body;
    
    // URL バリデーション
    const validationError = validateUrl(url);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Starting page count for: ${url}`);
    
    // ページ数カウント実行
    const result = await countPages(url, auth);
    
    console.log(`Page count completed for: ${url}, found: ${result.totalPages} pages`);
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/count-pages:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}