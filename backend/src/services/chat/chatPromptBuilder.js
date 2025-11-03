const MAX_HISTORY_ITEMS = 6;
const MAX_ISSUE_SUMMARIES = 6;

function toSafeString(value, fallback = '情報なし') {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === 'string') {
    return value.trim() || fallback;
  }
  return String(value);
}

function buildScoreSummary(scores) {
  if (!scores) {
    return 'スコア情報がありません。';
  }
  return `Performance: ${scores.performance ?? 'N/A'}, Accessibility: ${scores.accessibility ?? 'N/A'}, Best Practices: ${scores.bestpractices ?? 'N/A'}, SEO: ${scores.seo ?? 'N/A'}`;
}

function summarizeIssues(issues) {
  if (!issues) {
    return [];
  }

  const summaries = [];

  const register = (label, items, extractor) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const example = extractor(items[0]);
    summaries.push(`${label}: ${items.length}件。代表例 → ${example}`);
  };

  const defaultExtractor = (item) => {
    return toSafeString(item.message || item.description || item.title || item.help || item.id);
  };

  register('見出し構造', issues.headings, defaultExtractor);
  register('画像', issues.images, defaultExtractor);
  register('リンク', issues.links, defaultExtractor);
  register('メタ情報', issues.meta, defaultExtractor);
  register('HTML構造', issues.htmlStructure, defaultExtractor);

  if (Array.isArray(issues.accessibility?.axe)) {
    register('axeアクセシビリティ違反', issues.accessibility.axe, (item) => toSafeString(item.description || item.help || item.id));
  }

  if (Array.isArray(issues.accessibility?.lighthouse)) {
    register('Lighthouseアクセシビリティ課題', issues.accessibility.lighthouse, (item) => toSafeString(item.description || item.title));
  }

  if (Array.isArray(issues.consoleErrors)) {
    register('コンソールエラー', issues.consoleErrors, (item) => toSafeString(item.message));
  }

  return summaries.slice(0, MAX_ISSUE_SUMMARIES);
}

function summarizeSemanticAnalysis(semanticAnalysis) {
  if (!semanticAnalysis || !semanticAnalysis.geminiAnalysis) {
    return null;
  }

  const { geminiAnalysis } = semanticAnalysis;
  const parts = [];

  if (geminiAnalysis.contentQuality) {
    parts.push(`コンテンツ品質スコア: ${geminiAnalysis.contentQuality.score}`);
  }
  if (geminiAnalysis.usabilityInsights) {
    parts.push(`ユーザビリティスコア: ${geminiAnalysis.usabilityInsights.score}`);
  }
  if (geminiAnalysis.comprehensiveAnalysis) {
    parts.push(`総合スコア: ${geminiAnalysis.comprehensiveAnalysis.overallScore}`);
  }

  if (parts.length === 0 && geminiAnalysis.textAnalysis) {
    parts.push(`Geminiテキスト分析: ${geminiAnalysis.textAnalysis.slice(0, 140)}...`);
  }

  return parts.length > 0 ? parts.join(' / ') : null;
}

function buildHistorySnippet(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return '会話履歴はまだありません。';
  }

  const recent = history.slice(-MAX_HISTORY_ITEMS);
  return recent
    .map((message, index) => {
      const speaker = message.role === 'assistant' ? 'アシスタント' : 'ユーザー';
      const content = toSafeString(message.content).replace(/\s+/g, ' ').slice(0, 280);
      return `${index + 1}. ${speaker}: ${content}`;
    })
    .join('\n');
}

export function buildChatPrompt({ checkResult, history, userMessage }) {
  const basicInfo = `対象URL: ${toSafeString(checkResult?.url)}\n診断日時: ${toSafeString(checkResult?.timestamp)}\nスコア概要: ${buildScoreSummary(checkResult?.scores)}`;
  const issueSummaries = summarizeIssues(checkResult?.issues);
  const semanticSummary = summarizeSemanticAnalysis(checkResult?.semanticAnalysis);
  const historySnippet = buildHistorySnippet(history);

  const issueBlock = issueSummaries.length > 0
    ? issueSummaries.map((summary, index) => `  ${index + 1}. ${summary}`).join('\n')
    : '  主要な問題は検出されていません。';

  const semanticBlock = semanticSummary ? `Gemini既存分析: ${semanticSummary}` : 'Gemini既存分析: 利用不可または未生成。';

  const systemPrompt = `あなたはWebサイト診断レポートの説明に長けたアシスタントです。\n- 回答は日本語の敬体で行い、ユーザーが次に取るべき行動が明確になるようにします。\n- まず状況を2〜3文で簡潔にまとめ、その後に表形式で主要スコアを示し、優先度付きの改善アクションを列挙してください。\n- 表はMarkdown記法ではなく、JSONのscoreTable配列に構造化して返してください。\n- 応答はJSONのみで返し、余計なテキストや説明を含めないでください。\n- JSONスキーマは以下の通りです:\n{\n  "reply": "ユーザーへの自然な返答。文章のみ。",\n  "scoreTable": [\n    { "metric": "Performance", "score": 72, "goal": 90, "comment": "..." }\n  ],\n  "actionItems": [\n    { "title": "改善項目", "description": "詳細", "priority": "high|medium|low" }\n  ],\n  "followUpQuestions": ["任意の追質問候補。最大2件"]\n}\n- scoreTableは最大4行で、各指標の現状スコアと目標値(デフォルトで90)を示し、具体的なコメントを付けてください。\n- actionItemsは最大5件で、優先度の高いものから並べ、改善の背景を簡潔に記述してください。\n- followUpQuestionsは省略可能です。`;

  const userPrompt = `診断サマリー:\n${basicInfo}\n\n主要な問題概要:\n${issueBlock}\n\n${semanticBlock}\n\n会話履歴:\n${historySnippet}\n\n今回のユーザー質問:\n${toSafeString(userMessage)}\n\n上記を踏まえて、JSON形式で回答してください。`;

  return {
    system: systemPrompt,
    user: userPrompt
  };
}
