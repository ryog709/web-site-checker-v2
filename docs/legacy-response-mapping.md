# Legacy Response Mapping Table

新パイプライン出力 → 旧API `/api/check` レスポンス形式へのマッピング仕様

## 作成日時
2025-09-25 21:47

## トップレベルフィールド対応

| 旧API フィールド | 新パイプライン入力 | 変換ロジック | 備考 |
|-----------------|-------------------|--------------|------|
| `url` | `context.url` | そのまま | リクエストURL |
| `timestamp` | `new Date().toISOString()` | 実行時生成 | ISO 8601形式 |
| `scores` | `lighthouseResult.scores` | Lighthouse結果から抽出 | 4科目スコア |
| `issues` | 各Analyzer結果統合 | IssuesBundle構造に変換 | 詳細は後述 |
| `siteLinks` | `domResult.siteLinks` | 最大20件、テキスト100文字制限 | collectSiteLinks相当 |
| `semanticAnalysis` | `geminiResult` | GeminiService.analyzeWebsite出力 | エラー時も構造維持 |
| `auth` | `context.auth` | そのまま | Basic認証情報 |

## Lighthouse Scores マッピング

| 旧API 構造 | 新パイプライン | 変換ロジック | フォールバック |
|-----------|---------------|--------------|---------------|
| `scores.performance` | `lighthouse.categories.performance.score * 100` | 0-1を0-100に変換 | calculateBasicScores相当 |
| `scores.accessibility` | `lighthouse.categories.accessibility.score * 100` | 同上 | 同上 |
| `scores.bestpractices` | `lighthouse.categories['best-practices'].score * 100` | 同上 | 同上 |
| `scores.seo` | `lighthouse.categories.seo.score * 100` | 同上 | 同上 |

**フォールバック条件**:
- Lighthouse実行失敗時: `calculateBasicScores()` ロジックを適用
- DOM解析結果から簡易スコア算出（見出し構造、画像alt、メタタグ有無）

## Issues Bundle マッピング

### issues.headings
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.headings[]` | `domResult.headingIssues[]` | analyzeHeadings相当の出力 |
| `issues.headingsStructure[]` | `domResult.headingStructure[]` | 見出し階層構造 |

### issues.images
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.images[]` | `domResult.imageIssues[]` | alt属性、サイズ、ファイルサイズ問題 |
| `issues.allImages[]` | `domResult.imageDetails[]` | 全画像詳細（位置、WebP、lazy loading含む） |

### issues.links
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.links[]` | `domResult.linkIssues[]` | リンクテキストなし、セキュリティ不備 |

### issues.meta
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.meta[]` | `domResult.metaIssues[]` | メタタグ欠落問題 |
| `issues.allMeta[]` | `domResult.metaDetails[]` | 全メタ情報詳細 |

### issues.htmlStructure
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.htmlStructure[]` | `domResult.htmlStructureIssues[]` | 閉じタグエラー、不正ネスト |

### issues.accessibility
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.accessibility.lighthouse[]` | `lighthouseResult.accessibilityIssues[]` | Lighthouse監査から抽出 |
| `issues.accessibility.axe[]` | `axeResult.violations[]` | axe-core違反リスト（impact/nodes/target含む） |

### issues.consoleErrors
| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `issues.consoleErrors[]` | `browserResult.consoleErrors[]` | console/pageerror/requestfailed監視結果 |

## Semantic Analysis マッピング

| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `semanticAnalysis.isEnabled` | `geminiConfig.isValid` | Gemini設定有効性 |
| `semanticAnalysis.geminiAnalysis` | `geminiResult.geminiAnalysis` | GeminiService.analyzeWebsite出力 |
| `semanticAnalysis.error` | `geminiResult.error` | エラー時のメッセージ |
| `semanticAnalysis.processingTime` | `geminiResult.processingTime` | 処理時間（ms） |
| `semanticAnalysis.cached` | `geminiResult.cached` | キャッシュヒット |

**Gemini分析タイプ別構造**:
- `content-quality`: contentQuality { score, improvements, details }
- `usability`: usabilityInsights { score, recommendations, details }
- `comprehensive`: comprehensiveAnalysis { overallScore, strengths, weaknesses, priorityActions, detailedReport }
- `text`: textAnalysis (string)

## Site Links マッピング

| 旧API 構造 | 新パイプライン | 変換ロジック |
|-----------|---------------|--------------|
| `siteLinks[].url` | `domResult.links[].url` | 絶対URL、末尾スラッシュ正規化 |
| `siteLinks[].text` | `domResult.links[].text` | 最大100文字 |
| `siteLinks[].title` | `domResult.links[].title` | 最大100文字 |

**収集ルール**:
- 同一ドメインのみ
- WordPress特殊URL（/feed/, /comments/）除外
- 最大20件
- 重複除去（normalizeUrl適用）

## 変換関数シグネチャ案

```typescript
/**
 * パイプライン結果を旧APIレスポンス形式に変換
 */
function mapPipelineResultToLegacy(pipelineResult: PipelineResult): CheckResponse {
  // トップレベル
  const response: CheckResponse = {
    url: pipelineResult.context.url,
    timestamp: new Date().toISOString(),
    scores: mapLighthouseScores(pipelineResult.lighthouse),
    issues: mapIssuesBundle(pipelineResult),
    siteLinks: mapSiteLinks(pipelineResult.dom.links),
    semanticAnalysis: mapSemanticAnalysis(pipelineResult.gemini),
    auth: pipelineResult.context.auth || null
  };

  return response;
}

/**
 * Lighthouseスコア変換（フォールバック含む）
 */
function mapLighthouseScores(lighthouseResult: LighthouseResult | null): LighthouseScores {
  if (lighthouseResult?.categories) {
    return {
      performance: Math.round(lighthouseResult.categories.performance.score * 100),
      accessibility: Math.round(lighthouseResult.categories.accessibility.score * 100),
      bestpractices: Math.round(lighthouseResult.categories['best-practices'].score * 100),
      seo: Math.round(lighthouseResult.categories.seo.score * 100)
    };
  }

  // フォールバック: calculateBasicScores相当
  return calculateBasicScoresFromDom(domResult);
}

/**
 * Issues統合
 */
function mapIssuesBundle(pipelineResult: PipelineResult): IssuesBundle {
  return {
    headings: pipelineResult.dom.headingIssues,
    headingsStructure: pipelineResult.dom.headingStructure,
    images: pipelineResult.dom.imageIssues,
    allImages: pipelineResult.dom.imageDetails,
    links: pipelineResult.dom.linkIssues,
    meta: pipelineResult.dom.metaIssues,
    allMeta: pipelineResult.dom.metaDetails,
    htmlStructure: pipelineResult.dom.htmlStructureIssues,
    accessibility: {
      lighthouse: pipelineResult.lighthouse?.accessibilityIssues || [],
      axe: pipelineResult.axe?.violations || []
    },
    consoleErrors: pipelineResult.browser?.consoleErrors || []
  };
}

/**
 * サイトリンク変換
 */
function mapSiteLinks(links: DomLink[]): SiteLink[] {
  return links
    .filter(link => isSameDomain(link.url, context.url))
    .filter(link => !isWordPressSpecialUrl(link.url))
    .map(link => ({
      url: normalizeUrl(link.url),
      text: link.text.substring(0, 100),
      title: link.title.substring(0, 100)
    }))
    .slice(0, 20); // 最大20件
}

/**
 * Gemini分析結果変換
 */
function mapSemanticAnalysis(geminiResult: GeminiResult | null): SemanticAnalysisResult {
  if (!geminiResult || geminiResult.error) {
    return {
      isEnabled: true,
      error: geminiResult?.error || 'Gemini analysis failed',
      errorCode: geminiResult?.errorCode || 'UNKNOWN_ERROR'
    };
  }

  return {
    isEnabled: true,
    geminiAnalysis: geminiResult.geminiAnalysis,
    processingTime: geminiResult.processingTime,
    cached: geminiResult.cached
  };
}
```

## 検証計画

1. **構造検証**: 各関数の戻り値型が旧API型定義に適合するか型チェック
2. **ダミーデータテスト**: スタブ入力でマッピング実行 → 旧API形式出力確認
3. **実データ比較**: `/api/check` の実レスポンスと `/api/check-pipeline` のマッピング結果を diff
4. **エッジケース**: 空配列、null、エラー時の挙動確認

## 注意事項

- **ログ記録**: 空配列/null でも取得処理が実行されたことをログ出力
- **エラーハンドリング**: 各変換関数で例外発生時のフォールバック処理
- **パフォーマンス**: 大量データ時の処理時間監視（特に画像・リンク配列）