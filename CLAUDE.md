# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Web Site Checker v2は、ウェブサイトのアクセシビリティ問題、SEO、その他のウェブ標準を分析するフルスタックWebアプリケーションです。PuppeteerとLighthouseを使用して、単一ページまたはサイト全体（最大30ページ）をクロールし分析します。

## アーキテクチャ

- **Backend**: Node.js (ESM) + Express + Puppeteer + Lighthouse + axe-core
- **Frontend**: React + TypeScript + Vite
- **ポート**: Backend (4000), Frontend (8080)

### 主要コンポーネント

- `backend/src/services/checker.js`: Puppeteer/Lighthouseを使用したメイン分析エンジン（1655行）
- `backend/src/routes/check.js`: 分析リクエスト用のAPIエンドポイント
- `frontend/src/types/index.ts`: 共有TypeScriptインターフェース
- `frontend/src/components/Dashboard.tsx`: メイン結果表示UI
- `frontend/src/components/TabContent.tsx`: タブで整理された分析結果（1287行）

### 分析機能

- 単一ページ分析 vs サイト全体クロール
- 見出し構造分析（h1-h6階層）
- 画像分析（alt属性、寸法、WebP代替、遅延読み込み、位置情報）
- リンクアクセシビリティチェック
- メタ情報検証
- WCAG 2.1 AAアクセシビリティ準拠

## 開発コマンド

### セットアップと開発
```bash
# 全ての依存関係をインストール
npm i

# バックエンドとフロントエンドを同時起動
npm run dev

# 個別起動
npm run dev:backend
npm run dev:frontend
```

### テストと品質管理
```bash
# バックエンドテスト
cd backend && npm test

# リンティング
cd backend && npm run lint
cd frontend && npm run lint

# フォーマット
cd backend && npm run format
cd frontend && npm run format
```

### ビルドと本番環境
```bash
# フロントエンドをビルド
npm run build

# 本番サーバー起動
npm start
```

## 環境変数

| 変数 | デフォルト | 説明 |
|----------|---------|-------------|
| `PORT` | 4000 | バックエンドAPIポート |
| `MAX_PAGES` | 30 | クロールする最大ページ数 |
| `IGNORE_ROBOTS` | true | robots.txtを無視 |
| `CHECK_A11Y` | true | axe-coreアクセシビリティチェックを有効化 |

## データフロー

1. フロントエンドが`/api/check`（単一ページ）または`/api/crawl`（サイト全体）にURLを送信
2. バックエンドがURLを検証（HTTPS必須、localhost禁止）しPuppeteerブラウザを起動
3. 分析実行:
   - DOM解析: Cheerioで見出し、画像、リンク、メタ情報を抽出
   - Lighthouse監査: パフォーマンス、アクセシビリティ、SEO、ベストプラクティス
   - axe-coreアクセシビリティチェック: WCAG 2.1 AA準拠
4. `types/index.ts`のTypeScriptインターフェースに従って結果をフォーマット
5. フロントエンドがタブ形式のダッシュボードインターフェースで結果を表示

## テスト実行

```bash
# バックエンドテスト（単体）
cd backend && npm test

# 特定のテストファイル実行
cd backend && npm test -- validation.test.js
```

## よくある問題と解決方法

### Puppeteer関連
- macOSで`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`にChromeが必要
- ブラウザ起動エラー時は`backend/src/services/checker.js`の`getChromeExecutablePath()`を確認

### CORS問題
- 開発環境ではlocalhost:8080（フロントエンド）からlocalhost:4000（バックエンド）へのアクセスが許可済み
- 画像プロキシエンドポイント（`/api/proxy-image`）が外部画像のCORS問題を処理

### URL処理
- 相対画像URL解決に`backend/src/utils/url-utils.js`のヘルパー関数を使用
- WordPressサイトの特殊なURL（`/feed/`, `/comments/`等）は自動フィルタリング

## Claude Code開発ワークフロー

### 推奨アプローチ（公式ベストプラクティス準拠）

#### 1. 探索 → 計画 → 実装 → コミット (Explore, Plan, Code, Commit)
```bash
# ステップ1: 関連ファイルを読んで理解
# - 既存のchecker.js構造を分析
# - 型定義ファイル確認
# - テストパターン確認

# ステップ2: 詳細な計画作成
# - 段階的リファクタリング計画
# - 新旧並行実行での安全確認
# - 各モジュールの分割方針

# ステップ3: 段階的実装
# - 1つのモジュールずつ分離
# - 既存機能を維持
# - テスト結果の同値確認

# ステップ4: 明確な説明でコミット
# - 各段階の変更内容を明記
# - 新旧比較結果をコミットメッセージに含める
```

#### 2. テスト駆動開発（TDD）
```bash
# ステップ1: テスト作成（分析モジュール用）
cd backend && npm test -- --grep "domAnalyzer"

# ステップ2: テストが失敗することを確認
# ステップ3: 最小限の実装でテストをパス
# ステップ4: オーバーフィッティング回避の確認
```

### 現在のPhase 2実装優先順位

#### 即座実行タスク（公式手法適用）
1. **探索**: `backend/src/services/checker.js`の詳細分析
2. **計画**: モジュール分割の詳細設計書作成
3. **実装**: `domAnalyzer.js`の段階的作成
4. **コミット**: 新旧比較結果付きコミット

#### 具体的な次回セッション手順
```bash
# 現状確認（2分）
npm run dev
curl -X POST http://localhost:4000/api/check -H "Content-Type: application/json" -d '{"url": "https://example.com"}'

# 詳細探索（5分）
# checker.js の関数構造分析
# types/index.ts の型定義確認

# 計画作成（10分）
# 段階的分割計画の作成
# 安全確認手順の設計

# 実装開始（30分）
# domAnalyzer.js の作成
# 新旧並行実行での検証
```

## コードスタイルガイドライン

### ESModules使用
- `import/export`構文使用
- `package.json`で`"type": "module"`設定済み

### エラーハンドリング
- 構造化エラー（GeminiApiError等）使用
- 適切なHTTPステータス返却

### ファイル命名規則
- バックエンド: `.js`（ESM）
- フロントエンド: `.tsx/.ts`（TypeScript）
- 設定ファイル: camelCase

### Git コミット規則
- 機能追加: `feat: 機能説明`
- バグ修正: `fix: 修正内容`
- リファクタリング: `refactor: 変更内容`
- ドキュメント: `docs: 文書更新内容`

## セキュリティとプライバシー

### 機密情報管理
- `.env`ファイルでAPI key管理
- ログでAuth情報をマスキング
- 画像プロキシでドメイン制限

### HTTPS要求
- 本番環境では HTTPS URL のみ許可
- localhost以外での開発環境アクセス禁止