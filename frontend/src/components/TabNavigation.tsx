import React from 'react';
import type {
  TabType,
  CheckResult,
  LayoutAnalysisResult,
  AnalyzerError,
  W3CValidationResult,
  FormAnalysisResult,
} from '../types/index.js';
import {
  Heading,
  Image,
  AlertTriangle,
  Link,
  FileText,
  Eye,
  Code,
  Terminal,
  LayoutDashboard,
  FileCode2,
  ClipboardList,
} from 'lucide-react';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  issues: CheckResult['issues'];
}

export const TabNavigation: React.FC<TabNavigationProps> = React.memo(({
  activeTab,
  onTabChange,
  issues,
}) => {
  const isLayoutResult = (value: LayoutAnalysisResult | AnalyzerError | undefined): value is LayoutAnalysisResult =>
    !!value && typeof value === 'object' && 'viewports' in value;

  const isW3CResult = (value: W3CValidationResult | AnalyzerError | undefined): value is W3CValidationResult =>
    !!value && typeof value === 'object' && 'messages' in value;

  const isFormResult = (value: FormAnalysisResult | AnalyzerError | undefined): value is FormAnalysisResult =>
    !!value && typeof value === 'object' && 'forms' in value;

  const layoutCount = (() => {
    if (!issues.layout) {
      return 0;
    }
    if (isLayoutResult(issues.layout)) {
      const overflowViewports = issues.layout.summary?.overflowViewports ?? 0;
      const errorViewports = issues.layout.viewports?.filter(viewport => viewport.error).length ?? 0;
      return overflowViewports + errorViewports;
    }
    return issues.layout.error ? 1 : 0;
  })();

  const w3cCount = (() => {
    const validation = issues.validation?.w3c;
    if (!validation) {
      return 0;
    }
    if (isW3CResult(validation)) {
      return (validation.errorCount ?? 0) + (validation.warningCount ?? 0);
    }
    return validation.error ? 1 : 0;
  })();

  const formsCount = (() => {
    const forms = issues.forms;
    if (!forms) {
      return 0;
    }
    if (isFormResult(forms)) {
      return forms.summary?.formsWithIssues ?? 0;
    }
    return forms.error ? 1 : 0;
  })();

  const tabs = [
    {
      id: 'headings' as TabType,
      label: '見出し',
      icon: Heading,
      count: issues.headings.length,
    },
    {
      id: 'images' as TabType,
      label: '画像一覧',
      icon: Image,
      count: 0, // 全画像表示なので問題数ではない
    },
    {
      id: 'image-issues' as TabType,
      label: '画像の問題',
      icon: AlertTriangle,
      count: issues.images.length,
    },
    {
      id: 'links' as TabType,
      label: 'リンク',
      icon: Link,
      count: issues.links.length,
    },
    {
      id: 'meta' as TabType,
      label: 'メタ情報',
      icon: FileText,
      count: issues.meta.length,
    },
    {
      id: 'html-structure' as TabType,
      label: 'HTML構造',
      icon: Code,
      count: issues.htmlStructure?.filter(issue => issue.severity !== 'success').length || 0,
    },
    {
      id: 'accessibility' as TabType,
      label: 'アクセシビリティ',
      icon: Eye,
      count: issues.accessibility.lighthouse.length + issues.accessibility.axe.length,
    },
    {
      id: 'console-errors' as TabType,
      label: 'コンソールエラー',
      icon: Terminal,
      count: issues.consoleErrors?.length || 0,
    },
    {
      id: 'layout' as TabType,
      label: 'レイアウト',
      icon: LayoutDashboard,
      count: layoutCount,
    },
    {
      id: 'validation' as TabType,
      label: 'W3C検証',
      icon: FileCode2,
      count: w3cCount,
    },
    {
      id: 'forms' as TabType,
      label: 'フォーム',
      icon: ClipboardList,
      count: formsCount,
    },
  ];

  return (
    <nav className="tab-navigation" role="tablist" aria-label="診断項目">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <IconComponent size={18} className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
            {tab.count > 0 && (
              <span className="tab-badge" aria-label={`${tab.count}件の問題`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
});
