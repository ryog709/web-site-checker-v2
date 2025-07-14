# Web Site Checker v2

コーダーが URL を 1 つ入力するだけでサイト全ページをクロールし、Lighthouse と WCAG 2.1 AA 準拠状況を含む問題点を一目で確認できるダッシュボードを提供するツールです。

## 🚀 クイックスタート

### 1. インストール

```bash
# プロジェクトをクローン
git clone [リポジトリURL]
cd web-site-checker-v2

# 全ての依存関係を一括インストール
npm install
```

### 2. 開発サーバー起動

```bash
# バックエンドとフロントエンドを同時起動
npm run dev
```

これだけ！ブラウザで `http://localhost:8080` にアクセスして利用開始 🎉

## 📋 機能

### ✅ 自動診断機能

- **見出し構造の階層表示** - h1〜h6 を階段状に視覚化
- **画像・リンク・メタ情報の問題検出**
- **アクセシビリティチェック** (WCAG 2.1 AA 準拠)
- **レスポンシブ対応ダッシュボード**

### ✅ 分析オプション

- **単一ページ診断**: 指定 URL の詳細分析
- **サイト全体クロール**: 同一ドメイン内最大 30 ページを自動巡回

### ✅ 技術仕様

- **Backend**: Node.js + Express + Puppeteer + Lighthouse + axe-core
- **Frontend**: React + TypeScript + Vite + Lucide React + Recharts
- **ポート**: Backend(4000) / Frontend(8080)

## 🔧 詳細セットアップ

### 個別起動したい場合

```bash
# バックエンドのみ起動
npm run dev:backend

# フロントエンドのみ起動
npm run dev:frontend
```

### 本番環境

```bash
# フロントエンドをビルド
npm run build

# 本番サーバー起動
npm start
```

## ⚙️ 環境変数

| 変数            | デフォルト | 説明                     |
| --------------- | ---------- | ------------------------ |
| `PORT`          | 4000       | API サーバーのポート番号 |
| `MAX_PAGES`     | 30         | クロール時の最大ページ数 |
| `IGNORE_ROBOTS` | `true`     | robots.txt 無視設定      |
| `CHECK_A11Y`    | `true`     | axe-core 実行の ON/OFF   |

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### ポート競合エラー

```bash
# 使用中のプロセスを確認
lsof -ti:4000
lsof -ti:8080

# プロセスを停止
kill -9 [プロセスID]
```

#### Puppeteer エラー (macOS)

Chrome が見つからない場合は、以下を確認：

- Google Chrome がインストールされているか
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` にパスが通っているか

#### CORS エラー

バックエンドとフロントエンドが両方起動しているか確認してください。

## 📁 プロジェクト構造

```
web-site-checker-v2/
├── backend/                    # Node.js APIサーバー
│   ├── __tests__/             # テストファイル
│   │   └── validation.test.js
│   ├── src/
│   │   ├── server.js          # Express サーバー
│   │   ├── routes/            # APIルート定義
│   │   │   └── check.js
│   │   ├── services/          # 診断ロジック
│   │   │   └── checker.js     # メイン診断サービス
│   │   └── utils/             # ユーティリティ
│   │       └── validation.js  # バリデーション機能
│   ├── jest.config.js         # テスト設定
│   ├── package.json
│   └── test-puppeteer.js      # Puppeteerテスト
├── frontend/                   # React フロントエンド
│   ├── public/
│   │   └── vite.svg
│   ├── src/
│   │   ├── components/        # UIコンポーネント
│   │   │   ├── Dashboard.tsx  # メインダッシュボード
│   │   │   ├── TabContent.tsx # 結果表示タブ
│   │   │   ├── UrlForm.tsx    # URL入力フォーム
│   │   │   ├── ScoreRing.tsx  # スコア表示リング
│   │   │   ├── SummaryCards.tsx # サマリーカード
│   │   │   ├── TabNavigation.tsx # タブナビゲーション
│   │   │   ├── Modal.tsx      # モーダルウィンドウ
│   │   │   └── LoadingSpinner.tsx # ローディング表示
│   │   ├── types/             # TypeScript型定義
│   │   │   ├── common.ts
│   │   │   └── index.ts
│   │   ├── utils/             # ユーティリティ
│   │   │   ├── api.ts         # API通信
│   │   │   └── imageUtils.ts  # 画像処理
│   │   ├── constants/         # 定数定義
│   │   │   └── axeTranslations.js # アクセシビリティ翻訳
│   │   ├── assets/            # 静的アセット
│   │   │   └── react.svg
│   │   ├── App.tsx            # メインアプリ
│   │   ├── App.css            # アプリスタイル
│   │   ├── main.tsx           # エントリーポイント
│   │   ├── index.css          # グローバルスタイル
│   │   └── vite-env.d.ts      # Vite型定義
│   ├── eslint.config.js       # ESLint設定
│   ├── tsconfig.json          # TypeScript設定
│   ├── tsconfig.app.json      # アプリ用TypeScript設定
│   ├── tsconfig.node.json     # Node.js用TypeScript設定
│   ├── vite.config.ts         # Vite設定
│   ├── package.json
│   └── README.md              # フロントエンド説明
├── .gitignore                 # Git除外設定
├── package.json               # ルート設定（同時起動用）
├── package-lock.json          # 依存関係ロック
├── CLAUDE.md                  # Claude設定ファイル
└── README.md                  # プロジェクト説明（このファイル）
```

## 🎯 使い方

1. **URL を入力**: 診断したいサイトの URL を入力
2. **モード選択**:
   - **単一ページ**: 1 ページのみ詳細分析
   - **サイト全体**: 最大 30 ページをクロール分析
3. **結果確認**:
   - **見出し構造**: 階層表示で構造を把握
   - **画像**: alt 属性やサイズ設定の問題
   - **リンク**: アクセシビリティとセキュリティ
   - **メタ情報**: SEO 関連の設定状況
   - **アクセシビリティ**: WCAG 準拠状況

## 🤝 開発者向け

### 新機能追加の流れ

1. バックエンドの API 追加 (`backend/src/services/checker.js`)
2. フロントエンドの型定義更新 (`frontend/src/types/`)
3. UI コンポーネント実装 (`frontend/src/components/`)

### 主要ファイル

- `backend/src/services/checker.js`: 診断ロジックのメイン（1655 行）
- `frontend/src/components/TabContent.tsx`: 結果表示 UI（1287 行）
- `frontend/src/types/index.ts`: TypeScript 型定義
- `frontend/src/utils/api.ts`: API 通信ロジック

### テスト

```bash
# バックエンドテスト実行
cd backend && npm test

# フロントエンドのリント実行
cd frontend && npm run lint
```

### コード整形

```bash
# バックエンドのコード整形
cd backend && npm run format

# フロントエンドのコード整形
cd frontend && npm run format
```

---

💡 **Tip**: 開発中は `npm run dev` で自動リロードが有効になります。ファイルを保存するだけで変更が反映されます！

## 📦 依存関係

### Backend 主要パッケージ

- **Express**: Web サーバーフレームワーク
- **Puppeteer**: ブラウザ自動化
- **Lighthouse**: サイト品質測定
- **axe-core**: アクセシビリティ検証
- **Cheerio**: HTML パース・操作

### Frontend 主要パッケージ

- **React 19**: UI ライブラリ
- **TypeScript**: 型安全性
- **Vite**: 高速ビルドツール
- **Lucide React**: アイコンライブラリ
- **Recharts**: グラフ・チャート表示
