# Web Site Checker v2 プロジェクト概要

## プロジェクトの目的
ウェブサイトのアクセシビリティ、SEO、パフォーマンス、ベストプラクティスを包括的に分析するフルスタックWebアプリケーション。開発者がURLを入力するだけで、サイト全体の問題点を一目で確認できる。

## 技術スタック

### Backend (Node.js ESM)
- **Express**: APIサーバー（ポート4000）
- **Puppeteer v23.9.0**: ブラウザ自動化
- **Lighthouse v11.4.0**: パフォーマンス測定
- **axe-core v4.8.3**: WCAG 2.1 AAアクセシビリティ検証
- **Cheerio**: HTML解析

### Frontend (React + TypeScript)
- **React v19.1.0**: UIライブラリ
- **TypeScript v5.8.3**: 型安全性
- **Vite v6.3.5**: ビルドツール（ポート8080）
- **Lucide React**: アイコンライブラリ
- **Recharts**: グラフ表示

## ディレクトリ構造

```
backend/
├── src/
│   ├── server.js            # Expressサーバーエントリポイント
│   ├── routes/
│   │   └── check.js         # APIエンドポイント定義
│   ├── services/
│   │   └── checker.js       # 分析エンジン (1655行)
│   └── utils/
│       ├── validation.js    # URL検証
│       ├── url-utils.js     # URL処理ヘルパー
│       └── error-handler.js # エラーハンドリング

frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx    # メインダッシュボード
│   │   ├── TabContent.tsx   # タブ表示 (1287行)
│   │   ├── UrlForm.tsx      # URL入力フォーム
│   │   └── ...他14コンポーネント
│   ├── types/
│   │   └── index.ts         # TypeScript型定義
│   ├── utils/
│   │   └── api.ts           # API通信
│   └── hooks/               # カスタムフック
```

## 主要機能

### 分析機能
1. **単一ページ分析** (`/api/check`)
2. **サイト全体クロール** (`/api/crawl`) - 最大30ページ
3. **ページ数カウント** (`/api/count-pages`)
4. **画像プロキシ** (`/api/proxy-image`) - CORS回避

### 分析内容
- **Lighthouse スコア**: パフォーマンス、アクセシビリティ、SEO、ベストプラクティス
- **見出し構造**: h1-h6の階層分析
- **画像分析**: alt属性、寸法、WebP代替、遅延読み込み、位置情報
- **リンク分析**: アクセシビリティ、セキュリティ
- **メタ情報**: SEO関連タグ
- **アクセシビリティ**: WCAG 2.1 AA準拠（axe-core）

## データフロー
1. Frontend: URLフォーム送信
2. Backend: URL検証（HTTPS必須、localhost禁止）
3. Puppeteer: ブラウザ起動・ページ読み込み
4. 分析実行: DOM解析、Lighthouse、axe-core
5. 結果フォーマット: TypeScript型に準拠
6. Frontend: ダッシュボード表示（タブ形式）

## 特徴的な実装
- OS別Chrome実行パス自動検出
- WordPressサイト特殊URL自動フィルタ
- 日本語対応（エラーメッセージ、UIテキスト）
- リトライ機能付きブラウザ起動
- Basic認証サポート