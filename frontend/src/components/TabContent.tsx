import React, { useState } from 'react';
import type { TabType, CheckResult, Issue, Heading, ImageInfo, BasicAuth, MetaInfo } from '../types/index.js';
import { ExternalLink, AlertTriangle, AlertCircle, Info, Image as ImageIcon, FileText, Eye } from 'lucide-react';
import { Modal } from './Modal.js';
import { getProxiedImageUrl, isValidImageUrl } from '../utils/imageUtils.js';

interface TabContentProps {
  activeTab: TabType;
  issues: CheckResult['issues'];
  auth?: BasicAuth;
}

export const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  issues,
  auth,
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
                            {isValidImageUrl(img.src) ? (
                              <img 
                                src={getProxiedImageUrl(img.src, auth)} 
                                alt={img.alt || '画像'}
                                className="preview-image-horizontal"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextElementSibling) {
                                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                                  }
                                }}
                              />
                            ) : (
                              <div className="image-fallback-horizontal">
                                <ImageIcon size={24} />
                              </div>
                            )}
                            <div className="image-fallback-horizontal" style={{ display: 'none' }}>
                              <ImageIcon size={24} />
                            </div>
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
                {isValidImageUrl(image.src) ? (
                  <img 
                    src={getProxiedImageUrl(image.src, auth)} 
                    alt={image.alt || `画像 ${image.index}`}
                    className="image-preview-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                      }
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
                <span className="issue-type">{issue.type || 'その他'}</span>
              </div>
              
              {/* 画像問題の場合は画像プレビューを表示 */}
              {issue.src && title === '画像' && (
                <div className="issue-image-preview">
                  {isValidImageUrl(issue.src) ? (
                    <img 
                      src={getProxiedImageUrl(issue.src, auth)} 
                      alt="問題のある画像"
                      className="issue-preview-image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextElementSibling) {
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }
                      }}
                    />
                  ) : (
                    <div className="issue-image-fallback">
                      <ImageIcon size={32} />
                      <span>画像を読み込めません</span>
                    </div>
                  )}
                  <div className="issue-image-fallback" style={{ display: 'none' }}>
                    <ImageIcon size={32} />
                    <span>画像を読み込めません</span>
                  </div>
                </div>
              )}
              
              <div className="issue-content">
                <h5 className="issue-message">{issue.message}</h5>
                {issue.element && (
                  <code className="issue-element">{issue.element}</code>
                )}
                
                {/* リンク問題の場合は詳細情報を表示 */}
                {title === 'リンク' && issue.href && (
                  <div className="link-issue-details">
                    <div className="issue-detail">
                      <strong>リンク先:</strong> 
                      <span className="link-url">{issue.href}</span>
                    </div>
                    
                    {issue.linkText && (
                      <div className="issue-detail">
                        <strong>リンクテキスト:</strong> 
                        <span className="link-text">"{issue.linkText}"</span>
                      </div>
                    )}
                    
                    {issue.linkHtml && (
                      <div className="issue-detail">
                        <strong>HTML:</strong>
                        <code className="link-html">{issue.linkHtml}</code>
                      </div>
                    )}
                    
                    <div className="issue-explanation">
                      <strong>問題の説明:</strong>
                      {issue.type === 'リンクテキストなし' && (
                        <span>このリンクには読み上げソフトが理解できるテキストがありません。視覚障害のあるユーザーがリンクの目的を理解できません。alt属性のある画像を含むか、aria-labelを追加してください。</span>
                      )}
                      {issue.type === 'セキュリティ不備' && (
                        <span>外部サイトへのリンクにセキュリティ対策が不足しています。悪意のあるサイトがタブを乗っ取る可能性があります。rel="noopener"を追加してください。</span>
                      )}
                    </div>
                  </div>
                )}
                
                {issue.src && (
                  <div className="issue-detail">
                    <strong>ソース:</strong> {issue.src}
                  </div>
                )}
                {issue.href && title !== 'リンク' && (
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
                <h4>WCAG 2.2 AA準拠チェック</h4>
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
            <div className="accessibility-checklist">
              <div className="success-icon">🎉</div>
              <h3>アクセシビリティ診断結果（WCAG 2.2 AA）</h3>
              <div className="checklist">
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>画像に代替テキスト（alt属性）が正しく設定されています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>テキストと背景のコントラスト比は4.5:1以上です</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>フォームにラベルが正しく紐づいています（label + input）</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>キーボード操作でフォーカス移動が可能です</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>フォーカス時に要素が隠れないよう適切に表示されます</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>タッチターゲットのサイズが十分確保されています（24px以上）</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>ドラッグ操作に代替手段が提供されています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>認証に認知的負荷の少ない方法が提供されています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>同じ情報の重複入力が回避されています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>ヘルプ機能の配置が一貫しています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>aria属性は適切に使用されています</span>
                </div>
                <div className="checklist-item">
                  <span className="check-icon">✅</span>
                  <span>ページ構造がセマンティックに記述されています</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderMetaInfo = (metaIssues: Issue[], allMeta: MetaInfo[]) => {
    return (
      <div className="meta-info-section">
        {/* 問題がなく、メタ情報がある場合 */}
        {metaIssues.length === 0 && allMeta.length > 0 && (
          <div className="meta-success">
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span>メタ情報は適切に設定されています</span>
            </div>
          </div>
        )}

        {/* メタ情報の詳細表示 */}
        {allMeta.length > 0 && (
          <div className="meta-details">
            <div className="section-header">
              <div className="section-title">
                <FileText size={20} />
                <h4>メタ情報の詳細</h4>
              </div>
            </div>
            
            <div className="meta-grid">
              {allMeta.map((meta, index) => (
                <div key={index} className="meta-item">
                  <div className="meta-item-header">
                    <span className={`meta-type-badge ${meta.type}`}>
                      {meta.type === 'title' && '📄'}
                      {meta.type === 'description' && '📝'}
                      {meta.type === 'viewport' && '📱'}
                      {meta.type === 'og' && '🌐'}
                      {meta.type === 'twitter' && '🐦'}
                      {meta.type === 'other' && '🔧'}
                    </span>
                    <strong>{meta.name}</strong>
                    {meta.length && (
                      <span className={`length-badge ${meta.length > 60 ? 'long' : meta.length < 30 ? 'short' : 'good'}`}>
                        {meta.length}文字
                      </span>
                    )}
                  </div>
                  <div className="meta-content">
                    {meta.content}
                  </div>
                  {meta.property && (
                    <div className="meta-property">
                      {meta.property}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 問題がある場合の表示 */}
        {metaIssues.length > 0 && (
          <div className="meta-issues">
            <div className="section-header">
              <div className="section-title">
                <AlertTriangle size={20} />
                <h4>メタ情報の問題</h4>
                <span className="count-badge error">{metaIssues.length}</span>
              </div>
            </div>

            <div className="issues-grid">
              {metaIssues.map((issue, index) => (
                <div key={index} className="issue-card modern">
                  <div className="issue-header">
                    <div className="issue-icon">
                      {issue.severity === 'error' && <AlertTriangle size={16} />}
                      {issue.severity === 'warning' && <AlertCircle size={16} />}
                      {issue.severity === 'info' && <Info size={16} />}
                    </div>
                    <div className="issue-title">
                      <span className="issue-type">{issue.type}</span>
                      {issue.element && <span className="issue-element">{issue.element}</span>}
                    </div>
                    <div className={`severity-badge ${issue.severity}`}>
                      {issue.severity === 'error' && 'エラー'}
                      {issue.severity === 'warning' && '警告'}
                      {issue.severity === 'info' && '情報'}
                    </div>
                  </div>
                  <div className="issue-message">
                    {issue.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 問題もメタ情報もない場合 */}
        {metaIssues.length === 0 && allMeta.length === 0 && (
          <div className="no-issues">
            <div className="success-state">
              <div className="success-icon">❓</div>
              <h3>メタ情報が見つかりません</h3>
              <p>ページにメタ情報が設定されていないか、取得できませんでした</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderHtmlStructure = (htmlStructureIssues: Issue[]) => {
    // 成功メッセージと問題を分離
    const successMessages = htmlStructureIssues.filter(issue => issue.severity === 'success');
    const actualIssues = htmlStructureIssues.filter(issue => issue.severity !== 'success');

    return (
      <div className="html-structure-section">
        {/* 成功メッセージがある場合 */}
        {successMessages.length > 0 && (
          <div className="html-success">
            <div className="success-checklist">
              <div className="success-icon">✅</div>
              <h3>HTML構造の診断結果</h3>
              <div className="checklist">
                {successMessages.map((success, index) => (
                  <div key={index} className="checklist-item">
                    <span className="check-icon">✅</span>
                    <span>{success.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 問題がある場合の表示 */}
        {actualIssues.length > 0 && (
          <div className="html-issues">
            <div className="section-header">
              <div className="section-title">
                <AlertTriangle size={20} />
                <h4>HTML構造の問題</h4>
                <span className="count-badge error">{actualIssues.length}</span>
              </div>
              <p className="section-description">
                HTML文書の構造に関する問題が見つかりました。これらの問題は、ブラウザの表示やアクセシビリティに影響する可能性があります。
              </p>
            </div>

            <div className="issues-grid">
              {actualIssues.map((issue, index) => (
                <div key={index} className={`issue-card severity-${issue.severity}`}>
                  <div className="issue-header">
                    <span className="issue-type">{issue.type}</span>
                    <span className={`severity-badge severity-${issue.severity}`}>
                      {issue.severity === 'error' && 'エラー'}
                      {issue.severity === 'warning' && '警告'}
                      {issue.severity === 'info' && '情報'}
                    </span>
                  </div>
                  
                  <div className="issue-content">
                    <h5>{issue.message}</h5>
                    
                    {issue.element && (
                      <div className="issue-element">
                        <code>&lt;{issue.element}&gt;</code>
                      </div>
                    )}
                    
                    {issue.className && (
                      <div className="issue-class">
                        <strong>問題箇所のクラス名:</strong>
                        <code className="class-name">{issue.className}</code>
                      </div>
                    )}
                    
                    {issue.suggestion && (
                      <div className="issue-suggestion">
                        <strong>改善案:</strong>
                        <p>{issue.suggestion}</p>
                      </div>
                    )}
                    
                    <button
                      className="detail-button-modern"
                      onClick={() => setSelectedIssue(issue)}
                    >
                      詳細を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 問題もない場合（バックアップ） */}
        {htmlStructureIssues.length === 0 && (
          <div className="no-issues">
            <div className="success-state">
              <div className="success-icon">✅</div>
              <h3>HTML構造に問題はありません</h3>
              <p>HTML文書の構造は適切に記述されています</p>
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
        return renderAllImages(issues.allImages || []);
      case 'image-issues':
        return renderIssueTable(issues.images, '画像');
      case 'links':
        return renderIssueTable(issues.links, 'リンク');
      case 'meta':
        return renderMetaInfo(issues.meta, issues.allMeta || []);
      case 'html-structure':
        return renderHtmlStructure(issues.htmlStructure || []);
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
