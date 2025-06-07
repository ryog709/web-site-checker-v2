# Web Site Checker v2

コーダーがURLを1つ入力するだけでサイト全ページをクロールし、LighthouseとWCAG 2.1 AA準拠状況を含む問題点を一目で確認できるダッシュボードを提供するツールです。

## 🚀 クイックスタート

### 1. インストール
```bash
# プロジェクトをクローン
git clone [リポジトリURL]
cd web-site-checker-v2

# 全ての依存関係を一括インストール
npm i
```

### 2. 開発サーバー起動
```bash
# バックエンドとフロントエンドを同時起動
npm run dev
```

これだけ！ブラウザで `http://localhost:5173` にアクセスして利用開始 🎉

## 📋 機能

### ✅ 自動診断機能
- **見出し構造の階層表示** - h1〜h6を階段状に視覚化
- **画像・リンク・メタ情報の問題検出**
- **アクセシビリティチェック** (WCAG 2.1 AA準拠)
- **レスポンシブ対応ダッシュボード**

### ✅ 分析オプション
- **単一ページ診断**: 指定URLの詳細分析
- **サイト全体クロール**: 同一ドメイン内最大30ページを自動巡回

### ✅ 技術仕様
- **Backend**: Node.js + Express + Puppeteer + Lighthouse
- **Frontend**: React + TypeScript + Vite
- **ポート**: Backend(4000) / Frontend(5173)

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

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | 4000 | APIサーバーのポート番号 |
| `MAX_PAGES` | 30 | クロール時の最大ページ数 |
| `IGNORE_ROBOTS` | `true` | robots.txt無視設定 |
| `CHECK_A11Y` | `true` | axe-core実行のON/OFF |

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### ポート競合エラー
```bash
# 使用中のプロセスを確認
lsof -ti:4000
lsof -ti:5173

# プロセスを停止
kill -9 [プロセスID]
```

#### Puppeteerエラー (macOS)
Chromeが見つからない場合は、以下を確認：
- Google Chromeがインストールされているか
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` にパスが通っているか

#### CORSエラー
バックエンドとフロントエンドが両方起動しているか確認してください。

## 📁 プロジェクト構造

```
web-site-checker-v2/
├── backend/              # Node.js APIサーバー
│   ├── src/
│   │   ├── server.js     # Express サーバー
│   │   └── services/     # 診断ロジック
│   └── package.json
├── frontend/             # React フロントエンド
│   ├── src/
│   │   ├── components/   # UIコンポーネント
│   │   ├── types/        # TypeScript型定義
│   │   └── App.tsx       # メインアプリ
│   └── package.json
├── package.json          # ルート設定（同時起動用）
└── README.md
```

## 🎯 使い方

1. **URLを入力**: 診断したいサイトのURLを入力
2. **モード選択**:
   - **単一ページ**: 1ページのみ詳細分析
   - **サイト全体**: 最大30ページをクロール分析
3. **結果確認**:
   - **見出し構造**: 階層表示で構造を把握
   - **画像**: alt属性やサイズ設定の問題
   - **リンク**: アクセシビリティとセキュリティ
   - **メタ情報**: SEO関連の設定状況
   - **アクセシビリティ**: WCAG準拠状況

## 🤝 開発者向け

### 新機能追加の流れ
1. バックエンドのAPI追加 (`backend/src/services/`)
2. フロントエンドの型定義更新 (`frontend/src/types/`)
3. UIコンポーネント実装 (`frontend/src/components/`)

### 主要ファイル
- `backend/src/services/checker.js`: 診断ロジックのメイン
- `frontend/src/components/TabContent.tsx`: 結果表示UI
- `frontend/src/types/index.ts`: TypeScript型定義

---

💡 **Tip**: 開発中は `npm run dev` で自動リロードが有効になります。ファイルを保存するだけで変更が反映されます！
# web-site-checker-v2
