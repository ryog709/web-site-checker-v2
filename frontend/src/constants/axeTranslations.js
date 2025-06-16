// axe-coreアクセシビリティルールの日本語翻訳辞書

export const axeTranslations = {
  // カラーコントラスト関連
  'color-contrast': {
    help: '要素は最小限のカラーコントラスト比の基準値を満たす必要があります',
    description: 'テキストと背景色のコントラスト比が低すぎると、視覚に障害のあるユーザーがコンテンツを読むことが困難になります。',
    fixHint: 'テキストの色を濃くするか、背景色を薄くしてコントラスト比を向上させてください。'
  },
  'color-contrast-enhanced': {
    help: '要素は強化されたカラーコントラスト比の基準値を満たす必要があります',
    description: 'AAA準拠レベルでは、より厳しいコントラスト比が要求されます。',
    fixHint: 'より高いコントラスト比（7:1以上）を確保してください。'
  },

  // 画像関連
  'image-alt': {
    help: '画像には代替テキストが必要です',
    description: '画像にalt属性がないと、スクリーンリーダーユーザーが画像の内容を理解できません。',
    fixHint: '画像にalt属性を追加し、画像の内容や目的を説明してください。装飾的な画像の場合はalt=""を使用してください。'
  },
  'image-redundant-alt': {
    help: '画像の代替テキストに冗長な文言を含めてはいけません',
    description: 'alt属性に「画像」や「写真」などの冗長な文言が含まれています。',
    fixHint: 'alt属性からは「画像」「写真」「図」などの文言を削除し、画像の具体的な内容のみを記述してください。'
  },

  // リンク関連
  'link-name': {
    help: 'リンクには識別可能なテキストが必要です',
    description: 'リンクにアクセシブルな名前がないと、ユーザーがリンクの目的を理解できません。',
    fixHint: 'リンクテキストを追加するか、aria-labelやaria-labelledby属性を使用してリンクの目的を明確にしてください。'
  },
  'link-in-text-block': {
    help: 'テキストブロック内のリンクは色以外の方法でも識別可能である必要があります',
    description: '色だけに依存したリンクの識別は、色覚に障害のあるユーザーには分からない場合があります。',
    fixHint: 'アンダーラインや太字など、色以外の視覚的手がかりを追加してください。'
  },

  // フォーム関連
  'label': {
    help: 'フォームコントロールにはラベルが必要です',
    description: 'フォーム要素にラベルがないと、ユーザーが何を入力すべきかわかりません。',
    fixHint: 'label要素を使用するか、aria-label属性でフォーム要素の目的を明確にしてください。'
  },
  'label-title-only': {
    help: 'フォーム要素にはtitle属性だけでなく適切なラベルが必要です',
    description: 'title属性のみではアクセシビリティ要件を満たしません。',
    fixHint: 'label要素またはaria-label属性を使用してください。'
  },

  // 見出し関連
  'heading-order': {
    help: '見出しは適切な順序で配置する必要があります',
    description: '見出しレベルをスキップすると、ページ構造が理解しにくくなります。',
    fixHint: '見出しレベルを順序立てて使用してください（h1→h2→h3の順）。'
  },
  'empty-heading': {
    help: '見出し要素には内容が必要です',
    description: '空の見出し要素は、スクリーンリーダーユーザーに混乱を与えます。',
    fixHint: '見出し要素に適切なテキスト内容を追加してください。'
  },

  // HTML構造関連
  'html-has-lang': {
    help: 'html要素にはlang属性が必要です',
    description: 'lang属性がないと、スクリーンリーダーが適切な言語で読み上げられません。',
    fixHint: '<html lang="ja">のようにlang属性を追加してください。'
  },
  'html-lang-valid': {
    help: 'html要素のlang属性は有効な値である必要があります',
    description: '無効なlang属性値は、スクリーンリーダーの動作に悪影響を与えます。',
    fixHint: 'BCP 47に準拠した有効な言語コード（例：ja、en）を使用してください。'
  },
  'page-has-heading-one': {
    help: 'ページにはh1要素が必要です',
    description: 'h1要素はページの主要な見出しとして、ページ構造の理解に重要です。',
    fixHint: 'ページの主要な内容を表すh1要素を追加してください。'
  },

  // ARIA関連
  'aria-allowed-attr': {
    help: 'ARIA属性は対応する要素でのみ使用できます',
    description: '不適切なARIA属性の使用は、アクセシビリティツールの動作を妨げます。',
    fixHint: '要素に適用可能なARIA属性のみを使用してください。'
  },
  'aria-required-attr': {
    help: '必須のARIA属性が不足しています',
    description: '特定のARIAロールには、必須の属性があります。',
    fixHint: '不足している必須ARIA属性を追加してください。'
  },
  'aria-valid-attr-value': {
    help: 'ARIA属性の値は有効である必要があります',
    description: '無効なARIA属性値は、支援技術の動作に悪影響を与えます。',
    fixHint: 'ARIA仕様に準拠した有効な属性値を使用してください。'
  },

  // キーボードアクセシビリティ
  'tabindex': {
    help: 'tabindex属性は適切に使用される必要があります',
    description: '不適切なtabindex値は、キーボードナビゲーションを困難にします。',
    fixHint: 'tabindex="-1"（プログラムでフォーカス）か"0"（通常のタブ順序）を使用し、正の値は避けてください。'
  },
  'focus-order-semantics': {
    help: 'フォーカス可能な要素は適切なセマンティクスを持つ必要があります',
    description: 'ボタンやリンクなどの適切な要素を使用することで、期待される動作が提供されます。',
    fixHint: 'divやspan要素の代わりに、button、a、inputなどの適切なセマンティック要素を使用してください。'
  },

  // ランドマーク関連
  'region': {
    help: 'ページの主要コンテンツ領域にはランドマークロールが必要です',
    description: 'ランドマークロールは、ユーザーがページ内を効率的にナビゲートするのに役立ちます。',
    fixHint: 'main、nav、aside、headerなどの適切なランドマーク要素を使用してください。'
  },

  // 表関連
  'table-fake-caption': {
    help: 'テーブルには適切なキャプションが必要です',
    description: 'テーブルのキャプションは、テーブルの内容と目的を説明します。',
    fixHint: 'caption要素またはaria-labelledby属性を使用してテーブルのキャプションを提供してください。'
  },
  'th-has-data-cells': {
    help: 'テーブルヘッダーには対応するデータセルが必要です',
    description: '空のヘッダーセルは、テーブルの構造を理解しにくくします。',
    fixHint: 'th要素に対応するtd要素があることを確認してください。'
  },

  // その他
  'bypass': {
    help: 'ページにはメインコンテンツへのスキップリンクが必要です',
    description: 'スキップリンクは、キーボードユーザーが繰り返しナビゲーションを避けるのに役立ちます。',
    fixHint: 'ページの先頭にメインコンテンツへのスキップリンクを追加してください。'
  },
  'duplicate-id': {
    help: 'ID属性の値は一意である必要があります',
    description: '重複するID値は、支援技術やJavaScriptの動作に問題を引き起こします。',
    fixHint: 'ページ内でユニークなID値を使用してください。'
  }
};

// 影響レベルの日本語翻訳
export const impactTranslations = {
  'critical': '致命的',
  'serious': '重大',
  'moderate': '中程度',
  'minor': '軽微'
};

// WCAG準拠レベルの翻訳
export const wcagLevelTranslations = {
  'wcag2a': 'WCAG 2.1 A',
  'wcag2aa': 'WCAG 2.1 AA',
  'wcag2aaa': 'WCAG 2.1 AAA',
  'wcag21a': 'WCAG 2.1 A',
  'wcag21aa': 'WCAG 2.1 AA',
  'wcag21aaa': 'WCAG 2.1 AAA',
  'wcag22a': 'WCAG 2.2 A',
  'wcag22aa': 'WCAG 2.2 AA',
  'wcag22aaa': 'WCAG 2.2 AAA'
};

// アクセシビリティルールカテゴリの翻訳
export const categoryTranslations = {
  'color': '色・コントラスト',
  'keyboard': 'キーボード操作',
  'images': '画像',
  'headings': '見出し',
  'landmarks': 'ランドマーク',
  'forms': 'フォーム',
  'links': 'リンク',
  'tables': 'テーブル',
  'aria': 'ARIA',
  'structure': 'HTML構造'
};

/**
 * axe-coreルールIDから日本語の説明を取得
 * @param {string} ruleId - axe-coreのルールID
 * @returns {object} - 翻訳されたヘルプテキストと説明
 */
export function getAxeTranslation(ruleId) {
  return axeTranslations[ruleId] || {
    help: ruleId,
    description: 'この項目の詳細な説明は利用できません。',
    fixHint: '公式のWCAGガイドラインを参照してください。'
  };
}

/**
 * 影響レベルを日本語に翻訳
 * @param {string} impact - 影響レベル（serious, moderate, minor, critical）
 * @returns {string} - 日本語の影響レベル
 */
export function translateImpact(impact) {
  return impactTranslations[impact] || impact;
}

/**
 * WCAGタグを日本語に翻訳
 * @param {string} tag - WCAGタグ
 * @returns {string} - 日本語のタグ
 */
export function translateWcagTag(tag) {
  return wcagLevelTranslations[tag] || tag;
}