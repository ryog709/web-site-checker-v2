/**
 * Gemini API用のプロンプト生成サービス
 * 分析結果からコンテキストに応じたプロンプトを構築
 */

/**
 * コンテンツ品質分析用のプロンプトを生成
 * @param {Object} analysisData - 分析データ
 * @param {string} analysisData.url - 分析対象URL
 * @param {Object} analysisData.lighthouseResults - Lighthouse分析結果
 * @param {Object} analysisData.axeResults - axe-core分析結果
 * @returns {Object} プロンプトオブジェクト
 */
export function buildContentQualityPrompt(analysisData) {
  const { url, lighthouseResults, axeResults } = analysisData;

  const systemPrompt = `あなたはWebサイトのコンテンツ品質評価の専門家です。
Lighthouseとaxe-coreの技術的分析結果を基に、以下の観点からWebサイトのコンテンツ品質を評価してください：

1. **コンテンツの明確性**: 情報が分かりやすく整理されているか
2. **ユーザビリティ**: ユーザーが求める情報に容易にアクセスできるか
3. **アクセシビリティ**: 全てのユーザーがコンテンツを利用できるか
4. **SEO効果**: 検索エンジンでの発見されやすさ

評価は以下のJSONフォーマットで回答してください：
{
  "score": 0-100の数値,
  "improvements": ["改善提案1", "改善提案2", "改善提案3"],
  "details": "詳細な分析結果"
}

**重要**: 問題がない場合でも、必ず以下のように記載してください：
- score: 0-30 (優秀)
- improvements: ["特に大きな問題は見当たりません。現在の品質を維持してください。"]
- details: "詳細な分析結果と評価理由"`;

  const contextData = {
    url,
    performanceScore: lighthouseResults?.performance?.score || 'N/A',
    accessibilityScore: lighthouseResults?.accessibility?.score || 'N/A',
    seoScore: lighthouseResults?.seo?.score || 'N/A',
    axeViolations: axeResults?.violations?.length || 0,
    criticalIssues: extractCriticalIssues(lighthouseResults, axeResults)
  };

  const userPrompt = `以下のWebサイトのコンテンツ品質を評価してください：

**URL**: ${url}

**技術的分析結果**:
- パフォーマンススコア: ${contextData.performanceScore}
- アクセシビリティスコア: ${contextData.accessibilityScore}
- SEOスコア: ${contextData.seoScore}
- アクセシビリティ違反数: ${contextData.axeViolations}

**主要な技術的問題**:
${contextData.criticalIssues.map(issue => `- ${issue}`).join('\n')}

これらの技術的分析結果を踏まえ、Webサイトのコンテンツ品質を総合的に評価し、具体的な改善提案を提供してください。

必ず以下のJSON形式で回答してください（他の文章は一切含めず、JSON のみを返してください）：

{
  "score": 20,
  "improvements": ["特に大きな問題は見当たりません。現在の品質を維持してください。"],
  "details": "このWebサイトは適切に設計されており、大きな問題は見当たりません。"
}`;

  return {
    system: systemPrompt,
    user: userPrompt,
    context: contextData
  };
}

/**
 * ユーザビリティ分析用のプロンプトを生成
 * @param {Object} analysisData - 分析データ
 * @returns {Object} プロンプトオブジェクト
 */
export function buildUsabilityPrompt(analysisData) {
  const { url, lighthouseResults, axeResults } = analysisData;

  const systemPrompt = `あなたはWebユーザビリティの専門家です。
技術的分析結果を基に、実際のユーザー体験の観点からWebサイトを評価してください：

1. **ナビゲーション**: サイト内移動の分かりやすさ
2. **情報設計**: コンテンツの構造と配置
3. **インタラクション**: ユーザーとの対話設計
4. **レスポンシブ性**: 様々なデバイスでの使いやすさ

評価は以下のJSONフォーマットで回答してください：
{
  "score": 0-100の数値,
  "recommendations": ["推奨事項1", "推奨事項2", "推奨事項3"],
  "details": "詳細なユーザビリティ分析"
}

**重要**: 問題がない場合でも、必ず以下のように記載してください：
- score: 0-30 (優秀)
- recommendations: ["ユーザビリティに大きな問題は見当たりません。現在の使いやすさを継続してください。"]
- details: "詳細な分析結果と評価理由"`;

  const contextData = {
    url,
    loadingTime: lighthouseResults?.performance?.metrics?.firstContentfulPaint || 'N/A',
    interactivity: lighthouseResults?.performance?.metrics?.totalBlockingTime || 'N/A',
    accessibilityIssues: extractAccessibilityIssues(axeResults),
    structuralIssues: extractStructuralIssues(lighthouseResults)
  };

  const userPrompt = `以下のWebサイトのユーザビリティを評価してください：

**URL**: ${url}

**パフォーマンス指標**:
- 初回コンテンツ表示: ${contextData.loadingTime}
- インタラクティブ性: ${contextData.interactivity}

**アクセシビリティ課題**:
${contextData.accessibilityIssues.map(issue => `- ${issue}`).join('\n')}

**構造的問題**:
${contextData.structuralIssues.map(issue => `- ${issue}`).join('\n')}

実際のユーザーがこのWebサイトを利用する際の体験を想定し、ユーザビリティの観点から評価と改善提案を提供してください。`;

  return {
    system: systemPrompt,
    user: userPrompt,
    context: contextData
  };
}

/**
 * 包括的分析用のプロンプトを生成
 * @param {Object} analysisData - 分析データ
 * @returns {Object} プロンプトオブジェクト
 */
export function buildComprehensivePrompt(analysisData) {
  const { url, lighthouseResults, axeResults } = analysisData;

  const systemPrompt = `あなたはWebサイト品質評価の総合専門家です。
技術的分析結果を統合し、Webサイトの総合的な品質評価を行ってください：

**評価軸**:
1. ユーザー体験 (UX)
2. アクセシビリティ
3. パフォーマンス
4. SEO効果
5. コンテンツ品質
6. 技術的実装品質

評価は以下のJSONフォーマットで回答してください：
{
  "overallScore": 0-100の数値,
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["弱み1", "弱み2", "弱み3"],
  "priorityActions": ["優先改善項目1", "優先改善項目2", "優先改善項目3"],
  "detailedReport": "詳細な総合分析レポート"
}

**重要**: 問題がない場合でも、必ず以下のように記載してください：
- overallScore: 0-30 (優秀)
- strengths: サイトの良い点を具体的に記載
- weaknesses: ["大きな問題は見当たりません"]または軽微な改善点
- priorityActions: ["現在の品質を維持してください"]または軽微な改善提案
- detailedReport: "詳細な総合評価結果"`;

  const fullContext = {
    url,
    scores: {
      performance: lighthouseResults?.performance?.score || 0,
      accessibility: lighthouseResults?.accessibility?.score || 0,
      bestPractices: lighthouseResults?.bestPractices?.score || 0,
      seo: lighthouseResults?.seo?.score || 0
    },
    issues: {
      axeViolations: axeResults?.violations || [],
      lighthouseIssues: extractLighthouseIssues(lighthouseResults)
    },
    metrics: {
      loadTime: lighthouseResults?.performance?.metrics?.firstContentfulPaint || 'N/A',
      interactivity: lighthouseResults?.performance?.metrics?.totalBlockingTime || 'N/A',
      cumulativeLayoutShift: lighthouseResults?.performance?.metrics?.cumulativeLayoutShift || 'N/A'
    }
  };

  const userPrompt = `以下のWebサイトを総合的に評価してください：

**URL**: ${url}

**Lighthouseスコア**:
- パフォーマンス: ${fullContext.scores.performance}/100
- アクセシビリティ: ${fullContext.scores.accessibility}/100
- ベストプラクティス: ${fullContext.scores.bestPractices}/100
- SEO: ${fullContext.scores.seo}/100

**主要メトリクス**:
- 読み込み時間: ${fullContext.metrics.loadTime}
- インタラクティブ性: ${fullContext.metrics.interactivity}
- レイアウトシフト: ${fullContext.metrics.cumulativeLayoutShift}

**検出された問題数**:
- アクセシビリティ違反: ${fullContext.issues.axeViolations.length}件
- Lighthouse問題: ${fullContext.issues.lighthouseIssues.length}件

全ての技術的データを総合し、このWebサイトの現状評価と戦略的な改善ロードマップを提案してください。`;

  return {
    system: systemPrompt,
    user: userPrompt,
    context: fullContext
  };
}

/**
 * 分析タイプに応じてプロンプトを生成
 * @param {string} analysisType - 分析タイプ
 * @param {Object} analysisData - 分析データ
 * @returns {Object} プロンプトオブジェクト
 */
export function buildPrompt(analysisType, analysisData) {
  switch (analysisType) {
    case 'content-quality':
      return buildContentQualityPrompt(analysisData);
    case 'usability':
      return buildUsabilityPrompt(analysisData);
    case 'comprehensive':
      return buildComprehensivePrompt(analysisData);
    default:
      return buildContentQualityPrompt(analysisData);
  }
}

// ヘルパー関数群

function extractCriticalIssues(lighthouseResults, axeResults) {
  const issues = [];

  // Lighthouseの重要な問題を抽出
  if (lighthouseResults?.performance?.score < 50) {
    issues.push('パフォーマンスが大幅に低下している');
  }
  if (lighthouseResults?.accessibility?.score < 70) {
    issues.push('アクセシビリティに重大な問題がある');
  }

  // axe-coreのcritical/serious問題を抽出
  if (axeResults?.violations) {
    const criticalViolations = axeResults.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    criticalViolations.forEach(violation => {
      issues.push(`${violation.help} (${violation.impact})`);
    });
  }

  return issues.length > 0 ? issues : ['大きな技術的問題は検出されませんでした'];
}

function extractAccessibilityIssues(axeResults) {
  if (!axeResults?.violations) return ['アクセシビリティ分析データがありません'];

  return axeResults.violations.map(violation =>
    `${violation.help} (影響度: ${violation.impact}, 対象要素: ${violation.nodes}個)`
  );
}

function extractStructuralIssues(lighthouseResults) {
  const issues = [];

  // 構造的な問題を抽出（例：見出し構造、画像alt属性など）
  if (lighthouseResults?.seo?.score < 80) {
    issues.push('SEO構造に改善の余地がある');
  }
  if (lighthouseResults?.bestPractices?.score < 80) {
    issues.push('Web標準のベストプラクティスに課題がある');
  }

  return issues.length > 0 ? issues : ['構造的な大きな問題は検出されませんでした'];
}

function extractLighthouseIssues(lighthouseResults) {
  const issues = [];

  // Lighthouseの各カテゴリーから問題を抽出
  ['performance', 'accessibility', 'bestPractices', 'seo'].forEach(category => {
    const categoryData = lighthouseResults?.[category];
    if (categoryData?.score < 80) {
      issues.push(`${category}スコアが基準値(80)を下回っている: ${categoryData.score}`);
    }
  });

  return issues;
}