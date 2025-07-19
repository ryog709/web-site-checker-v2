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
      body: req.body,
      headers: req.headers
    });

    // Try to import backend modules
    let checkSinglePage, validateUrl;
    
    try {
      const checkerModule = await import('../backend/src/services/checker.js');
      checkSinglePage = checkerModule.checkSinglePage;
      console.log('Successfully imported checker module');
    } catch (importError) {
      console.error('Failed to import checker module:', importError);
      return res.status(500).json({ 
        error: 'Module import error', 
        message: `Failed to import checker: ${importError.message}`,
        stack: importError.stack
      });
    }

    try {
      const validationModule = await import('../backend/src/utils/validation.js');
      validateUrl = validationModule.validateUrl;
      console.log('Successfully imported validation module');
    } catch (importError) {
      console.error('Failed to import validation module:', importError);
      return res.status(500).json({ 
        error: 'Module import error', 
        message: `Failed to import validation: ${importError.message}`,
        stack: importError.stack
      });
    }

    const { url, auth } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // URL バリデーション
    const validationError = validateUrl(url);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    console.log(`Starting single page check for: ${url}`);
    
    // 診断実行
    const result = await checkSinglePage(url, auth);
    
    console.log(`Check completed for: ${url}`);
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