import React, { useState } from 'react';
import { AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

interface ScoreRingProps {
  score: number;
  label: string;
  color: string;
  size?: number;
  recommendations?: string[];
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  label,
  size = 120,
  recommendations = [],
}) => {
  const [showRecommendations, setShowRecommendations] = useState(false);
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
                {recommendations.map((recommendation, index) => (
                  <li key={index}>{recommendation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};