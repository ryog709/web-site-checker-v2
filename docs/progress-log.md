# Phase 2 Progress Log

| 日時 | ステータス | 変更概要 | 差分確認/テスト |
|------|------------|----------|------------------|
| 2025-09-25 10:50 | 🛑 差し戻し | Phase 2.1 Step A 試行（互換レイヤー整備） | `/api/check` vs `/api/check-pipeline` 比較 → スコア不一致、Gemini/axe/siteLinks 欠落 |
| 2025-09-25 11:40 | ⚠️ 調査中 | Phase 2.1 Step A 実装資産の所在確認 | `ls backend/src/services/pipeline` → analyzers/のみ、空ディレクトリ。`git log -- backend/src/services/pipeline` に履歴なし |

### 差し戻し理由（2025-09-25 10:50）
- LighthouseAnalyzer が Puppeteer の非公開 `_browserContext` 参照に依存し、常にフォールバックスコア（performance 75 等）を返している
- AnalysisPipeline が `GeminiService.analyzeContent` を呼び、未実装メソッドのため semanticAnalysis が空のままになる
- legacyResultMapper が siteLinks / consoleErrors を固定の空配列で返し、旧APIと同値でない
- axeAnalyzer は実行されても結果が mapper 経由で欠落している（旧APIでは violations 配列を返している）

### 次回更新時に必要な証跡
1. `/api/check` と `/api/check-pipeline` のレスポンス JSON を diff し、score / issues / semanticAnalysis / siteLinks / consoleErrors / auth が一致していること
2. Lighthouse 実行ログに WebSocket ポート接続成功が記録され、フォールバックが発生しないこと
3. Gemini 分析が `analyzeWebsite` で成功し、semanticAnalysis.geminiAnalysis にスコアなどが入っていること
4. axe-core の違反数が旧APIと同じであること（0件ならゼロが一致していることをログ化）

### 追加調査メモ（2025-09-25 21:30）

**実装資産調査結果**:
- `backend/src/services/pipeline/` ディレクトリ存在、`analyzers/` サブディレクトリは空
- git履歴・reflog・stash・未追跡ファイルすべて検索 → `AnalysisPipeline` / `LighthouseAnalyzer` / `legacyResultMapper` 実装なし
- **結論**: パイプライン実装を完全に新規作成する必要あり

**Codex CLI提案の再実装計画**:

1. **実装順序**（依存関係考慮、リスク最小化）:
   1. `legacyResultMapper.js` - 旧APIレスポンス構造マッピング（スケルトン）
   2. `AnalysisPipeline/index.js` - 統合骨格（スタブアナライザで土台確認）
   3. `analyzers/domAnalyzer.js` - DOM解析（見出し/画像/リンク）→ 旧API diff
   4. `analyzers/axeAnalyzer.js` - axe-core違反検出 → 旧API diff
   5. `analyzers/lighthouseAnalyzer.js` - WebSocket実測スコア取得 → 旧API diff
   6. 統合検証: `/api/check` vs `/api/check-pipeline` 全項目差分ゼロ確認

2. **各ファイル責務**:
   - `legacyResultMapper.js`: `mapPipelineResultToLegacy(result)` - 新形式→旧形式一括変換
   - `analysisPipeline/index.js`: `run(url, options)` - アナライザ統合・Gemini連携・エラー処理
   - `analyzers/domAnalyzer.js`: `analyze({page})` - DOM統計抽出
   - `analyzers/axeAnalyzer.js`: `analyze({page})` - axe-core実行・違反整形
   - `analyzers/lighthouseAnalyzer.js`: `analyze({url})` - WebSocket経由Lighthouse実行

3. **検証手順**（各フェーズ必須）:
   - mapper完成時: 旧APIサンプル vs dummy出力で差分ゼロ
   - 各アナライザ追加時: `/api/check` vs `/api/check-pipeline` diff記録
   - 最終: 代表URL複数で差分ゼロ証跡化

4. **証跡記録タイミング**:
   - 各アナライザ導入時: diff結果・主要メトリクス（Lighthouse実測/Gemini/axe件数/siteLinks/consoleErrors）を progress-log.md に追記
   - フェーズ完了時: diff ゼロログと計測証跡を保存

記入ルール:
- 1行 = 1コミット or 1つの大作業終了時点
- 「ステータス」には ✅ 完了 / ⚠️ 調整中 / 🛑 差し戻し などを利用
- 「差分確認/テスト」に `pipeline-integration-test`, `curl`, `npm test` 等の実行結果を簡潔に記載
