import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import checkRoutes from './routes/check.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// セキュリティミドルウェア
app.use(helmet());

// CORS設定
const getAllowedOrigins = () => {
    if (process.env.NODE_ENV === 'production') {
        // 本番環境では Vercel フロントエンドのドメインを許可
        return [
            // 実際のフロントエンドドメイン
            'https://web-site-checker-v2-frontend-pri1ga917-ryog709s-projects.vercel.app',
            // その他の可能性があるVercelドメイン
            'https://web-site-checker-v2.vercel.app',
            'https://web-site-checker-v2-git-main-ryog709s-projects.vercel.app',
            'https://web-site-checker-v2-ryog709s-projects.vercel.app',
            // Vercelプレビュードメインパターン
            /^https:\/\/web-site-checker-v2.*\.vercel\.app$/
        ];
    } else {
        // 開発環境では localhost を許可
        return [
            'http://localhost:8080',
            'http://127.0.0.1:8080'
        ];
    }
};

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();

        // リクエストにoriginがない場合（例：Postmanやcurl）は許可
        if (!origin) return callback(null, true);

        // 許可リストをチェック
        const isAllowed = allowedOrigins.some(allowedOrigin => {
            if (typeof allowedOrigin === 'string') {
                return allowedOrigin === origin;
            } else if (allowedOrigin instanceof RegExp) {
                return allowedOrigin.test(origin);
            }
            return false;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Access-Control-Allow-Headers'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    optionsSuccessStatus: 200 // IEの古いバージョン対応
}));

// JSON解析
app.use(express.json({
    limit: '10mb'
}));

// プリフライトリクエストの明示的対応
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

// ログ出力ミドルウェア
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const method = req.method;

    // CORS関連のログを出力
    if (origin) {
        console.log(`🌐 Request from origin: ${origin} | Method: ${method}`);
    }

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
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// エラーハンドリング
app.use((err, req, res, _next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404ハンドリング
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Web Site Checker v2 Backend running on port ${PORT}`);
    console.log(`📊 Max pages: ${process.env.MAX_PAGES || 30}`);
    console.log(`🤖 Ignore robots.txt: ${process.env.IGNORE_ROBOTS || true}`);
    console.log(`♿ Check accessibility: ${process.env.CHECK_A11Y || true}`);
});