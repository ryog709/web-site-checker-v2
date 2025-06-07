import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import checkRoutes from './routes/check.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// セキュリティミドルウェア
app.use(helmet());

// CORS設定
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? false 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// JSON解析
app.use(express.json({ limit: '10mb' }));

// ログ出力ミドルウェア
app.use((req, res, next) => {
  const curlCommand = `curl -X ${req.method} "${req.protocol}://${req.get('host')}${req.originalUrl}"`;
  if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
    console.info(`${curlCommand} -H "Content-Type: application/json" -d '${JSON.stringify(req.body)}'`);
  } else {
    console.info(curlCommand);
  }
  next();
});

// ルート設定
app.use('/api', checkRoutes);

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// エラーハンドリング
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404ハンドリング
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Web Site Checker v2 Backend running on port ${PORT}`);
  console.log(`📊 Max pages: ${process.env.MAX_PAGES || 30}`);
  console.log(`🤖 Ignore robots.txt: ${process.env.IGNORE_ROBOTS || true}`);
  console.log(`♿ Check accessibility: ${process.env.CHECK_A11Y || true}`);
});