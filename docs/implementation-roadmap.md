# Web Site Checker v2 - 実装ロードマップ

## 長期ゴール
- LangChain を核とする分析パイプラインを構築し、旧来の品質チェック精度を維持しつつさらに深い洞察と一貫したスコアリングを提供する
- 新パイプラインへの移行過程でも既存 API の互換性と信頼性を担保し、ユーザー体験を変えずに高度化を進める

## 現状分析（Phase 1完了）

### ✅ 実装済み機能
- 基本的なGemini AI分析（content-quality分析）
- Puppeteer + Lighthouse + axe-core の統合分析
- JSON形式のマークダウン除去処理
- レート制限・回路ブレーカー・リトライ機構
- 分析結果UI表示（Dashboard.tsx, SemanticAnalysis.tsx）

### ⚠️ 現状の課題
- `backend/src/services/checker.js` が1800行の巨大ファイル（分割必要）
- 分析機能が単一モジュールに集約（スケール・変更耐性が弱い）
- キャッシュがプロセス内メモリのみ（永続化なし）
- バッチ処理・履歴機能なし

---

## アーキテクチャ設計（推奨パターン）

### 1. 分析パイプライン化（Pipeline + Strategy パターン）
```
Fetch/Render → Analyzers → Aggregator → Optional AI → Cache/Store
   ↓              ↓           ↓           ↓         ↓
Puppeteer    [Lighthouse]  結果統合    Gemini    Redis/DB
             [axe-core]
             [DOM解析]
```

### 2. リソース隔離（Worker + Browser Pool）
- バッチ・クロール: ジョブキュー（BullMQ）で非同期処理
- Puppeteerブラウザプール: 起動コスト削減、並列制御
- 進捗通知: SSE/WebSocket

### 3. キャッシュ層（二段構え）
- **分析結果キャッシュ**: `URL + contentHash + analyzerVersion + options`
- **フェッチキャッシュ**: HTML/レスポンスヘッダ短期保存

### 4. APIリソース設計
```
POST /analysis     # 同期: 単一ページ
POST /jobs         # 非同期: バッチ/クロール
GET /jobs/:id      # 進捗確認
GET /results/:id   # 最終結果
POST /reports      # エクスポート
```

---

## ディレクトリ構成（改善提案）

### バックエンド構成
```
backend/src/
├── app.ts                    # Express初期化
├── config/                   # 環境設定
│   ├── env.ts
│   ├── cors.ts
│   ├── puppeteer.ts
│   └── queue.ts
├── routes/                   # APIルート
│   ├── analysis.routes.ts
│   ├── jobs.routes.ts
│   ├── reports.routes.ts
│   └── assets.routes.ts
├── controllers/              # ビジネスロジック制御
│   ├── analysis.controller.ts
│   ├── jobs.controller.ts
│   └── reports.controller.ts
├── services/                 # コアサービス
│   ├── pipeline/
│   │   ├── runAnalysis.ts    # パイプライン統合
│   │   └── analyzers/
│   │       ├── lighthouseAnalyzer.ts
│   │       ├── axeAnalyzer.ts
│   │       ├── domAnalyzer.ts
│   │       └── linkDiscovery.ts
│   ├── ai/                   # 既存AI機能
│   │   ├── geminiService.js
│   │   └── promptBuilder.js
│   ├── browser/
│   │   ├── browserPool.ts    # ブラウザプール管理
│   │   └── pageUtils.ts
│   ├── cache/
│   │   └── resultCache.ts    # Redis/DB抽象化
│   ├── export/
│   │   ├── pdfReport.ts
│   │   └── csvReport.ts
│   └── templates/
│       └── templateService.ts
├── workers/                  # 非同期処理
│   ├── queue.ts
│   └── analysis.worker.ts
└── repos/                    # データアクセス
    ├── analysisRepo.ts
    ├── jobRepo.ts
    └── pageRepo.ts
```

### フロントエンド構成
```
frontend/src/
├── api/                      # APIクライント
│   ├── client.ts
│   ├── analysis.ts
│   ├── jobs.ts
│   └── reports.ts
├── features/                 # 機能別コンポーネント
│   ├── analysis/             # 既存Dashboard等
│   ├── jobs/                 # 進捗/履歴UI
│   ├── reports/              # エクスポートUI
│   └── templates/            # カスタムテンプレート
├── store/                    # 状態管理
│   └── jobStore.ts
├── pages/                    # ページコンポーネント
│   ├── Top.tsx
│   ├── History.tsx
│   ├── Compare.tsx
│   └── Batch.tsx
└── types/                    # 既存型定義継続
```

---

## Phase 2: Advanced Analysis（実装順序）

### 2.1 パイプライン抽象化 + analyzer分割（最優先）
**ステータス**: 🔄 再実装フェーズ（2025-09-25 21:30 調査完了、パイプライン実装完全不在確認）

**目標**: `checker.js` の責務を Analyzer / Pipeline / legacyResultMapper に移譲し、LangChain 活用に向けた互換レイヤーを整備。既存 API レスポンスと完全同値を維持。

**調査結果（2025-09-25）**:
- git履歴・reflog・stash すべて検索 → `AnalysisPipeline` / `LighthouseAnalyzer` / `legacyResultMapper` 実装なし
- **結論**: パイプライン実装を完全新規作成（Codex CLI提案の段階的アプローチ採用）

**完了条件 (DONE)**
- [ ] `/api/check` と `/api/check-pipeline` のレスポンス差分がゼロ（scores / issues / semanticAnalysis / siteLinks / consoleErrors / auth）
- [ ] `auth` 付きサイト・CORS 前提のケースで従来と同じ挙動を curl で確認し、`docs/progress-log.md` に実行結果を記録済み
- [ ] DOM / Lighthouse / Axe / Gemini の各結果が旧実装と同値（fallback スコアや空配列になっていない）
- [ ] `collectSiteLinks`・`collectConsoleErrors` が pipeline で機能し、0 件でも証跡を残している
- [ ] `docs/progress-log.md` に比較ログ・実行日時・検証コマンドを記録し、レビュー前にチェックリストを満たしたことを明示

**再実装タスクブレークダウン（優先度順・Codex CLI提案）**

**Step A: 基盤構築（完了）**
- [x] `legacyResultMapper.js` 整備（旧APIレスポンスを新パイプラインにマッピング）
- [x] `AnalysisPipeline/index.js` 実装（Gemini連携・エラーハンドリング含む）
- [x] layout / w3c / form / metadata を含む各アナライザ実装・UI連携

**Step B: `/api/check` 互換検証と切り替え（着手中）**
- [ ] 代表URL複数で `/api/check` vs `/api/check-pipeline` の JSON diff 取得・差分分析
- [ ] 差分解消（mapper調整 / legacy fallback 見直し / UI 表示確認）
- [ ] `progress-log.md` に検証結果・証跡（Lighthouse/Gemini/axe/siteLinks/consoleErrors/auth/新セクション）を記録
- [ ] `/api/check` エンドポイントを新パイプラインに切り替え、回帰テスト（curl + frontend）
- [ ] ドキュメント更新（session-notes, roadmap, APIテスト手順）

**Step C: `/api/crawl` / `/api/count-pages` への展開（次フェーズ）**
- [ ] パイプライン対応の設計・互換検証
- [ ] BrowserPool 監視とリソース制御

**対象ファイル**
```
backend/src/services/pipeline/runAnalysis.js
backend/src/services/pipeline/analyzers/domAnalyzer.js
backend/src/services/pipeline/analyzers/lighthouseAnalyzer.js
backend/src/services/pipeline/analyzers/axeAnalyzer.js
backend/src/services/browser/browserPool.js
backend/src/services/checker.js
backend/src/routes/check.js
backend/test/pipeline-integration-test.js
```

**検証**: 差分比較ログ、curl テンプレート、E2E 起動確認

### 2.2 usability/comprehensive分析追加
**目標**: promptBuilder.js拡張、analysisType複数対応
```javascript
// API呼び出し例
POST /analysis?types=content-quality,usability,comprehensive
```

### 2.3 分析結果キャッシュ永続化
**目標**: Redis/DB対応、キャッシュキー設計
```javascript
// キャッシュキー例
`analysis:${url}:${contentHash}:${analysisType}:${analyzerVersion}`
```

### 2.4 パフォーマンス最適化
**目標**: 並列処理、タイムアウト、重試行機構

---

## Phase 3: Enterprise Features（実装順序）

### 3.1 ジョブキュー + 非同期API
**目標**: BullMQ導入、進捗配信（SSE/WebSocket）

### 3.2 バッチURL処理
**目標**: CSV/リスト入力 → ジョブ投入

### 3.3 レポート出力（PDF/CSV）
**目標**: サーバ側生成、ダウンロード機能

### 3.4 履歴保存/比較機能
**目標**: DBスキーマ設計、比較API、UI実装

### 3.5 カスタム分析テンプレート
**目標**: AIプロンプト/Analyzerセット保存・適用

---

## データモデル（最小構成）

```typescript
interface Job {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  type: 'single' | 'batch' | 'crawl';
  input: {
    urls: string[];
    analysisTypes: string[];
  };
  progress: number;
  createdAt: Date;
}

interface Result {
  id: string;
  jobId?: string;
  url: string;
  timestamp: Date;
  scores: LighthouseScores;
  issues: IssueBase[];
  ai: {
    contentQuality?: GeminiContentQuality;
    usability?: GeminiUsabilityInsights;
    comprehensive?: GeminiComprehensiveAnalysis;
  };
  meta: {
    contentHash: string;
    analyzerVersion: string;
  };
}

interface Template {
  id: string;
  name: string;
  analysisTypes: string[];
  geminiPromptOverrides: Record<string, string>;
}
```

---

## 着手の具体的次アクション

### 即座に実行可能
1. **checker.js分割開始**
   - `domAnalyzer.ts` を先行作成（見出し/画像/リンク分析）
   - `lighthouseAnalyzer.ts` でLighthouse実行部分を抽出
   - `browserPool.ts` でPuppeteer管理を分離

2. **新しいAPIルート追加**
   - `analysis.routes.ts` に `?types=` パラメータ対応
   - `analysis.controller.ts` でビジネスロジック分離

3. **フロントエンド対応**
   - `api/analysis.ts` に複数analysisType対応
   - `SemanticAnalysis.tsx` でタブ形式表示

### 中期実装（2週間後）
- resultCache抽象化（Redis/SQLite選択式）
- usability/comprehensive分析の実装
- パフォーマンス計測・最適化

### 長期実装（1ヶ月後）
- ジョブキュー・非同期処理
- バッチ処理・履歴機能
- レポートエクスポート

---

## 成功指標

### Phase 2完了時
- ✅ checker.js が1000行以下に分割
- ✅ usability/comprehensive分析が利用可能
- ✅ 分析結果キャッシュでレスポンス時間50%短縮
- ✅ 並列処理で大規模サイト分析の高速化

### Phase 3完了時
- ✅ 100URL以上のバッチ処理対応
- ✅ PDF/CSVレポート出力
- ✅ 履歴分析・比較機能
- ✅ カスタム分析テンプレート作成

---

## 注意事項

### 段階的移行
- 一度に全てを変更せず、既存機能を維持しながら段階的に実装
- 各Phaseで既存テストを通すことを確認
- 新旧APIの並行提供期間を設ける

### メンテナビリティ
- 型安全性（TypeScript移行 or JSDoc徹底）
- テスト容易性（依存注入、モック対応）
- 監視・ログ（構造化ログ、メトリクス）

### セキュリティ
- 画像プロキシのドメイン制限
- Auth情報のマスキング
- CORS設定の最小化
