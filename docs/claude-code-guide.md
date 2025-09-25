# Claude Code 実装ガイド - 公式ベストプラクティス準拠

## 🎯 このガイドの目的
公式ベストプラクティス「探索 → 計画 → 実装 → コミット」に従い、Claude Codeが安全で効率的な開発を実行できるよう具体的な手順を提供します。

## 📚 公式ベストプラクティス適用

### 0. コンテキスト同期 (必須)
- `docs/session-notes.md` を最初に読み、当日の前提・Pending TODO・検証コマンドを確認する
- `docs/progress-log.md` を参照し、前回のテスト結果と差分を把握する
- 作業開始前に `implementation-roadmap.md` の Phase 2.1 DONE 条件を見直す

### 1. 探索フェーズ (Explore)
**目的**: 現在の責務分担と依存関係を理解する
**推奨時間**: 5-10分

必読ファイル:
```
backend/src/services/checker.js
backend/src/services/pipeline/runAnalysis.js
backend/src/services/pipeline/analyzers/*
backend/src/services/browser/browserPool.js
backend/src/routes/check.js
backend/test/pipeline-integration-test.js
```

### 2. 計画フェーズ (Plan)
**目的**: 作業単位・検証方法を明文化する
**推奨時間**: 10-15分

計画時のチェックリスト:
- 影響するAPI（`/api/check`, `/api/crawl`, `/api/count-pages`）と互換条件
- 実行するテスト／curl コマンドと期待結果
- 更新が必要なドキュメント（session-notes, progress-log, roadmap）

### 3. 実装フェーズ (Code)
**目的**: 小さな変更単位で実装し、逐次検証する
**推奨時間**: 30-60分
- ブラウザプールやAI呼び出しの副作用に注意
- 大量ログはサマリ化し、関連ファイルへ記録

### 4. コミットフェーズ (Commit)
**目的**: 再現性ある説明と検証証跡を残す
- フォーマット例: `refactor: migrate /api/check to AnalysisPipeline (compat verified)`
- `docs/progress-log.md` にテスト結果を追記してからコミットする

---

## 📋 Phase 2 実装手順（最新版）

### Step A: パイプライン互換レイヤー整備
- `AnalysisPipeline` の出力を旧レスポンス形式に変換する `legacyResultMapper` を実装
- `checker.js` は `AnalysisPipeline` を呼び出しつつ互換レスポンスを返す薄いラッパーに留める
- `backend/test/pipeline-integration-test.js` で旧実装との比較ログを取得し、`progress-log.md` に記録

### Step B: `/api/check` 切り替え
- `routes/check.js` は当面 `checkSinglePage` を呼び出し、互換性が確認できた段階でパイプラインを直接利用
- `auth` 付きサイト・`analysisTypes` 指定のテストを curl で実施し、結果を `session-notes.md` に反映

### Step C: `/api/crawl`・`/api/count-pages` 移行
- `pipeline/crawlPipeline.js` と `pipeline/countPipeline.js` を新設し、URL 発見・並列処理・統計を共通化
- 旧 `crawlSite` / `countPages` の挙動と差分がないか比較テストを実施
- ブラウザプールのリソース開放が正しく行われることをログで確認

### Step D: LangChain 導入準備
- Analyzer の共通インターフェースを定義し、LangChain の Tool へマッピングしやすい形へ整理
- `GeminiService` を薄いアダプター化し、LangChain LLMChain へ切り替えるポイントをコメントで明示
- Phase 2.1 完了後に LangChain 導入の PoC を行い、成果を roadmap に追記

（旧 Step 1-4 の詳細は履歴に残っているため、必要に応じて `git history` から参照）

> 実装例やコードスニペットは実装状況と乖離しやすいため、詳細が必要な場合は最新のソースコード（`backend/src/services/pipeline/*.js`）を直接参照すること。

## 🔧 実装時の注意点

### ファイル移植時のルール
1. **既存機能の保持**: checker.js の関数をコピーして段階的に移植
2. **テスト確認**: 各ステップで既存のテスト結果と同値であることを確認
3. **エラーハンドリング**: 既存のエラー処理パターンを維持
4. **依存関係**: 既存のimport文とユーティリティ関数を適切に移植

### 段階的移行パターン
```javascript
// Phase 1: 新旧並行実行（安全確認）
const oldResult = await checkSinglePage(url, auth);  // 既存
const newResult = await pipeline.runAnalysis(url, options);  // 新規

// 結果比較ログ出力
console.log('Result comparison:', {
  scoresMatch: deepEqual(oldResult.scores, newResult.scores),
  issuesMatch: oldResult.issues.length === newResult.issues.length
});

// Phase 2: 新システムのみ使用（既存をコメントアウト）
// const oldResult = await checkSinglePage(url, auth);
const newResult = await pipeline.runAnalysis(url, options);
```

### デバッグ用ログ設定
```javascript
// 各分析段階での詳細ログ
console.log('[DomAnalyzer] Starting DOM analysis for:', url);
console.log('[LighthouseAnalyzer] Performance score:', scores.performance);
console.log('[GeminiService] AI analysis type:', analysisType);
console.log('[BrowserPool] Active browsers:', this.activeBrowsers);
```

---

## 📊 進捗確認方法

### Step完了の判定基準
1. **Step A**: `legacyResultMapper` で旧レスポンスと完全一致（scores / issues / semanticAnalysis / siteLinks / consoleErrors）
2. **Step B**: `/api/check` を新パイプラインへ切り替えても curl 比較で同一結果、auth ケースも成功
3. **Step C**: `/api/crawl` `/api/count-pages` のレスポンスが旧実装と一致し、BrowserPool のリソースリークが無い
4. **Step D**: Analyzer インターフェースと Gemini アダプターが LangChain 互換に整理され、PoC に着手できる状態

### テスト用URL
```javascript
// 確認用テストURL（複雑さ別）
const testUrls = [
  'https://example.com',  // シンプル
  'https://achangeofair.com/nijo/',  // 実際のサイト
  'https://www.w3.org/WAI/WCAG21/quickref/'  // 複雑なサイト
];
```

---

## 🚀 次回セッション開始手順

### 1. 現状確認（2分）
```bash
# サーバー起動確認
cd /Users/ryog/project/web-site-checker-v2
npm run dev

# 既存機能確認
curl -X POST http://localhost:4000/api/check \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

### 2. Step 1実装開始（即座）
```bash
# ディレクトリ作成
mkdir -p backend/src/services/pipeline/analyzers

# domAnalyzer.js作成開始
# checker.js の analyzeHeadings() 関数を参照して移植
```

### 3. 進捗追跡
```bash
# TodoWriteでStep進捗を更新
# 各Stepの完了確認とテスト実行
```

---

## 📁 ファイル構成の最終目標

```
backend/src/services/
├── pipeline/
│   ├── runAnalysis.js         ✅ Step 4
│   └── analyzers/
│       ├── domAnalyzer.js     ✅ Step 1
│       ├── lighthouseAnalyzer.js ✅ Step 2
│       └── axeAnalyzer.js     🔄 次期実装
├── browser/
│   └── browserPool.js         ✅ Step 3
├── ai/                        ✅ 既存維持
│   ├── geminiService.js
│   └── promptBuilder.js
└── checker.js                 🔄 段階的に機能移行
```

このガイドにより、Claude Codeは次回セッションで迷うことなく具体的な実装に着手できます。
