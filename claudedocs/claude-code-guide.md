# Claude Code 実装ガイド - 公式ベストプラクティス準拠

## 🎯 このガイドの目的
公式ベストプラクティス「探索 → 計画 → 実装 → コミット」に従い、Claude Codeが安全で効率的な開発を実行できるよう具体的な手順を提供します。

## 📚 公式ベストプラクティス適用

### 1. 探索フェーズ (Explore)
**目的**: 関連ファイルを読んで既存システムを理解
**所要時間**: 5-10分

```bash
# 既存システムの詳細分析
backend/src/services/checker.js     # メイン分析エンジン（1655行）
backend/src/routes/check.js         # APIエンドポイント
frontend/src/types/index.ts         # TypeScript型定義
frontend/src/components/Dashboard.tsx # UI表示ロジック
```

### 2. 計画フェーズ (Plan)
**目的**: 詳細な実装計画の作成
**所要時間**: 10-15分

公式推奨の段階的アプローチ：
- 既存機能を維持しながら段階的リファクタリング
- 新旧並行実行での安全確認
- テスト結果の同値性検証

### 3. 実装フェーズ (Code)
**目的**: 段階的な実装（一度に1モジュール）
**所要時間**: 30-60分

### 4. コミットフェーズ (Commit)
**目的**: 明確な説明付きコミット
**フォーマット**: `refactor: checker.js分割 - domAnalyzer.js抽出（新旧結果同値確認済み）`

---

## 📋 Phase 2 実装手順（優先順位順）

### Step 1: domAnalyzer.js の作成（最優先）
**所要時間**: 30分
**目的**: checker.js から DOM分析機能を分離

```bash
# 作成するファイル
backend/src/services/pipeline/analyzers/domAnalyzer.js
```

**実装内容**:
```javascript
/**
 * DOM構造分析（見出し・画像・リンク・メタ情報）
 * checker.js の以下の機能を移植:
 * - analyzeHeadings()
 * - analyzeImages()
 * - analyzeLinks()
 * - analyzeMetaInfo()
 */

export class DomAnalyzer {
  async analyze(page, url) {
    const results = {
      headings: await this.analyzeHeadings(page),
      images: await this.analyzeImages(page, url),
      links: await this.analyzeLinks(page, url),
      meta: await this.analyzeMetaInfo(page)
    };
    return results;
  }

  // checker.js の analyzeHeadings() をコピー&リファクタリング
  async analyzeHeadings(page) { /* 実装 */ }

  // checker.js の analyzeImages() をコピー&リファクタリング
  async analyzeImages(page, url) { /* 実装 */ }

  // その他のメソッド...
}
```

**移植対象の関数** (checker.js内):
- `analyzeHeadings()` (行番号: 約600-700)
- `analyzeImages()` (行番号: 約700-900)
- `analyzeLinks()` (行番号: 約900-1100)
- `analyzeMetaInfo()` (行番号: 約1100-1300)

### Step 2: lighthouseAnalyzer.js の作成
**所要時間**: 20分
**目的**: Lighthouse実行部分を分離

```bash
# 作成するファイル
backend/src/services/pipeline/analyzers/lighthouseAnalyzer.js
```

**実装内容**:
```javascript
import lighthouse from 'lighthouse';

export class LighthouseAnalyzer {
  constructor(options = {}) {
    this.options = {
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      port: options.port || 9222,
      ...options
    };
  }

  async analyze(url, port) {
    // checker.js の runLighthouse() 機能を移植
    const results = await lighthouse(url, this.options, null, null, { port });
    return this.formatResults(results);
  }

  formatResults(results) {
    // スコアとメトリクスを整理
    return {
      scores: {
        performance: Math.round(results.lhr.categories.performance.score * 100),
        accessibility: Math.round(results.lhr.categories.accessibility.score * 100),
        bestpractices: Math.round(results.lhr.categories['best-practices'].score * 100),
        seo: Math.round(results.lhr.categories.seo.score * 100)
      },
      metrics: results.lhr.audits,
      rawResults: results.lhr
    };
  }
}
```

### Step 3: browserPool.js の作成
**所要時間**: 40分
**目的**: Puppeteerブラウザ管理を最適化

```bash
# 作成するファイル
backend/src/services/browser/browserPool.js
```

**実装内容**:
```javascript
import puppeteer from 'puppeteer';

export class BrowserPool {
  constructor(options = {}) {
    this.maxBrowsers = options.maxBrowsers || 3;
    this.browsers = [];
    this.activeBrowsers = 0;
  }

  async getBrowser() {
    // 使用可能なブラウザがあれば再利用
    if (this.browsers.length > 0) {
      return this.browsers.pop();
    }

    // 上限に達していない場合は新規作成
    if (this.activeBrowsers < this.maxBrowsers) {
      this.activeBrowsers++;
      return await this.createBrowser();
    }

    // 上限に達している場合は待機
    return await this.waitForAvailableBrowser();
  }

  async createBrowser() {
    // checker.js の setupBrowser() 機能を移植
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return browser;
  }

  async releaseBrowser(browser) {
    // ブラウザをプールに戻す
    this.browsers.push(browser);
  }

  async cleanup() {
    // 全ブラウザを閉じる
    for (const browser of this.browsers) {
      await browser.close();
    }
    this.browsers = [];
    this.activeBrowsers = 0;
  }
}
```

### Step 4: runAnalysis.js の作成（パイプライン統合）
**所要時間**: 30分
**目的**: 分析処理の統合制御

```bash
# 作成するファイル
backend/src/services/pipeline/runAnalysis.js
```

**実装内容**:
```javascript
import { DomAnalyzer } from './analyzers/domAnalyzer.js';
import { LighthouseAnalyzer } from './analyzers/lighthouseAnalyzer.js';
import { GeminiService } from '../ai/geminiService.js';
import { BrowserPool } from '../browser/browserPool.js';

export class AnalysisPipeline {
  constructor() {
    this.domAnalyzer = new DomAnalyzer();
    this.lighthouseAnalyzer = new LighthouseAnalyzer();
    this.browserPool = new BrowserPool();
    this.geminiService = new GeminiService();
  }

  async runAnalysis(url, options = {}) {
    const browser = await this.browserPool.getBrowser();
    let page;

    try {
      page = await browser.newPage();
      await page.goto(url);

      // 並列実行可能な分析
      const [domResults, lighthouseResults] = await Promise.all([
        this.domAnalyzer.analyze(page, url),
        this.lighthouseAnalyzer.analyze(url, browser.port)
      ]);

      // AI分析（オプション）
      let semanticAnalysis = null;
      if (options.enableAI && options.analysisTypes) {
        semanticAnalysis = await this.runAIAnalysis(
          { url, ...domResults, ...lighthouseResults },
          options.analysisTypes
        );
      }

      return {
        url,
        timestamp: new Date().toISOString(),
        scores: lighthouseResults.scores,
        issues: this.aggregateIssues(domResults, lighthouseResults),
        semanticAnalysis,
        ...domResults
      };

    } finally {
      if (page) await page.close();
      await this.browserPool.releaseBrowser(browser);
    }
  }

  async runAIAnalysis(analysisData, analysisTypes) {
    // 複数のAI分析タイプに対応
    const results = {};

    for (const type of analysisTypes) {
      try {
        results[type] = await this.geminiService.analyzeContent(analysisData, type);
      } catch (error) {
        console.error(`AI analysis failed for ${type}:`, error);
        results[type] = { error: error.message };
      }
    }

    return {
      isEnabled: true,
      geminiAnalysis: results
    };
  }

  aggregateIssues(domResults, lighthouseResults) {
    // DOM分析とLighthouse結果から問題を統合
    const issues = [];

    // 見出し問題
    if (domResults.headings.issues) {
      issues.push(...domResults.headings.issues);
    }

    // 画像問題
    if (domResults.images.issues) {
      issues.push(...domResults.images.issues);
    }

    // Lighthouse問題（重要度の高いもの）
    // lighthouseResults.audits から抽出

    return issues;
  }
}
```

### Step 5: API拡張（複数analysisType対応）
**所要時間**: 20分
**目的**: `?types=content-quality,usability` パラメータ対応

```bash
# 修正するファイル
backend/src/routes/check.js
```

**修正内容**:
```javascript
// 既存のPOST /check を拡張
router.post('/check', validateUrlRouteHandler(async (req, res) => {
    const { url, auth, analysisTypes } = req.body;

    // analysisTypes が指定されていない場合はデフォルト
    const types = analysisTypes || ['content-quality'];

    // 新しいパイプラインを使用
    const pipeline = new AnalysisPipeline();
    const result = await pipeline.runAnalysis(url, {
        auth,
        enableAI: true,
        analysisTypes: types
    });

    res.json(result);
}));
```

---

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
1. **Step 1 (domAnalyzer)**: 見出し・画像・リンク分析が既存と同じ結果
2. **Step 2 (lighthouseAnalyzer)**: Lighthouseスコアが既存と同じ結果
3. **Step 3 (browserPool)**: ブラウザ起動・解放が正常動作
4. **Step 4 (runAnalysis)**: 統合パイプラインが既存checkSinglePageと同等
5. **Step 5 (API拡張)**: フロントエンドから複数analysisType指定可能

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