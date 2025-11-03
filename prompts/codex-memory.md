今のところは docs/session-notes.md と docs/progress-log.md を運用していけば十分把握できます。次回セッションでは冒頭にこの2ファイルを見れば、前提や未完タスク、最新の検証結果がすぐ追えます。もし追加で残したいメモがあれば、session-notes.md に「次回やること」欄を増やす形で随時追記しておけば、私も含めて見落としが出にくくなると思います。

 Phase 2.1 Step A は継続中です。スタブ骨格は整いましたが、旧APIとの差分が残っているため完了とは扱いません。以下の順序で進めてください。

    1. `analyzers/domAnalyzer.js` を実装し、`checker.js` の DOM 解析ロジック（Puppeteer + Cheerio ベース）を移植。実データで `/api/check` と `/api/check-pipeline` の
        diff を取得し、`docs/progress-log.md` に記録してください。
    2. DOM 差分が解消できたら、`axeAnalyzer`、`lighthouseAnalyzer`、`gemini`、`browser` の順で実装を追加し、各フェーズごとに diff / 主要メトリクス（Lighthouse 実測、axe
        violations、Gemini スコア、siteLinks / consoleErrors）をログ化してください。
    3. すべてのアナライザが揃うまで `/api/check` の切り替えや Step B 以降には進まないこと。最終的に scores / issues / semanticAnalysis / siteLinks / consoleErrors / auth
        の差分がゼロになった証跡を残してから Step A 完了と宣言します。

    詳細は `docs/session-notes.md:5-19` と `docs/progress-log.md:5-58` に反映済みです。進捗が出たら必ず両ドキュメントを更新してください。
    EOF


> - docs/session-notes.md:5-19 を更新し、Phase 2.1 Step A がまだ継続中であること（スタブ骨格完成/実アナライザ未実装・差分あり）と次アクションを domAnalyzer 実装＋旧API
  diff 取得と明記しました。
  - docs/progress-log.md:5-41 の 2025-09-26 22:10 エントリをステータス⚠️に修正し、スタブ段階の中間検証である旨と未実装アナライザ一覧を整理しました。
  - 上記を踏まえ、Claude Code には domAnalyzer→axe→lighthouse→Gemini/Browser の順で実装し、各段階で /api/check vs /api/check-pipeline の差分と主要メトリクスを記録して最
  終的に差分ゼロ証跡を揃えるよう指示済みです。

  次のステップ: domAnalyzer 実装と実データによるレスポンス diff 取得・ログ化。