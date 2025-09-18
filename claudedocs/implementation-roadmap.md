# Web Site Checker v2 - 実装ロードマップ

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
**目標**: checker.js を機能別に分割、テスト容易化
```bash
# 実装ファイル
backend/src/services/pipeline/runAnalysis.ts
backend/src/services/pipeline/analyzers/lighthouseAnalyzer.ts
backend/src/services/pipeline/analyzers/axeAnalyzer.ts
backend/src/services/pipeline/analyzers/domAnalyzer.ts
backend/src/services/browser/browserPool.ts
```

**検証**: 既存結果と同値確認

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