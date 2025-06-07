import React from 'react';

interface ScoreRingProps {
  score: number;
  label: string;
  color: string;
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  label,
  color,
  size = 120,
}) => {
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

  return (
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
  );
};