# AGENTS Onboarding Guide

このファイルは Claude Code を含むエージェント／共同開発者が最初に確認すべき手順をまとめたものです。最新情報は `docs` 配下のドキュメントを常に優先してください。

## 1. セッション開始時チェックリスト
1. `docs/session-notes.md` を読み、作業前提・未完タスク・検証コマンドを把握する
2. `docs/progress-log.md` を確認し、直近の差分とテスト結果を理解する
3. `docs/implementation-roadmap.md` の Phase 2.1 DONE 条件（128行付近）を再読する

## 2. 作業ステップ（Phase 2.1）
- Step A: 互換レイヤー整備（`legacyResultMapper` とレスポンス同値性の検証）
  - `/api/check` と `/api/check-pipeline` の diff がゼロになるまで完了報告禁止
  - Lighthouse 実スコア / Gemini semanticAnalysis / axe違反件数 / siteLinks / consoleErrors を旧APIと一致させ、証跡を `docs/progress-log.md` に記録
- Step B: `/api/check` 切り替え（auth 含む curl テスト必須）
- Step C: `/api/crawl`・`/api/count-pages` 移行（BrowserPool リソース監視）
- Step D: LangChain 導入準備（Analyzer インターフェースの抽象化）

詳細は `docs/claude-code-guide.md` の最新ステップ概要を参照。

## 3. コーディングガイドライン
- `/api/check`・`/api/crawl`・`/api/count-pages` のレスポンス互換性を崩さない
- `auth` 対応／Lighthouse スコア／semanticAnalysis／siteLinks／consoleErrors を欠落させない
- 変更ごとに `backend/test/pipeline-integration-test.js` や curl で比較ログを取得し、`progress-log.md` に記録

## 4. ドキュメント更新ルール
- セッション終了前に `session-notes.md` の前提を更新
- 実装完了時やテスト実施後に `progress-log.md` を追記
- 新しい方針や DONE 条件の変更は `implementation-roadmap.md` に反映

## 5. LangChain 参照
- Context7 MCP で `langchain` 公式ドキュメント（例: `/websites/langchain_oss_javascript`）を利用
- Analyzer を LangChain Tool 化する際は、既存パイプラインとの互換性を維持しつつ Adapter 層を設計

## 6. 連絡事項
- ドキュメントと実装に齟齬を見つけた場合は作業を停止し、ドキュメント更新または相談を優先してください
- 重大な互換性リスクやテスト失敗は `progress-log.md` とコミットメッセージの両方に記録してください
