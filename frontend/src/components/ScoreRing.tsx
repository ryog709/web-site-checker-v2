import React, { useState } from 'react';
import { AlertCircle, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import type { RecommendationDetail } from '../types/index.js';

interface ScoreRingProps {
  score: number;
  label: string;
  color: string;
  size?: number;
  recommendations?: string[];
  recommendationDetails?: RecommendationDetail[];
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  label,
  size = 120,
  recommendations = [],
  recommendationDetails = [],
}) => {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<RecommendationDetail | null>(null);
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#0CCE6A';
    if (score >= 50) return '#FFA400';
    return '#FF4E42';
  };

  const scoreColor = getScoreColor(score);

  const hasRecommendations = recommendations.length > 0 && score < 90;

  return (
    <div className="score-ring-container">
      <div className="score-ring" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="score-ring-svg"
          role="img"
          aria-label={`${label}: ${score}点`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E6E8EB"
            strokeWidth="6"
            fill="none"
            className="score-ring-background"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth="6"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="score-ring-progress"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '50% 50%',
              transition: 'stroke-dashoffset 1s ease-in-out',
            }}
          />
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dy="0.35em"
            className="score-ring-text"
            fontSize={size > 100 ? "20" : "16"}
            fontWeight="bold"
            fill={scoreColor}
          >
            {score}
          </text>
        </svg>
        <div className="score-ring-label">{label}</div>
      </div>
      
      {hasRecommendations && (
        <div className="score-recommendations">
          <button
            className="recommendations-toggle"
            onClick={() => setShowRecommendations(!showRecommendations)}
            aria-expanded={showRecommendations}
          >
            <AlertCircle size={16} />
            <span>改善提案</span>
            {showRecommendations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showRecommendations && (
            <div className="recommendations-list">
              <ul>
                {recommendations.map((recommendation, index) => {
                  const hasDetail = recommendationDetails[index];
                  return (
                    <li key={index}>
                      <div className="recommendation-item">
                        <span dangerouslySetInnerHTML={{
                          __html: recommendation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        }} />
                        {hasDetail && (
                          <button
                            className="detail-button"
                            onClick={() => setSelectedDetail(hasDetail)}
                            title="詳細を表示"
                          >
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {selectedDetail && (
            <div className="modal-overlay" onClick={() => setSelectedDetail(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{selectedDetail.title}</h3>
                  <button 
                    className="modal-close"
                    onClick={() => setSelectedDetail(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-body">
                  <p>{selectedDetail.description}</p>
                  <div className="detail-items">
                    {selectedDetail.items.map((item, index) => (
                      <div key={index} className="detail-item">
                        {item.filename && (
                          <div className="item-filename">
                            <strong>ファイル:</strong> {item.filename}
                          </div>
                        )}
                        {item.src && (
                          <div className="item-src">
                            <strong>パス:</strong> 
                            <code>{item.src}</code>
                          </div>
                        )}
                        {item.element && (
                          <div className="item-element">
                            <strong>要素:</strong> 
                            <code>{item.element}</code>
                          </div>
                        )}
                        {item.details && (
                          <div className="item-details">
                            <strong>詳細:</strong> {item.details}
                          </div>
                        )}
                        {item.location && (
                          <div className="item-location">
                            <strong>場所:</strong> {item.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};