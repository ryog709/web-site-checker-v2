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

### 追加調査メモ（2025-09-25 11:40）
- 現ブランチに `AnalysisPipeline` / `LighthouseAnalyzer` / `legacyResultMapper` 等のソースは存在せず、Phase 2.1 Step A のコードを再構築する必要がある可能性が高い
- 今後の作業では過去ブランチ・コミットを検索し、実装の復元可否を判断した上で再実装計画を策定する

記入ルール:
- 1行 = 1コミット or 1つの大作業終了時点
- 「ステータス」には ✅ 完了 / ⚠️ 調整中 / 🛑 差し戻し などを利用
- 「差分確認/テスト」に `pipeline-integration-test`, `curl`, `npm test` 等の実行結果を簡潔に記載
