# Session Notes (Claude Code 必読)

最新セッションの冒頭で必ずこのファイルを更新し、Claude Code には最初に参照させる。

## 今日の前提 (500文字以内)
- 最終目標: LangChain を活用して品質チェック精度を引き上げる分析パイプラインを確立する
- **現状**: Phase 2.1 Step A 継続中（legacyResultMapper/AnalysisPipeline 骨格は整備済みだが実アナライザ未実装・レスポンス差分あり）
- 完了: legacyResultMapper 実装、AnalysisPipeline スタブ統合、`/api/check-pipeline` エンドポイント追加、スタブ差分検証ログ
- 互換維持が必須なAPI: `/api/check`, `/api/crawl`, `/api/count-pages`
- 重要制約: auth対応必須 / 既存レスポンス構造維持 / Lighthouse・axe・semanticAnalysis・siteLinks を旧APIと同値で返す

## 再実装計画（2025-09-25 21:30 Codex CLI提案）
**実装順序**（リスク最小化・段階的検証）:
1. ✅ `legacyResultMapper.js` - 旧APIレスポンス構造マッピング
2. ✅ `AnalysisPipeline/index.js` - 統合骨格（スタブで土台確認）
3. ⏳ `analyzers/domAnalyzer.js` - 実DOM解析（Puppeteer + Cheerio）→ `/api/check` diff
4. `analyzers/axeAnalyzer.js` → `/api/check` diff
5. `analyzers/lighthouseAnalyzer.js` → `/api/check` diff
6. 統合検証: 全項目差分ゼロ確認（Lighthouse/Gemini/axe/siteLinks/consoleErrors/auth）

**次アクション**: domAnalyzer.js を実装し、実データで `/api/check` vs `/api/check-pipeline` の diff を取得・記録して差分解消の第一段階に着手

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
