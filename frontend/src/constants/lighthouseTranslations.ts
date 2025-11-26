/**
 * Lighthouse アクセシビリティ監査項目の日本語翻訳マッピング
 */

export interface LighthouseTranslation {
  title: string;
  description: string;
  helpUrl?: string;
  helpText?: string;
}

/**
 * 説明文からリンク部分を削除するヘルパー関数
 */
function removeLinkFromDescription(description: string): string {
  // [リンクテキスト]の形式を削除
  return description.replace(/\s*\[.*?\]\s*/g, '').trim();
}

/**
 * 説明文からリンクテキストを抽出するヘルパー関数
 */
function extractLinkText(description: string): string | undefined {
  const match = description.match(/\[(.+?)\]/);
  return match ? match[1] : undefined;
}

/**
 * Lighthouse監査IDから一般的なヘルプURLを生成
 */
function getDefaultHelpUrl(id: string): string {
  // Deque UniversityのaxeルールURLパターン
  return `https://dequeuniversity.com/rules/axe/4.9/${id}`;
}

/**
 * Lighthouse アクセシビリティ監査IDと日本語翻訳のマッピング
 */
const lighthouseTranslations: Record<string, LighthouseTranslation> = {
  'color-contrast': {
    title: '背景色と前景色のコントラスト比が不十分',
    description: 'コントラスト比が低いテキストは、多くのユーザーにとって読みにくい、または読めない可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/color-contrast',
    helpText: '十分な色のコントラストを提供する方法を学ぶ'
  },
  'label-content-name-mismatch': {
    title: '表示テキストラベルとアクセシブル名が一致していない',
    description: '表示テキストラベルとアクセシブル名が一致していない場合、スクリーンリーダーユーザーにとって混乱を招く可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/label-content-name-mismatch',
    helpText: 'アクセシブル名について詳しく学ぶ'
  },
  'link-name': {
    title: 'リンクにアクセシブルな名前がない',
    description: 'リンクテキストが不明確または空の場合、スクリーンリーダーユーザーはリンクの目的を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/link-name',
    helpText: 'リンクのアクセシビリティについて詳しく学ぶ'
  },
  'image-alt': {
    title: '画像にalt属性がない',
    description: '代替テキストがない画像は、スクリーンリーダーユーザーにとって情報が失われます。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/image-alt',
    helpText: '画像のアクセシビリティについて詳しく学ぶ'
  },
  'button-name': {
    title: 'ボタンにアクセシブルな名前がない',
    description: 'ボタンにアクセシブルな名前がない場合、スクリーンリーダーユーザーはボタンの機能を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/button-name',
    helpText: 'ボタンのアクセシビリティについて詳しく学ぶ'
  },
  'html-has-lang': {
    title: '<html>要素にlang属性がない',
    description: 'HTML要素に言語属性がない場合、スクリーンリーダーが正しい言語でコンテンツを読み上げられません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/html-has-lang',
    helpText: '言語属性について詳しく学ぶ'
  },
  'html-lang-valid': {
    title: '<html>要素のlang属性が無効',
    description: '無効な言語コードは、スクリーンリーダーが正しくコンテンツを解釈できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/valid-lang',
    helpText: '有効な言語コードについて詳しく学ぶ'
  },
  'input-image-alt': {
    title: '画像送信ボタンにalt属性がない',
    description: '画像送信ボタンに代替テキストがない場合、スクリーンリーダーユーザーはボタンの目的を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/image-alt',
    helpText: '画像送信ボタンのアクセシビリティについて詳しく学ぶ'
  },
  'video-caption': {
    title: '<video>要素にキャプションがない',
    description: 'キャプションがない動画は、聴覚障害のあるユーザーにとって情報が失われます。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/video-caption',
    helpText: '動画のアクセシビリティについて詳しく学ぶ'
  },
  'video-description': {
    title: '<video>要素に説明がない',
    description: '説明がない動画は、視覚障害のあるユーザーにとって情報が失われます。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/video-description',
    helpText: '動画の説明について詳しく学ぶ'
  },
  'aria-hidden-body': {
    title: 'aria-hidden属性がbody要素に設定されている',
    description: 'body要素にaria-hidden属性が設定されていると、ページ全体がスクリーンリーダーから隠されます。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-hidden-body',
    helpText: 'aria-hidden属性について詳しく学ぶ'
  },
  'aria-hidden-focus': {
    title: 'フォーカス可能な要素にaria-hidden属性が設定されている',
    description: 'フォーカス可能な要素にaria-hidden属性が設定されていると、キーボードユーザーがアクセスできなくなります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-hidden-focus',
    helpText: 'aria-hidden属性について詳しく学ぶ'
  },
  'aria-required-attr': {
    title: 'ARIA属性が必須要素に設定されていない',
    description: '必須のARIA属性が欠けていると、スクリーンリーダーユーザーが要素の状態や役割を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-required-attr',
    helpText: 'ARIA属性について詳しく学ぶ'
  },
  'aria-valid-attr-value': {
    title: 'ARIA属性の値が無効',
    description: '無効なARIA属性値は、スクリーンリーダーが正しく要素を解釈できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-valid-attr-value',
    helpText: '有効なARIA属性値について詳しく学ぶ'
  },
  'aria-valid-attr': {
    title: '無効なARIA属性が使用されている',
    description: '無効なARIA属性は、スクリーンリーダーが正しく要素を解釈できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-valid-attr',
    helpText: '有効なARIA属性について詳しく学ぶ'
  },
  'aria-roles': {
    title: '無効なARIAロールが使用されている',
    description: '無効なARIAロールは、スクリーンリーダーが正しく要素の役割を理解できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-roles',
    helpText: '有効なARIAロールについて詳しく学ぶ'
  },
  'aria-allowed-attr': {
    title: 'ARIA属性が許可されていない要素に設定されている',
    description: '許可されていないARIA属性は、スクリーンリーダーが正しく要素を解釈できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-allowed-attr',
    helpText: 'ARIA属性の使用規則について詳しく学ぶ'
  },
  'aria-required-children': {
    title: '必須の子要素が欠けている',
    description: 'ARIAロールに必須の子要素が欠けていると、スクリーンリーダーが正しく要素を解釈できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-required-children',
    helpText: 'ARIAロールの構造について詳しく学ぶ'
  },
  'aria-required-parent': {
    title: '必須の親要素が欠けている',
    description: 'ARIAロールに必須の親要素が欠けていると、スクリーンリーダーが正しく要素を解釈できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-required-parent',
    helpText: 'ARIAロールの構造について詳しく学ぶ'
  },
  'aria-toggle-field-name': {
    title: 'トグル要素にアクセシブルな名前がない',
    description: 'トグル要素にアクセシブルな名前がない場合、スクリーンリーダーユーザーは要素の状態を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-toggle-field-name',
    helpText: 'トグル要素のアクセシビリティについて詳しく学ぶ'
  },
  'aria-treeitem-name': {
    title: 'ツリーアイテムにアクセシブルな名前がない',
    description: 'ツリーアイテムにアクセシブルな名前がない場合、スクリーンリーダーユーザーはアイテムの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-treeitem-name',
    helpText: 'ツリーアイテムのアクセシビリティについて詳しく学ぶ'
  },
  'aria-command-name': {
    title: 'コマンド要素にアクセシブルな名前がない',
    description: 'コマンド要素にアクセシブルな名前がない場合、スクリーンリーダーユーザーはコマンドの機能を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-command-name',
    helpText: 'コマンド要素のアクセシビリティについて詳しく学ぶ'
  },
  'aria-meter-name': {
    title: 'メーター要素にアクセシブルな名前がない',
    description: 'メーター要素にアクセシブルな名前がない場合、スクリーンリーダーユーザーはメーターの値を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-meter-name',
    helpText: 'メーター要素のアクセシビリティについて詳しく学ぶ'
  },
  'aria-progressbar-name': {
    title: 'プログレスバーにアクセシブルな名前がない',
    description: 'プログレスバーにアクセシブルな名前がない場合、スクリーンリーダーユーザーは進行状況を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-progressbar-name',
    helpText: 'プログレスバーのアクセシビリティについて詳しく学ぶ'
  },
  'aria-tooltip-name': {
    title: 'ツールチップにアクセシブルな名前がない',
    description: 'ツールチップにアクセシブルな名前がない場合、スクリーンリーダーユーザーはツールチップの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-tooltip-name',
    helpText: 'ツールチップのアクセシビリティについて詳しく学ぶ'
  },
  'aria-text-inputs-have-accessible-names': {
    title: 'テキスト入力にアクセシブルな名前がない',
    description: 'テキスト入力にアクセシブルな名前がない場合、スクリーンリーダーユーザーは入力フィールドの目的を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-text-inputs-have-accessible-names',
    helpText: 'テキスト入力のアクセシビリティについて詳しく学ぶ'
  },
  'aria-select-name': {
    title: '選択要素にアクセシブルな名前がない',
    description: '選択要素にアクセシブルな名前がない場合、スクリーンリーダーユーザーは選択肢の内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-select-name',
    helpText: '選択要素のアクセシビリティについて詳しく学ぶ'
  },
  'aria-listbox-name': {
    title: 'リストボックスにアクセシブルな名前がない',
    description: 'リストボックスにアクセシブルな名前がない場合、スクリーンリーダーユーザーはリストの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-listbox-name',
    helpText: 'リストボックスのアクセシビリティについて詳しく学ぶ'
  },
  'aria-range-name': {
    title: '範囲入力にアクセシブルな名前がない',
    description: '範囲入力にアクセシブルな名前がない場合、スクリーンリーダーユーザーは入力の範囲を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-range-name',
    helpText: '範囲入力のアクセシビリティについて詳しく学ぶ'
  },
  'aria-dialog-name': {
    title: 'ダイアログにアクセシブルな名前がない',
    description: 'ダイアログにアクセシブルな名前がない場合、スクリーンリーダーユーザーはダイアログの目的を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-dialog-name',
    helpText: 'ダイアログのアクセシビリティについて詳しく学ぶ'
  },
  'aria-tab-name': {
    title: 'タブにアクセシブルな名前がない',
    description: 'タブにアクセシブルな名前がない場合、スクリーンリーダーユーザーはタブの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-tab-name',
    helpText: 'タブのアクセシビリティについて詳しく学ぶ'
  },
  'aria-aria-name': {
    title: '要素にアクセシブルな名前がない',
    description: '要素にアクセシブルな名前がない場合、スクリーンリーダーユーザーは要素の目的を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/aria-aria-name',
    helpText: 'アクセシブル名について詳しく学ぶ'
  },
  'document-title': {
    title: 'ページに<title>要素がない',
    description: 'ページタイトルがない場合、ユーザーはページの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/document-title',
    helpText: 'ページタイトルについて詳しく学ぶ'
  },
  'meta-refresh': {
    title: 'ページが自動リフレッシュを使用している',
    description: '自動リフレッシュは、ユーザーを混乱させ、アクセシビリティの問題を引き起こす可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/meta-refresh',
    helpText: '自動リフレッシュについて詳しく学ぶ'
  },
  'object-alt': {
    title: '<object>要素に代替テキストがない',
    description: '<object>要素に代替テキストがない場合、スクリーンリーダーユーザーは要素の内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/object-alt',
    helpText: 'object要素のアクセシビリティについて詳しく学ぶ'
  },
  'td-headers-attr': {
    title: 'テーブルセルにheaders属性がない',
    description: 'テーブルセルにheaders属性がない場合、スクリーンリーダーユーザーはセルの関連性を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/td-headers-attr',
    helpText: 'テーブルのアクセシビリティについて詳しく学ぶ'
  },
  'th-has-data-cells': {
    title: 'テーブルヘッダーに対応するデータセルがない',
    description: 'テーブルヘッダーに対応するデータセルがない場合、テーブルの構造が不明確になります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/th-has-data-cells',
    helpText: 'テーブルのアクセシビリティについて詳しく学ぶ'
  },
  'valid-lang': {
    title: 'lang属性の値が無効',
    description: '無効な言語コードは、スクリーンリーダーが正しくコンテンツを解釈できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/valid-lang',
    helpText: '有効な言語コードについて詳しく学ぶ'
  },
  'accesskeys': {
    title: 'アクセスキーが使用されている',
    description: 'アクセスキーは、キーボードショートカットと競合する可能性があり、アクセシビリティの問題を引き起こす可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/accesskeys',
    helpText: 'アクセスキーについて詳しく学ぶ'
  },
  'bypass': {
    title: 'スキップリンクがない',
    description: 'スキップリンクがない場合、キーボードユーザーはメインコンテンツに直接アクセスできません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/bypass',
    helpText: 'スキップリンクについて詳しく学ぶ'
  },
  'focusable-controls': {
    title: 'フォーカス可能な要素が適切に制御されていない',
    description: 'フォーカス可能な要素が適切に制御されていない場合、キーボードユーザーがページを操作できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/focusable-controls',
    helpText: 'フォーカス管理について詳しく学ぶ'
  },
  'focus-traps': {
    title: 'フォーカストラップが検出された',
    description: 'フォーカストラップは、キーボードユーザーがページから抜け出せなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/focus-traps',
    helpText: 'フォーカストラップについて詳しく学ぶ'
  },
  'interactive-element-affordance': {
    title: 'インタラクティブ要素に適切な視覚的フィードバックがない',
    description: 'インタラクティブ要素に適切な視覚的フィードバックがない場合、ユーザーは要素が操作可能であることを理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/interactive-element-affordance',
    helpText: 'インタラクティブ要素のデザインについて詳しく学ぶ'
  },
  'logical-tab-order': {
    title: 'タブ順序が論理的でない',
    description: 'タブ順序が論理的でない場合、キーボードユーザーはページを直感的に操作できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/logical-tab-order',
    helpText: 'タブ順序について詳しく学ぶ'
  },
  'managed-focus': {
    title: 'フォーカス管理が適切でない',
    description: 'フォーカス管理が適切でない場合、キーボードユーザーがページを操作できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/managed-focus',
    helpText: 'フォーカス管理について詳しく学ぶ'
  },
  'offscreen-content-hidden': {
    title: '画面外のコンテンツが適切に非表示になっていない',
    description: '画面外のコンテンツが適切に非表示になっていない場合、スクリーンリーダーユーザーが混乱する可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/offscreen-content-hidden',
    helpText: '画面外コンテンツの管理について詳しく学ぶ'
  },
  'use-landmarks': {
    title: 'ランドマーク要素が使用されていない',
    description: 'ランドマーク要素がない場合、スクリーンリーダーユーザーはページの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/use-landmarks',
    helpText: 'ランドマーク要素について詳しく学ぶ'
  },
  'visual-order-follows-dom': {
    title: '視覚的な順序がDOM順序と一致していない',
    description: '視覚的な順序がDOM順序と一致していない場合、キーボードユーザーが混乱する可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/visual-order-follows-dom',
    helpText: '視覚的順序とDOM順序について詳しく学ぶ'
  },
  'heading-order': {
    title: '見出しの順序が正しくない',
    description: '見出しの順序が正しくない場合、スクリーンリーダーユーザーはページの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/heading-order',
    helpText: '見出しの構造について詳しく学ぶ'
  },
  'list': {
    title: 'リストが適切にマークアップされていない',
    description: 'リストが適切にマークアップされていない場合、スクリーンリーダーユーザーはリストの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/list',
    helpText: 'リストのマークアップについて詳しく学ぶ'
  },
  'listitem': {
    title: 'リストアイテムが適切にマークアップされていない',
    description: 'リストアイテムが適切にマークアップされていない場合、スクリーンリーダーユーザーはリストの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/listitem',
    helpText: 'リストアイテムのマークアップについて詳しく学ぶ'
  },
  'definition-list': {
    title: '定義リストが適切にマークアップされていない',
    description: '定義リストが適切にマークアップされていない場合、スクリーンリーダーユーザーはリストの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/definition-list',
    helpText: '定義リストのマークアップについて詳しく学ぶ'
  },
  'dlitem': {
    title: '定義リストアイテムが適切にマークアップされていない',
    description: '定義リストアイテムが適切にマークアップされていない場合、スクリーンリーダーユーザーはリストの構造を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/dlitem',
    helpText: '定義リストアイテムのマークアップについて詳しく学ぶ'
  },
  'frame-title': {
    title: '<frame>要素にtitle属性がない',
    description: '<frame>要素にtitle属性がない場合、スクリーンリーダーユーザーはフレームの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/frame-title',
    helpText: 'フレームのアクセシビリティについて詳しく学ぶ'
  },
  'iframe-title': {
    title: '<iframe>要素にtitle属性がない',
    description: '<iframe>要素にtitle属性がない場合、スクリーンリーダーユーザーはフレームの内容を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/iframe-title',
    helpText: 'iframeのアクセシビリティについて詳しく学ぶ'
  },
  'duplicate-id': {
    title: '重複したID属性が使用されている',
    description: '重複したID属性は、スクリーンリーダーが正しく要素を識別できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/duplicate-id',
    helpText: 'ID属性の一意性について詳しく学ぶ'
  },
  'duplicate-id-aria': {
    title: '重複したARIA IDが使用されている',
    description: '重複したARIA IDは、スクリーンリーダーが正しく要素を識別できなくなる可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/duplicate-id-aria',
    helpText: 'ARIA IDの一意性について詳しく学ぶ'
  },
  'form-field-multiple-labels': {
    title: 'フォームフィールドに複数のラベルが設定されている',
    description: 'フォームフィールドに複数のラベルが設定されている場合、スクリーンリーダーユーザーが混乱する可能性があります。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/form-field-multiple-labels',
    helpText: 'フォームラベルの適切な使用方法について詳しく学ぶ'
  },
  'form-fieldset': {
    title: 'フォームフィールドがfieldsetでグループ化されていない',
    description: 'フォームフィールドがfieldsetでグループ化されていない場合、スクリーンリーダーユーザーはフィールドの関連性を理解できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/form-fieldset',
    helpText: 'フォームのグループ化について詳しく学ぶ'
  },
  'is-on-cpu': {
    title: 'CPU使用率が高い',
    description: 'CPU使用率が高い場合、ページのパフォーマンスが低下し、ユーザー体験が悪化する可能性があります。',
    helpUrl: 'https://developer.chrome.com/docs/lighthouse/performance/is-on-cpu',
    helpText: 'パフォーマンス最適化について詳しく学ぶ'
  },
  'meta-description': {
    title: 'ページにmeta descriptionがない',
    description: 'meta descriptionがない場合、検索エンジンとユーザーがページの内容を理解できません。',
    helpUrl: 'https://developer.chrome.com/docs/lighthouse/seo/meta-description',
    helpText: 'meta descriptionについて詳しく学ぶ'
  },
  'tabindex': {
    title: 'tabindex属性が不適切に使用されている',
    description: 'tabindex属性が不適切に使用されている場合、キーボードユーザーがページを操作できません。',
    helpUrl: 'https://dequeuniversity.com/rules/axe/4.9/tabindex',
    helpText: 'tabindex属性について詳しく学ぶ'
  }
};

/**
 * Lighthouse アクセシビリティ監査項目の日本語翻訳を取得
 * @param id - Lighthouse監査ID
 * @param originalTitle - 元の英語タイトル（フォールバック用）
 * @param originalDescription - 元の英語説明（フォールバック用）
 * @returns 日本語翻訳オブジェクト
 */
export function getLighthouseTranslation(
  id: string,
  originalTitle: string,
  originalDescription: string
): LighthouseTranslation {
  const translation = lighthouseTranslations[id];

  if (translation) {
    return translation;
  }

  // 翻訳が見つからない場合は元のテキストを返す（リンク部分を削除）
  return {
    title: originalTitle,
    description: removeLinkFromDescription(originalDescription),
    helpUrl: getDefaultHelpUrl(id),
    helpText: extractLinkText(originalDescription) || '詳しく学ぶ'
  };
}

/**
 * Lighthouse アクセシビリティ監査項目のタイトルを翻訳
 * @param id - Lighthouse監査ID
 * @param originalTitle - 元の英語タイトル
 * @returns 日本語タイトル
 */
export function translateLighthouseTitle(id: string, originalTitle: string): string {
  const translation = lighthouseTranslations[id];
  return translation?.title || originalTitle;
}

/**
 * Lighthouse アクセシビリティ監査項目の説明を翻訳
 * @param id - Lighthouse監査ID
 * @param originalDescription - 元の英語説明
 * @returns 日本語説明
 */
export function translateLighthouseDescription(id: string, originalDescription: string): string {
  const translation = lighthouseTranslations[id];
  if (translation) {
    return translation.description;
  }
  // 翻訳が見つからない場合はリンク部分を削除
  return removeLinkFromDescription(originalDescription);
}

/**
 * Lighthouse アクセシビリティ監査項目のヘルプURLを取得
 * @param id - Lighthouse監査ID
 * @returns ヘルプURL
 */
export function getLighthouseHelpUrl(id: string): string | undefined {
  const translation = lighthouseTranslations[id];
  if (translation?.helpUrl) {
    return translation.helpUrl;
  }
  // 翻訳が見つからない場合はデフォルトURLを生成
  return getDefaultHelpUrl(id);
}

/**
 * Lighthouse アクセシビリティ監査項目のヘルプテキストを取得
 * @param id - Lighthouse監査ID
 * @param originalDescription - 元の英語説明（フォールバック用）
 * @returns ヘルプテキスト
 */
export function getLighthouseHelpText(id: string, originalDescription?: string): string | undefined {
  const translation = lighthouseTranslations[id];
  if (translation?.helpText) {
    return translation.helpText;
  }
  // 翻訳が見つからない場合は説明文から抽出
  if (originalDescription) {
    const extracted = extractLinkText(originalDescription);
    return extracted || '詳しく学ぶ';
  }
  return '詳しく学ぶ';
}
