import React, { useState } from 'react';
import type { SemanticAnalysis } from '../types/index.js';
import { Brain, Clock, Zap, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface SemanticAnalysisProps {
  analysis: SemanticAnalysis;
}

export const SemanticAnalysisComponent: React.FC<SemanticAnalysisProps> = ({ analysis }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  if (!analysis || !analysis.isEnabled) {
    return (
      <div className="semantic-analysis disabled">
        <div className="analysis-header">
          <Brain size={20} />
          <h4>AI分析（無効）</h4>
        </div>
        <div className="disabled-message">
          Gemini AI分析が無効になっています。
        </div>
      </div>
    );
  }

  if (analysis.error) {
    return (
      <div className="semantic-analysis error">
        <div className="analysis-header">
          <Brain size={20} />
          <h4>AI分析</h4>
          <AlertCircle size={16} className="error-icon" />
        </div>
        <div className="error-message">
          <strong>分析エラー:</strong> {analysis.error}
          {analysis.errorCode && (
            <div className="error-code">エラーコード: {analysis.errorCode}</div>
          )}
        </div>
      </div>
    );
  }

  if (!analysis.geminiAnalysis) {
    return (
      <div className="semantic-analysis loading">
        <div className="analysis-header">
          <Brain size={20} />
          <h4>AI分析</h4>
          <Loader size={16} className="loading-icon spinning" />
        </div>
        <div className="loading-message">
          AI分析を実行中...
        </div>
      </div>
    );
  }

  const { geminiAnalysis } = analysis;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const formatScore = (score: number) => {
    return Math.round(score);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'poor';
  };

  return (
    <div className="semantic-analysis">
      <div className="analysis-header">
        <Brain size={20} />
        <h4>AI分析結果</h4>
        <CheckCircle size={16} className="success-icon" />
        {analysis.cached && (
          <span className="cached-badge">キャッシュ済み</span>
        )}
      </div>

      <div className="analysis-meta">
        {analysis.processingTime && (
          <div className="meta-item">
            <Clock size={14} />
            <span>{analysis.processingTime}ms</span>
          </div>
        )}
        {geminiAnalysis.modelUsed && (
          <div className="meta-item">
            <Zap size={14} />
            <span>{geminiAnalysis.modelUsed}</span>
          </div>
        )}
        {geminiAnalysis.tokensUsed && (
          <div className="meta-item">
            <span>{geminiAnalysis.tokensUsed} tokens</span>
          </div>
        )}
      </div>

      <div className="analysis-content">
        {/* コンテンツ品質分析 */}
        {geminiAnalysis.contentQuality && (
          <div className="analysis-section">
            <div
              className="section-header clickable"
              onClick={() => toggleSection('content')}
            >
              <div className="section-title">
                <h5>コンテンツ品質</h5>
                <div className={`score-badge ${getScoreColor(geminiAnalysis.contentQuality.score)}`}>
                  {formatScore(geminiAnalysis.contentQuality.score)}
                </div>
              </div>
              <div className="expand-icon">
                {expandedSection === 'content' ? '−' : '+'}
              </div>
            </div>

            {expandedSection === 'content' && (
              <div className="section-content">
                {geminiAnalysis.contentQuality.improvements.length > 0 && (
                  <div className="improvements">
                    <h6>改善提案:</h6>
                    <ul>
                      {geminiAnalysis.contentQuality.improvements.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {geminiAnalysis.contentQuality.details && (
                  <div className="details">
                    <h6>詳細分析:</h6>
                    <p>{geminiAnalysis.contentQuality.details}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ユーザビリティ分析 */}
        {geminiAnalysis.usabilityInsights && (
          <div className="analysis-section">
            <div
              className="section-header clickable"
              onClick={() => toggleSection('usability')}
            >
              <div className="section-title">
                <h5>ユーザビリティ</h5>
                <div className={`score-badge ${getScoreColor(geminiAnalysis.usabilityInsights.score)}`}>
                  {formatScore(geminiAnalysis.usabilityInsights.score)}
                </div>
              </div>
              <div className="expand-icon">
                {expandedSection === 'usability' ? '−' : '+'}
              </div>
            </div>

            {expandedSection === 'usability' && (
              <div className="section-content">
                {geminiAnalysis.usabilityInsights.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h6>推奨事項:</h6>
                    <ul>
                      {geminiAnalysis.usabilityInsights.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {geminiAnalysis.usabilityInsights.details && (
                  <div className="details">
                    <h6>詳細分析:</h6>
                    <p>{geminiAnalysis.usabilityInsights.details}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 包括的分析 */}
        {geminiAnalysis.comprehensiveAnalysis && (
          <div className="analysis-section">
            <div
              className="section-header clickable"
              onClick={() => toggleSection('comprehensive')}
            >
              <div className="section-title">
                <h5>総合分析</h5>
                <div className={`score-badge ${getScoreColor(geminiAnalysis.comprehensiveAnalysis.overallScore)}`}>
                  {formatScore(geminiAnalysis.comprehensiveAnalysis.overallScore)}
                </div>
              </div>
              <div className="expand-icon">
                {expandedSection === 'comprehensive' ? '−' : '+'}
              </div>
            </div>

            {expandedSection === 'comprehensive' && (
              <div className="section-content">
                <div className="comprehensive-grid">
                  {geminiAnalysis.comprehensiveAnalysis.strengths.length > 0 && (
                    <div className="strengths">
                      <h6>強み:</h6>
                      <ul>
                        {geminiAnalysis.comprehensiveAnalysis.strengths.map((strength, index) => (
                          <li key={index} className="positive">{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {geminiAnalysis.comprehensiveAnalysis.weaknesses.length > 0 && (
                    <div className="weaknesses">
                      <h6>改善点:</h6>
                      <ul>
                        {geminiAnalysis.comprehensiveAnalysis.weaknesses.map((weakness, index) => (
                          <li key={index} className="negative">{weakness}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {geminiAnalysis.comprehensiveAnalysis.priorityActions.length > 0 && (
                  <div className="priority-actions">
                    <h6>優先改善項目:</h6>
                    <ol>
                      {geminiAnalysis.comprehensiveAnalysis.priorityActions.map((action, index) => (
                        <li key={index} className="priority">{action}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {geminiAnalysis.comprehensiveAnalysis.detailedReport && (
                  <div className="detailed-report">
                    <h6>詳細レポート:</h6>
                    <div className="report-content">
                      {geminiAnalysis.comprehensiveAnalysis.detailedReport}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* テキスト形式の分析結果 */}
        {geminiAnalysis.textAnalysis && (
          <div className="analysis-section">
            <div
              className="section-header clickable"
              onClick={() => toggleSection('text')}
            >
              <div className="section-title">
                <h5>分析レポート</h5>
              </div>
              <div className="expand-icon">
                {expandedSection === 'text' ? '−' : '+'}
              </div>
            </div>

            {expandedSection === 'text' && (
              <div className="section-content">
                <div className="text-analysis">
                  <pre>{geminiAnalysis.textAnalysis}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="analysis-footer">
        <div className="generated-at">
          分析日時: {new Date(geminiAnalysis.generatedAt).toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  );
};