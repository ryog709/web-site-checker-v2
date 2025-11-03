# Session Notes (Claude Code 必読)

最新セッションの冒頭で必ずこのファイルを更新し、Claude Code には最初に参照させる。

## 今日の前提 (500文字以内)
- 最終目標: LangChain を活用して品質チェック精度を引き上げる分析パイプラインを確立する
- **現状**: Phase 2.1 Step A 実装完了。レイアウト / W3C / フォーム / メタ情報アナライザを含む新パイプラインが `/api/check-pipeline` で稼働中。次は Step B (`/api/check` 切り替え) に向けた互換検証フェーズ。
- 完了: legacyResultMapper 実装、AnalysisPipeline 実装、layout / w3c / form / metadata analyzers 追加、フロントの新タブ実装。
- 互換維持が必須なAPI: `/api/check`, `/api/crawl`, `/api/count-pages`
- 重要制約: auth対応必須 / 既存レスポンス構造維持 / Lighthouse・axe・semanticAnalysis・siteLinks・consoleErrors を旧APIと同値で返す
- 新規: `/api/chat` ＋ フロントチャットUI初期実装（Gemini 2.x Flash）。診断1件ごとにセッション生成し履歴は同一チェック内のみ保持。

## 再実装計画（2025-09-25 21:30 Codex CLI提案）
**実装順序**（リスク最小化・段階的検証）:
1. ✅ `legacyResultMapper.js` - 旧APIレスポンス構造マッピング
2. ✅ `AnalysisPipeline/index.js` - 統合骨格（スタブで土台確認）
3. ✅ `analyzers/domAnalyzer.js` - 実DOM解析（Puppeteer + Cheerio）
4. ✅ `analyzers/axeAnalyzer.js`
5. ✅ `analyzers/lighthouseAnalyzer.js`
6. ✅ layout / w3c / form / metadata analyzers 追加
7. ✅ 統合検証: `/api/check` vs `/api/check-pipeline` 全項目差分ゼロ確認（拡張 OFF 時）

**次アクション**:
- `/api/check` を新パイプライン実装へ切り替え（互換モードで稼働）
- 切替後の回帰テスト（curl / frontend）と `docs/progress-log.md` 追記
- 拡張機能（layout/form/metadata/w3c）を `/api/check-pipeline` 専用フラグで提供しつつ、Step C（/api/crawl など）移行計画を更新

## 成果報告前チェックリスト（必須）
1. `/api/check` と `/api/check-pipeline` のレスポンス JSON を diff し、scores / issues / semanticAnalysis / siteLinks / consoleErrors / auth が一致していることを `docs/progress-log.md` にログ化
2. Lighthouse の実行ログで WebSocket ポート接続成功が確認でき、fallback スコアを返していないこと
3. `GeminiService.analyzeWebsite` を使用した semanticAnalysis が返却され、モデル名・スコア等が埋まっていること
4. axe-core の違反件数が旧 API と一致し、差分があれば理由を `progress-log.md` に記載済みであること
5. siteLinks / consoleErrors が 0 件であっても取得処理が動作している証跡（ログまたはテスト結果）があること

## 動作確認テンプレート
```bash
curl -X POST http://localhost:4000/api/check \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## 参考ドキュメント
- `docs/implementation-roadmap.md` Phase 2.1
- `docs/progress-log.md`
