# Session Notes (Claude Code 必読)

最新セッションの冒頭で必ずこのファイルを更新し、Claude Code には最初に参照させる。

## 今日の前提 (500文字以内)
- 最終目標: LangChain を活用して品質チェック精度を引き上げる分析パイプラインを確立する
- コミット基準点: Phase 2.1 Step A 調整中（互換レイヤー未達）
- Phase 2.1 進捗: ⚠️ Step A 差し戻し - Lighthouse/Gemini/axe/リンク収集が未整備
- 互換維持が必須なAPI: `/api/check`, `/api/crawl`, `/api/count-pages`
- 重要制約: auth対応必須 / 既存レスポンス構造維持 / Lighthouse・axe・semanticAnalysis・siteLinks を旧APIと同値で返す

## ペンディング TODO
- Lighthouseの実スコア取得（WS接続 fix、fallback禁止）
- Gemini分析の復旧（`analyzeWebsite` 使用、semanticAnalysisを埋める）
- axe-core結果・siteLinks・consoleErrors の旧API同値確認

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
