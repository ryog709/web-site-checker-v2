import React, { useState } from 'react';
import type { TabType, CheckResult, Issue, Heading, ImageInfo } from '../types/index.js';
import { ExternalLink, AlertTriangle, AlertCircle, Info, Image as ImageIcon, FileText, Eye } from 'lucide-react';
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
          <div className="empty-state">
            <FileText size={48} className="empty-icon" />
            <h3>見出しが見つかりませんでした</h3>
            <p>このページには見出し要素（h1〜h6）がありません</p>
          </div>
        </div>
      );
    }

    return (
      <div className="headings-structure-modern">
        <div className="section-header">
          <div className="section-title">
            <FileText size={20} />
            <h4>見出し構造</h4>
            <span className="count-badge">{headingsStructure.length}</span>
          </div>
          <p className="section-description">
            ページの見出し階層を視覚化。SEOとアクセシビリティの向上に重要です。
          </p>
        </div>

        <div className="headings-tree-modern">
          {headingsStructure.map((heading, index) => {
            const indentLevel = (heading.level - 1) * 24;
            
            return (
              <div 
                key={index} 
                className={`heading-card ${heading.hasImage ? 'has-image' : ''} ${heading.isEmpty ? 'is-empty' : ''}`}
                style={{ marginLeft: `${indentLevel}px` }}
              >
                <div className="heading-main">
                  <div className="heading-info-horizontal">
                    <span className={`heading-level-badge level-${heading.level}`}>
                      {heading.tag}
                    </span>
                    <span className="heading-text-modern">
                      {heading.text || '（内容なし）'}
                    </span>
                    
                    {/* 画像を同じ行に表示（テキスト情報なし） */}
                    {heading.hasImage && heading.images.length > 0 && (
                      <div className="heading-images-horizontal">
                        {heading.images.map((img, imgIndex) => (
                          <div key={imgIndex} className="image-container-horizontal">
                            {img.src && img.src !== 'undefined' ? (
                              <img 
                                src={img.src} 
                                alt={img.alt || '画像'}
                                className="preview-image-horizontal"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="image-fallback-horizontal">
                                <ImageIcon size={24} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAllImages = (allImages: ImageInfo[]) => {
    if (allImages.length === 0) {
      return (
        <div className="no-issues">
          <div className="empty-state">
            <ImageIcon size={48} className="empty-icon" />
            <h3>画像が見つかりませんでした</h3>
            <p>このページには画像要素（img）がありません</p>
          </div>
        </div>
      );
    }

    return (
      <div className="all-images-section">
        <div className="section-header">
          <div className="section-title">
            <ImageIcon size={20} />
            <h4>全ての画像</h4>
            <span className="count-badge">{allImages.length}</span>
          </div>
          <p className="section-description">
            ページ内の全ての画像と属性情報を表示。width/heightの設定状況を確認できます。
          </p>
        </div>

        <div className="images-grid">
          {allImages.map((image, index) => (
            <div key={index} className="image-card">
              <div className="image-preview-container">
                {image.src && image.src !== 'undefined' ? (
                  <img 
                    src={image.src} 
                    alt={image.alt || `画像 ${image.index}`}
                    className="image-preview-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="image-fallback-full">
                    <ImageIcon size={32} />
                    <span>画像を読み込めません</span>
                  </div>
                )}
                <div className="image-fallback-full" style={{ display: 'none' }}>
                  <ImageIcon size={32} />
                  <span>画像を読み込めません</span>
                </div>
              </div>
              
              <div className="image-info-card">
                <div className="image-number">#{image.index}</div>
                
                <div className="image-attributes">
                  <div className="attribute-row">
                    <span className="attribute-label">Alt:</span>
                    {image.hasAlt ? (
                      <span className="attribute-value alt-present">"{image.alt}"</span>
                    ) : (
                      <span className="attribute-value alt-missing">⚠️ なし</span>
                    )}
                  </div>
                  
                  <div className="attribute-row">
                    <span className="attribute-label">Width:</span>
                    <span className={`attribute-value ${image.width ? 'dimension-present' : 'dimension-missing'}`}>
                      {image.width || '❌ なし'}
                    </span>
                  </div>
                  
                  <div className="attribute-row">
                    <span className="attribute-label">Height:</span>
                    <span className={`attribute-value ${image.height ? 'dimension-present' : 'dimension-missing'}`}>
                      {image.height || '❌ なし'}
                    </span>
                  </div>
                  
                  {image.title && (
                    <div className="attribute-row">
                      <span className="attribute-label">Title:</span>
                      <span className="attribute-value">"{image.title}"</span>
                    </div>
                  )}
                  
                  <div className="attribute-row">
                    <span className="attribute-label">ファイル:</span>
                    <span className="attribute-value filename">{image.filename}</span>
                  </div>
                </div>
                
                <div className="image-status">
                  {image.hasAlt && image.hasDimensions && (
                    <span className="status-good">✅ 完璧</span>
                  )}
                  {!image.hasAlt && (
                    <span className="status-warning">⚠️ Alt属性なし</span>
                  )}
                  {!image.hasDimensions && (
                    <span className="status-warning">⚠️ サイズ属性なし</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderIssueTable = (issues: Issue[], title: string) => {
    if (issues.length === 0) {
      return (
        <div className="no-issues">
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h3>問題は見つかりませんでした</h3>
            <p>{title}に関する問題は検出されませんでした</p>
          </div>
        </div>
      );
    }

    return (
      <div className="issues-section-modern">
        <div className="section-header">
          <div className="section-title">
            <AlertTriangle size={20} />
            <h4>{title}の問題</h4>
            <span className="count-badge error">{issues.length}</span>
          </div>
        </div>

        <div className="issues-grid">
          {issues.map((issue, index) => (
            <div key={index} className={`issue-card severity-${issue.severity}`}>
              <div className="issue-header">
                {getSeverityIcon(issue.severity)}
                <span className="issue-type">{issue.type}</span>
              </div>
              <div className="issue-content">
                <h5 className="issue-message">{issue.message}</h5>
                {issue.element && (
                  <code className="issue-element">{issue.element}</code>
                )}
                {issue.src && (
                  <div className="issue-detail">
                    <strong>ソース:</strong> {issue.src}
                  </div>
                )}
                {issue.href && (
                  <div className="issue-detail">
                    <strong>リンク:</strong> {issue.href}
                  </div>
                )}
              </div>
              <button
                className="detail-button-modern"
                onClick={() => setSelectedIssue({ ...issue, type: title })}
              >
                <Eye size={14} />
                詳細を見る
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAccessibilityIssues = () => {
    const { lighthouse, axe } = issues.accessibility;

    return (
      <div className="accessibility-content-modern">
        {lighthouse.length > 0 && (
          <div className="accessibility-section">
            <div className="section-header">
              <div className="section-title">
                <div className="lighthouse-icon">🏮</div>
                <h4>Lighthouse アクセシビリティ</h4>
                <span className="count-badge warning">{lighthouse.length}</span>
              </div>
            </div>
            <div className="issues-grid">
              {lighthouse.map((issue, index) => (
                <div key={index} className="accessibility-card lighthouse">
                  <div className="accessibility-header">
                    <h5>{issue.title}</h5>
                    <span className={`score-badge ${issue.score === 0 ? 'fail' : 'partial'}`}>
                      {issue.score === 0 ? 'Failed' : 'Partial'}
                    </span>
                  </div>
                  <p className="accessibility-description">{issue.description}</p>
                  <button
                    className="detail-button-modern"
                    onClick={() => setSelectedIssue({ ...issue, type: 'Lighthouse' })}
                  >
                    <Eye size={14} />
                    詳細を見る
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {axe.length > 0 && (
          <div className="accessibility-section">
            <div className="section-header">
              <div className="section-title">
                <div className="axe-icon">🪓</div>
                <h4>WCAG 2.1 AA準拠チェック</h4>
                <span className="count-badge error">{axe.length}</span>
              </div>
            </div>
            <div className="issues-grid">
              {axe.map((violation, index) => (
                <div key={index} className="accessibility-card axe">
                  <div className="accessibility-header">
                    <div className="violation-info">
                      {getSeverityIcon(violation.impact)}
                      <code className="violation-id">{violation.id}</code>
                    </div>
                    <span className="affected-elements">{violation.nodes}個の要素</span>
                  </div>
                  <h5 className="violation-help">{violation.help}</h5>
                  <div className="violation-tags-modern">
                    {violation.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="tag-modern">{tag}</span>
                    ))}
                  </div>
                  <button
                    className="detail-button-modern"
                    onClick={() => setSelectedIssue({ ...violation, type: 'WCAG' })}
                  >
                    <Eye size={14} />
                    詳細を見る
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {lighthouse.length === 0 && axe.length === 0 && (
          <div className="no-issues">
            <div className="success-state">
              <div className="success-icon">🎉</div>
              <h3>アクセシビリティ完璧！</h3>
              <p>WCAG 2.1 AA準拠に関する問題は検出されませんでした</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'headings':
        return (
          <div className="headings-tab-modern">
            {renderHeadingsStructure(issues.headingsStructure || [])}
            {issues.headings.length > 0 && (
              <div className="headings-issues-section">
                {renderIssueTable(issues.headings, '見出し構造の問題')}
              </div>
            )}
          </div>
        );
      case 'images':
        return (
          <div className="images-tab-modern">
            {renderAllImages(issues.allImages || [])}
            {issues.images.length > 0 && (
              <div className="images-issues-section">
                {renderIssueTable(issues.images, '画像の問題')}
              </div>
            )}
          </div>
        );
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
        <div className="modal-content-modern">
          {isLighthouse && (
            <>
              <div className="modal-section">
                <strong>説明:</strong>
                <p>{selectedIssue.description}</p>
              </div>
              {selectedIssue.displayValue && (
                <div className="modal-section">
                  <strong>値:</strong>
                  <p>{selectedIssue.displayValue}</p>
                </div>
              )}
              <div className="modal-section">
                <strong>スコア:</strong>
                <span className={`score-badge ${selectedIssue.score === 0 ? 'fail' : 'partial'}`}>
                  {selectedIssue.score}
                </span>
              </div>
            </>
          )}

          {isWCAG && (
            <>
              <div className="modal-section">
                <strong>説明:</strong>
                <p>{selectedIssue.description}</p>
              </div>
              <div className="modal-section">
                <strong>影響レベル:</strong>
                <span className={`impact-badge impact-${selectedIssue.impact}`}>
                  {selectedIssue.impact}
                </span>
              </div>
              <div className="modal-section">
                <strong>影響要素数:</strong>
                <span className="affected-count">{selectedIssue.nodes}個</span>
              </div>
              <div className="modal-section">
                <strong>関連ガイドライン:</strong>
                <div className="tags-list-modern">
                  {selectedIssue.tags.map((tag: string) => (
                    <span key={tag} className="tag-modern">{tag}</span>
                  ))}
                </div>
              </div>
              {selectedIssue.helpUrl && (
                <a
                  href={selectedIssue.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-modern"
                >
                  <ExternalLink size={16} />
                  詳細情報を見る
                </a>
              )}
            </>
          )}

          {!isLighthouse && !isWCAG && (
            <>
              <div className="modal-section">
                <strong>重要度:</strong>
                <span className={`severity-badge severity-${selectedIssue.severity}`}>
                  {selectedIssue.severity}
                </span>
              </div>
              {selectedIssue.element && (
                <div className="modal-section">
                  <strong>要素:</strong>
                  <code className="element-code">{selectedIssue.element}</code>
                </div>
              )}
              {selectedIssue.src && (
                <div className="modal-section">
                  <strong>ソース:</strong>
                  <p className="source-text">{selectedIssue.src}</p>
                </div>
              )}
              {selectedIssue.href && (
                <div className="modal-section">
                  <strong>リンク先:</strong>
                  <p className="link-text">{selectedIssue.href}</p>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div
      className="tab-content-modern"
      role="tabpanel"
      id={`tabpanel-${activeTab}`}
      aria-labelledby={`tab-${activeTab}`}
    >
      {renderTabContent()}
      {renderIssueModal()}
    </div>
  );
};
