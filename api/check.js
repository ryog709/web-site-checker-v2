// Simple URL validation function
function validateUrl(url) {
  try {
    new URL(url);
    return null; // No error
  } catch (error) {
    return 'Invalid URL format';
  }
}

// Simplified web page analysis
async function analyzeWebPage(url) {
  try {
    console.log(`Fetching page: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebSiteChecker/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Basic HTML analysis
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title found';
    
    const descMatch = html.match(/<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']+)["\'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : 'No description found';
    
    // Count basic elements
    const headings = (html.match(/<h[1-6][^>]*>/gi) || []).length;
    const images = (html.match(/<img[^>]*>/gi) || []).length;
    const links = (html.match(/<a[^>]*href[^>]*>/gi) || []).length;
    
    return {
      url,
      timestamp: new Date().toISOString(),
      scores: {
        performance: 75, // Mock scores for now
        accessibility: 80,
        bestpractices: 85,
        seo: 70
      },
      issues: {
        headings: [],
        headingsStructure: [
          { level: 1, tag: 'h1', text: title, index: 1, images: [], hasImage: false, isEmpty: false }
        ],
        images: [],
        allImages: [],
        links: [],
        meta: [],
        allMeta: [
          { type: 'title', name: 'title', content: title, length: title.length },
          { type: 'description', name: 'description', content: description, length: description.length }
        ],
        htmlStructure: [],
        accessibility: {
          lighthouse: [],
          axe: []
        },
        consoleErrors: []
      },
      basicStats: {
        title,
        description,
        headingsCount: headings,
        imagesCount: images,
        linksCount: links,
        htmlSize: html.length
      }
    };
  } catch (error) {
    throw new Error(`Failed to analyze page: ${error.message}`);
  }
}

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
    console.log('API check called with:', {
      method: req.method,
      body: req.body
    });

    const { url, auth } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // URL validation
    const validationError = validateUrl(url);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Starting simplified page analysis for: ${url}`);
    
    // Simplified analysis without Puppeteer/Lighthouse
    const result = await analyzeWebPage(url);
    
    console.log(`Analysis completed for: ${url}`);
    res.json(result);
    
  } catch (error) {
    console.error('Error in /api/check:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack
    });
  }
}