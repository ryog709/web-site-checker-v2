import React, { useState } from 'react';
import type { TabType, CheckResult, Issue, Heading, ImageInfo, BasicAuth, MetaInfo, ConsoleError } from '../types/index.js';
import { ExternalLink, AlertTriangle, AlertCircle, Info, Image as ImageIcon, FileText, Eye, Terminal, Clock, LinkIcon } from 'lucide-react';
import { Modal } from './Modal.js';
import { getProxiedImageUrl, isValidImageUrl } from '../utils/imageUtils.js';
import { getAxeTranslation, translateImpact, translateWcagTag } from '../constants/axeTranslations.js';

interface TabContentProps {
  activeTab: TabType;
  issues: CheckResult['issues'];
  auth?: BasicAuth;
}

// セレクターから検索しやすい情報を抽出する関数
const extractSearchableInfo = (selector: string, ruleId: string): string[] => {
  const searchableItems: string[] = [];
  
  // クラス名を抽出
  const classMatches = selector.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    classMatches.forEach(match => {
      const className = match.substring(1); // ドットを除去
      searchableItems.push(`class="${className}"`);
      searchableItems.push(`className="${className}"`);
      searchableItems.push(className);
    });
  }
  
  // ID名を抽出
  const idMatches = selector.match(/#([a-zA-Z0-9_-]+)/g);
  if (idMatches) {
    idMatches.forEach(match => {
      const idName = match.substring(1); // #を除去
      searchableItems.push(`id="${idName}"`);
      searchableItems.push(idName);
    });
  }
  
  // 要素名を抽出（問題の種類に応じて）
  if (ruleId === 'button-name') {
    const buttonMatches = selector.match(/button/gi);
    if (buttonMatches) {
      searchableItems.push('<button');
      searchableItems.push('button');
      searchableItems.push('type="button"');
      searchableItems.push('type="submit"');
    }
    
    // input[type="button"]やinput[type="submit"]も対象
    if (selector.includes('input')) {
      searchableItems.push('<input');
      searchableItems.push('type="button"');
      searchableItems.push('type="submit"');
      searchableItems.push('type="image"');
    }
  }
  
  // link-name問題の場合
  if (ruleId === 'link-name') {
    if (selector.includes('a')) {
      searchableItems.push('<a');
      searchableItems.push('href=');
      searchableItems.push('link');
    }
  }
  
  // image-alt問題の場合
  if (ruleId === 'image-alt') {
    if (selector.includes('img')) {
      searchableItems.push('<img');
      searchableItems.push('src=');
      searchableItems.push('alt=');
    }
  }
  
  // label問題の場合
  if (ruleId === 'label') {
    if (selector.includes('input')) {
      searchableItems.push('<input');
      searchableItems.push('name=');
      searchableItems.push('id=');
    }
    if (selector.includes('select')) {
      searchableItems.push('<select');
    }
    if (selector.includes('textarea')) {
      searchableItems.push('<textarea');
    }
  }
  
  // 属性値を抽出
  const attrMatches = selector.match(/\[([^=\]]+)=?"?([^"\]]*)"?\]/g);
  if (attrMatches) {
    attrMatches.forEach(match => {
      const attrMatch = match.match(/\[([^=\]]+)=?"?([^"\]]*)"?\]/);
      if (attrMatch) {
        const attrName = attrMatch[1];
        const attrValue = attrMatch[2];
        if (attrValue) {
          searchableItems.push(`${attrName}="${attrValue}"`);
          searchableItems.push(attrValue);
        } else {
          searchableItems.push(attrName);
        }
      }
    });
  }
  
  // 重複を除去して最初の6個まで返す
  return [...new Set(searchableItems)].slice(0, 6);
};

export const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  issues,
  auth,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  // 検索キーワードをクリップボードにコピー
  const handleCopyKeyword = async (keyword: string, event: React.MouseEvent) => {
    try {
      await navigator.clipboard.writeText(keyword);
      
      // 視覚的フィードバック
      const target = event.currentTarget as HTMLElement;
      target.classList.add('copied');
      
      setTimeout(() => {
        target.classList.remove('copied');
      }, 600);
      
    } catch (err) {
      console.warn('クリップボードへのコピーに失敗しました:', err);
      
      // フォールバック: テキスト選択
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(event.currentTarget);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

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
            <p>このページには画像要素（img、SVG）がありません</p>
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
            ページ内の全ての画像（img、SVG）と属性情報を表示。アクセシビリティとパフォーマンスを確認できます。
          </p>
        </div>

        <div className="images-grid">
          {allImages.map((image, index) => (
            <div key={index} className="image-card">
              <div className="image-preview-container">
                {image.type === 'svg' ? (
                  <div className="svg-preview">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <span>インラインSVG</span>
                  </div>
                ) : isValidImageUrl(image.src) ? (
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
                  
                  {image.type === 'svg' && (
                    <div className="attribute-row">
                      <span className="attribute-label">タイプ:</span>
                      <span className="attribute-value svg-type">📐 SVG</span>
                    </div>
                  )}
                  
                  {image.role && (
                    <div className="attribute-row">
                      <span className="attribute-label">Role:</span>
                      <span className="attribute-value">{image.role}</span>
                    </div>
                  )}
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
                
                {/* 画像ファイルサイズ情報を表示 */}
                {title === '画像' && issue.fileSizeMB && (
                  <div className="image-filesize-info">
                    <div className="issue-detail">
                      <strong>ファイルサイズ:</strong> 
                      <span className="filesize-mb">{issue.fileSizeMB.toFixed(2)} MB</span>
                      <span className="filesize-bytes">({issue.fileSize?.toLocaleString()} bytes)</span>
                    </div>
                  </div>
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
                      {issue.score === 0 ? '失敗' : '部分的'}
                    </span>
                  </div>
                  <p className="accessibility-description">{issue.description}</p>
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
              <p className="section-description">
                Web Content Accessibility Guidelines 2.2に基づく自動アクセシビリティ診断結果
              </p>
            </div>
            <div className="issues-grid">
              {axe.map((violation, index) => {
                const translation = getAxeTranslation(violation.id);
                return (
                  <div key={index} className="accessibility-card axe">
                    <div className="accessibility-header">
                      <div className="violation-info">
                        {getSeverityIcon(violation.impact)}
                        <code className="violation-id">{violation.id}</code>
                        <span className={`impact-badge impact-${violation.impact}`}>
                          {translateImpact(violation.impact)}
                        </span>
                      </div>
                      <span className="affected-elements">{violation.nodes}箇所で検出</span>
                    </div>
                    
                    <h5 className="violation-help">{translation.help}</h5>
                    <p className="violation-description">{translation.description}</p>
                    
                    {/* 該当箇所の詳細表示 */}
                    {violation.target && violation.target.length > 0 && (
                      <div className="target-info">
                        <strong>📍 該当箇所:</strong>
                        <div className="target-selectors">
                          {violation.target.map((selector, index) => {
                            // セレクターから検索しやすい情報を抽出
                            const searchableInfo = extractSearchableInfo(selector, violation.id);
                            return (
                              <div key={index} className="target-selector-item">
                                <code className="target-selector">
                                  {selector}
                                </code>
                                {searchableInfo && (
                                  <div className="search-hints">
                                    <span className="search-hint-label">🔍 検索用キーワード:</span>
                                    <div className="search-keywords">
                                      {searchableInfo.map((hint, hintIndex) => (
                                        <span 
                                          key={hintIndex} 
                                          className="search-keyword"
                                          onClick={(e) => handleCopyKeyword(hint, e)}
                                          title={`クリックして "${hint}" をコピー`}
                                        >
                                          {hint}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {translation.fixHint && (
                      <div className="fix-hint">
                        <strong>修正のヒント:</strong>
                        <span>{translation.fixHint}</span>
                      </div>
                    )}
                    

                    {/* デバッグ情報 */}
                    {process.env.NODE_ENV === 'development' && (
                      <div style={{ 
                        marginTop: '10px', 
                        padding: '8px', 
                        background: '#f3f4f6', 
                        borderRadius: '4px', 
                        fontSize: '12px',
                        fontFamily: 'monospace' 
                      }}>
                        <strong>デバッグ情報:</strong><br/>
                        Target: {violation.target ? JSON.stringify(violation.target) : 'null'}<br/>
                        Nodes: {violation.nodes}
                      </div>
                    )}
                    
                    {/* 影響を受ける要素の数を詳細表示 */}
                    {violation.nodes > 1 && (
                      <div className="multiple-elements-info">
                        <Info size={12} />
                        <span>この問題は{violation.nodes}個の要素で発生しています</span>
                      </div>
                    )}
                  </div>
                );
              })}
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

  const renderConsoleErrors = (consoleErrors: ConsoleError[]) => {
    if (consoleErrors.length === 0) {
      return (
        <div className="no-issues">
          <div className="success-state">
            <div className="success-icon">✅</div>
            <h3>コンソールエラーは見つかりませんでした</h3>
            <p>JavaScriptエラーやリクエストエラーは検出されませんでした</p>
          </div>
        </div>
      );
    }

    // エラーを種類別に分類
    const consoleErrorMessages = consoleErrors.filter(error => error.type === 'console-error');
    const javascriptErrors = consoleErrors.filter(error => error.type === 'javascript-error');
    const requestFailures = consoleErrors.filter(error => error.type === 'request-failed');

    const formatTimestamp = (timestamp: string) => {
      return new Date(timestamp).toLocaleString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        month: 'short',
        day: 'numeric'
      });
    };

    const getErrorIcon = (type: string) => {
      switch (type) {
        case 'console-error':
          return <Terminal size={16} className="error-icon console-error" />;
        case 'javascript-error':
          return <AlertTriangle size={16} className="error-icon javascript-error" />;
        case 'request-failed':
          return <LinkIcon size={16} className="error-icon request-failed" />;
        default:
          return <AlertCircle size={16} className="error-icon" />;
      }
    };

    return (
      <div className="console-errors-section">
        <div className="section-header">
          <div className="section-title">
            <Terminal size={20} />
            <h4>コンソールエラー</h4>
            <span className="count-badge error">{consoleErrors.length}</span>
          </div>
          <p className="section-description">
            ページ読み込み時に発生したJavaScriptエラーとリクエストエラーを表示しています。
          </p>
        </div>

        {/* コンソールエラー */}
        {consoleErrorMessages.length > 0 && (
          <div className="error-category">
            <div className="category-header">
              <Terminal size={18} />
              <h5>コンソールエラー ({consoleErrorMessages.length})</h5>
            </div>
            <div className="errors-grid">
              {consoleErrorMessages.map((error, index) => (
                <div key={index} className="error-card console-error">
                  <div className="error-header">
                    {getErrorIcon(error.type)}
                    <span className="error-type">コンソールエラー</span>
                    <div className="error-timestamp">
                      <Clock size={12} />
                      {formatTimestamp(error.timestamp)}
                    </div>
                  </div>
                  <div className="error-message">
                    {error.message}
                  </div>
                  {error.location && (
                    <div className="error-location">
                      <strong>場所:</strong> {error.location.url}:{error.location.lineNumber}:{error.location.columnNumber}
                    </div>
                  )}
                  <button
                    className="detail-button-modern"
                    onClick={() => setSelectedIssue({ ...error, type: 'Console Error' })}
                  >
                    <Eye size={14} />
                    詳細を見る
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* JavaScriptエラー */}
        {javascriptErrors.length > 0 && (
          <div className="error-category">
            <div className="category-header">
              <AlertTriangle size={18} />
              <h5>JavaScriptエラー ({javascriptErrors.length})</h5>
            </div>
            <div className="errors-grid">
              {javascriptErrors.map((error, index) => (
                <div key={index} className="error-card javascript-error">
                  <div className="error-header">
                    {getErrorIcon(error.type)}
                    <span className="error-type">JavaScriptエラー</span>
                    <div className="error-timestamp">
                      <Clock size={12} />
                      {formatTimestamp(error.timestamp)}
                    </div>
                  </div>
                  <div className="error-message">
                    {error.message}
                  </div>
                  {error.stack && (
                    <div className="error-stack">
                      <strong>スタックトレース:</strong>
                      <pre className="stack-trace">{error.stack}</pre>
                    </div>
                  )}
                  <button
                    className="detail-button-modern"
                    onClick={() => setSelectedIssue({ ...error, type: 'JavaScript Error' })}
                  >
                    <Eye size={14} />
                    詳細を見る
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* リクエスト失敗 */}
        {requestFailures.length > 0 && (
          <div className="error-category">
            <div className="category-header">
              <LinkIcon size={18} />
              <h5>リクエスト失敗 ({requestFailures.length})</h5>
            </div>
            <div className="errors-grid">
              {requestFailures.map((error, index) => (
                <div key={index} className="error-card request-failed">
                  <div className="error-header">
                    {getErrorIcon(error.type)}
                    <span className="error-type">リクエスト失敗</span>
                    <div className="error-timestamp">
                      <Clock size={12} />
                      {formatTimestamp(error.timestamp)}
                    </div>
                  </div>
                  <div className="error-message">
                    {error.message}
                  </div>
                  {error.url && (
                    <div className="error-url">
                      <strong>URL:</strong> 
                      <span className="url-text">{error.url}</span>
                    </div>
                  )}
                  {error.failure && (
                    <div className="error-failure">
                      <strong>エラー詳細:</strong> {error.failure.errorText}
                    </div>
                  )}
                  <button
                    className="detail-button-modern"
                    onClick={() => setSelectedIssue({ ...error, type: 'Request Failed' })}
                  >
                    <Eye size={14} />
                    詳細を見る
                  </button>
                </div>
              ))}
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
      case 'console-errors':
        return renderConsoleErrors(issues.consoleErrors || []);
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
                <strong>問題の説明:</strong>
                <p>{selectedIssue.translation?.description || selectedIssue.description}</p>
              </div>
              
              {selectedIssue.translation?.fixHint && (
                <div className="modal-section fix-hint-section">
                  <strong>💡 修正のヒント:</strong>
                  <p>{selectedIssue.translation.fixHint}</p>
                </div>
              )}
              
              <div className="modal-section">
                <strong>影響レベル:</strong>
                <span className={`impact-badge impact-${selectedIssue.impact}`}>
                  {translateImpact(selectedIssue.impact)}
                </span>
              </div>
              
              <div className="modal-section">
                <strong>影響要素数:</strong>
                <span className="affected-count">{selectedIssue.nodes}箇所</span>
              </div>
              
              <div className="modal-section">
                <strong>ルールID:</strong>
                <code className="rule-id">{selectedIssue.id}</code>
              </div>
              
              <div className="modal-section">
                <strong>関連ガイドライン:</strong>
                <div className="tags-list-modern">
                  {selectedIssue.tags.map((tag: string) => (
                    <span key={tag} className="tag-modern">
                      {translateWcagTag(tag) || tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* 要素のハイライト機能をモーダル内でも提供 */}
              {selectedIssue.target && (
                <div className="modal-actions">
                  <button
                    className="highlight-button modal-highlight"
                    onClick={() => {
                      flashHighlight(selectedIssue.target, selectedIssue.impact);
                      // モーダルを閉じて要素を見やすくする
                      setSelectedIssue(null);
                    }}
                  >
                    <Target size={16} />
                    ページ上で要素を表示
                  </button>
                </div>
              )}
              
              {selectedIssue.helpUrl && (
                <a
                  href={selectedIssue.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link-modern"
                >
                  <ExternalLink size={16} />
                  WCAG公式ガイドラインを見る
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
