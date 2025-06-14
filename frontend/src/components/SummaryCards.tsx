import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { CheckResult } from '../types/index.js';

interface SummaryCardsProps {
  issues: CheckResult['issues'];
  isCrawlResult: boolean;
  totalPages: number;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  issues,
  isCrawlResult,
  totalPages,
}) => {
  const countIssuesBySeverity = () => {
    const counts = { error: 0, warning: 0, info: 0, success: 0 };

    const allIssues = [
      ...issues.headings,
      ...issues.images,
      ...issues.links,
      ...issues.meta,
      ...(issues.htmlStructure || []),
    ];

    allIssues.forEach(issue => {
      if (issue.severity in counts) {
        counts[issue.severity as keyof typeof counts]++;
      }
    });

    counts.error += issues.accessibility.lighthouse.length;
    counts.warning += issues.accessibility.axe.filter(v => v.impact === 'serious' || v.impact === 'critical').length;
    counts.info += issues.accessibility.axe.filter(v => v.impact === 'moderate' || v.impact === 'minor').length;

    return counts;
  };

  const counts = countIssuesBySeverity();
  const totalIssues = counts.error + counts.warning + counts.info;

  const cards = [
    {
      title: 'エラー',
      count: counts.error,
      icon: AlertTriangle,
      color: 'error',
      description: '修正が必要な問題'
    },
    {
      title: '警告',
      count: counts.warning,
      icon: AlertCircle,
      color: 'warning',
      description: '推奨される修正'
    },
    {
      title: '情報',
      count: counts.info,
      icon: Info,
      color: 'info',
      description: '改善提案'
    },
    {
      title: '総数',
      count: totalIssues,
      icon: CheckCircle,
      color: totalIssues === 0 ? 'success' : 'neutral',
      description: isCrawlResult ? `${totalPages}ページ診断済み` : '診断完了'
    }
  ];

  return (
    <div className="summary-cards">
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div key={card.title} className={`summary-card summary-card--${card.color}`}>
            <div className="summary-card-header">
              <IconComponent size={24} className="summary-card-icon" />
              <span className="summary-card-count">{card.count}</span>
            </div>
            <div className="summary-card-content">
              <h4 className="summary-card-title">{card.title}</h4>
              <p className="summary-card-description">{card.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};