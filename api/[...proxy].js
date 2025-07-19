// Vercel API route to proxy all API requests to the backend server
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Simple response for now - will be replaced with actual backend logic
  res.status(200).json({
    message: 'API is working',
    path: req.url,
    method: req.method
  });
}