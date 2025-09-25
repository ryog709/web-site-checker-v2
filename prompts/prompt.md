> Claude Code 指示案
  - 最初に docs/session-notes.md:1 と docs/progress-log.md:1 を必読し、当日の前提・未完タスク・検証コマンドを把握してください。
  - docs/implementation-roadmap.md:128 に記載した Phase 2.1 の DONE 条件を確認したうえで、Step A（互換レイヤー整備）から順に作業を進め、完了したら必ずチェックリストを更新し
  てください。
  - 実装時は /api/check・/api/crawl・/api/count-pages のレスポンス互換性（scores / issues / siteLinks / semanticAnalysis / consoleErrors / auth 対応）が崩れていないかを curl や統合テストで検証し、その結果を docs/progress-log.md に追記してください。
  - LangChain 連携を検討する際は、Context7 経由で参照した公式ドキュメント（/websites/langchain_oss_javascript 例: tools/agent の構成）を前提に、Analyzer を Tool としてマッピング する方針を docs/claude-code-guide.md:51 の Step D に沿って整理してください。
  - 作業の区切りごとに docs/session-notes.md を更新し、次セッションの冒頭で Claude Code が確実に最新前提を読み込めるようにしてください。

  あとはCodex CLIと適宜相談しながら進めてください。