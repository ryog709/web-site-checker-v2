import React from 'react';
import type { TabType, CheckResult } from '../types/index.js';
import { Heading, Image, Link, FileText, Eye } from 'lucide-react';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  issues: CheckResult['issues'];
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  issues,
}) => {
  const tabs = [
    {
      id: 'headings' as TabType,
      label: '見出し',
      icon: Heading,
      count: issues.headings.length,
    },
    {
      id: 'images' as TabType,
      label: '画像',
      icon: Image,
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
      id: 'accessibility' as TabType,
      label: 'アクセシビリティ',
      icon: Eye,
      count: issues.accessibility.lighthouse.length + issues.accessibility.axe.length,
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
};