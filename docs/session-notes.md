# Session Notes (Claude Code 必読)

最新セッションの冒頭で必ずこのファイルを更新し、Claude Code には最初に参照させる。

## 今日の前提 (500文字以内)
- コミット基準点: TODO
- Phase 2.1 進捗: TODO
- 互換維持が必須なAPI: `/api/check`, `/api/crawl`, `/api/count-pages`
- 重要制約: auth対応必須 / 既存レスポンス構造維持 / Lighthouseスコア欠落禁止

## ペンディング TODO
- TODO: 未完タスクを箇条書き（3項目以内）

## 動作確認テンプレート
```bash
curl -X POST http://localhost:4000/api/check \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

## 参考ドキュメント
- `claudedocs/implementation-roadmap.md` Phase 2.1
- `claudedocs/progress-log.md`

