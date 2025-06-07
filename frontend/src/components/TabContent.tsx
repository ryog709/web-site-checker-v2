import React, { useState } from 'react';
import type { TabType, CheckResult, Issue, Heading } from '../types/index.js';
import { ExternalLink, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Modal } from './Modal.js';

interface TabContentProps {
  activeTab: TabType;
  issues: CheckResult['issues'];
  isCrawlResult: boolean;
  allResults: CheckResult[];
}

export const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  issues,
  isCrawlResult,
  allResults,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
      case 'critical':
      case 'serious':
        return <AlertTriangle size={16} className="severity-icon severity-icon--error" />;
      case 'warning':
      case 'moderate':
        return <AlertCircle size={16} className="severity-icon severity-icon--warning" />;
      default:
        return <Info size={16} className="severity-icon severity-icon--info" />;
    }
  };

  const renderHeadingsStructure = (headingsStructure: Heading[]) => {
    if (headingsStructure.length === 0) {
      return (
        <div className="no-issues">
          <p>❓ 見出しが見つかりませんでした</p>
        </div>
      );
    }

    return (
      <div className="headings-structure">
        <h4>見出し構造 ({headingsStructure.length}個)</h4>
        <div className="headings-tree">
          {headingsStructure.map((heading, index) => {
            // レベルに応じたインデント計算（20px × (レベル - 1)）
            const indentLevel = (heading.level - 1) * 20;
            
            return (
              <div 
                key={index} 
                className={`heading-item heading-level-${heading.level}`}
                style={{ paddingLeft: `${indentLevel}px` }}
              >
                <span className="heading-tag">{heading.tag}</span>
                <span className="heading-text">{heading.text || '（空の見出し）'}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderIssueTable = (issues: Issue[], title: string) => {
    if (issues.length === 0) {
      return (
        <div className="no-issues">
          <p>✅ {title}に関する問題は見つかりませんでした</p>
        </div>
      );
    }

    return (
      <div className="issues-table-container">
        <h4>{title} ({issues.length}件)</h4>
        <table className="issues-table" role="table">
          <thead>
            <tr>
              <th scope="col">重要度</th>
              <th scope="col">問題</th>
              <th scope="col">要素</th>
              <th scope="col">詳細</th>
            </tr>
          </thead>
          <tbody>
            {issues.map((issue, index) => (
              <tr key={index}>
                <td>{getSeverityIcon(issue.severity)}</td>
                <td>{issue.message}</td>
                <td>
                  <code>{issue.element}</code>
                  {issue.src && (
                    <div className="issue-detail">src: {issue.src}</div>
                  )}
                  {issue.href && (
                    <div className="issue-detail">href: {issue.href}</div>
                  )}
                </td>
                <td>
                  <button
                    className="detail-button"
                    onClick={() => setSelectedIssue({ ...issue, type: title })}
                    aria-label={`${issue.message}の詳細を表示`}
                  >
                    詳細
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAccessibilityIssues = () => {
    const { lighthouse, axe } = issues.accessibility;

    return (
      <div className="accessibility-content">
        {lighthouse.length > 0 && (
          <div className="lighthouse-issues">
            <h4>Lighthouse アクセシビリティ ({lighthouse.length}件)</h4>
            <table className="issues-table">
              <thead>
                <tr>
                  <th scope="col">タイトル</th>
                  <th scope="col">スコア</th>
                  <th scope="col">詳細</th>
                </tr>
              </thead>
              <tbody>
                {lighthouse.map((issue, index) => (
                  <tr key={index}>
                    <td>{issue.title}</td>
                    <td>
                      <span className={`score-badge ${issue.score === 0 ? 'score-badge--fail' : 'score-badge--partial'}`}>
                        {issue.score === 0 ? 'Fail' : 'Partial'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="detail-button"
                        onClick={() => setSelectedIssue({ ...issue, type: 'Lighthouse' })}
                        aria-label={`${issue.title}の詳細を表示`}
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {axe.length > 0 && (
          <div className="axe-issues">
            <h4>WCAG 2.1 AA 準拠チェック ({axe.length}件)</h4>
            <table className="issues-table">
              <thead>
                <tr>
                  <th scope="col">重要度</th>
                  <th scope="col">ルール</th>
                  <th scope="col">影響範囲</th>
                  <th scope="col">詳細</th>
                </tr>
              </thead>
              <tbody>
                {axe.map((violation, index) => (
                  <tr key={index}>
                    <td>{getSeverityIcon(violation.impact)}</td>
                    <td>
                      <code>{violation.id}</code>
                      <div className="violation-tags">
                        {violation.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>{violation.nodes}個の要素</td>
                    <td>
                      <button
                        className="detail-button"
                        onClick={() => setSelectedIssue({ ...violation, type: 'WCAG' })}
                        aria-label={`${violation.help}の詳細を表示`}
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {lighthouse.length === 0 && axe.length === 0 && (
          <div className="no-issues">
            <p>✅ アクセシビリティに関する問題は見つかりませんでした</p>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'headings':
        return (
          <div className="headings-tab">
            {renderHeadingsStructure(issues.headingsStructure || [])}
            {issues.headings.length > 0 && (
              <div className="headings-issues">
                {renderIssueTable(issues.headings, '見出し構造の問題')}
              </div>
            )}
          </div>
        );
      case 'images':
        return renderIssueTable(issues.images, '画像');
      case 'links':
        return renderIssueTable(issues.links, 'リンク');
      case 'meta':
        return renderIssueTable(issues.meta, 'メタ情報');
      case 'accessibility':
        return renderAccessibilityIssues();
      default:
        return null;
    }
  };

  const renderIssueModal = () => {
    if (!selectedIssue) return null;

    const isLighthouse = selectedIssue.type === 'Lighthouse';
    const isWCAG = selectedIssue.type === 'WCAG';

    return (
      <Modal
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        title={isLighthouse ? selectedIssue.title : isWCAG ? selectedIssue.help : selectedIssue.message}
      >
        <div className="modal-content">
          {isLighthouse && (
            <>
              <p><strong>説明:</strong> {selectedIssue.description}</p>
              {selectedIssue.displayValue && (
                <p><strong>値:</strong> {selectedIssue.displayValue}</p>
              )}
              <p><strong>スコア:</strong> {selectedIssue.score}</p>
            </>
          )}

          {isWCAG && (
            <>
              <p><strong>説明:</strong> {selectedIssue.description}</p>
              <p><strong>影響レベル:</strong> {selectedIssue.impact}</p>
              <p><strong>影響要素数:</strong> {selectedIssue.nodes}個</p>
              <div className="wcag-tags">
                <strong>関連ガイドライン:</strong>
                <div className="tags-list">
                  {selectedIssue.tags.map((tag: string) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
              {selectedIssue.helpUrl && (
                <a
                  href={selectedIssue.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                >
                  詳細情報を見る <ExternalLink size={14} />
                </a>
              )}
            </>
          )}

          {!isLighthouse && !isWCAG && (
            <>
              <p><strong>重要度:</strong> {selectedIssue.severity}</p>
              {selectedIssue.element && (
                <p><strong>要素:</strong> <code>{selectedIssue.element}</code></p>
              )}
              {selectedIssue.src && (
                <p><strong>ソース:</strong> {selectedIssue.src}</p>
              )}
              {selectedIssue.href && (
                <p><strong>リンク先:</strong> {selectedIssue.href}</p>
              )}
            </>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div
      className="tab-content"
      role="tabpanel"
      id={`tabpanel-${activeTab}`}
      aria-labelledby={`tab-${activeTab}`}
    >
      {renderTabContent()}
      {renderIssueModal()}
    </div>
  );
};