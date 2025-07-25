import React from 'react';

interface ScoreIndicatorProps {
  label: string;
  score: number;
  size?: 'small' | 'medium' | 'large';
  showPercentage?: boolean;
  className?: string;
}

export const ScoreIndicator: React.FC<ScoreIndicatorProps> = ({
  label,
  score,
  size = 'medium',
  showPercentage = false,
  className = '',
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#28a745'; // Green
    if (score >= 60) return '#ffc107'; // Yellow
    if (score >= 40) return '#fd7e14'; // Orange
    return '#dc3545'; // Red
  };



  const circumference = size === 'large' ? 188.4 : size === 'medium' ? 125.6 : 94.2;
  const radius = size === 'large' ? 30 : size === 'medium' ? 20 : 15;
  const strokeWidth = size === 'large' ? 4 : size === 'medium' ? 3 : 2;
  const center = radius + strokeWidth;
  const viewBoxSize = (radius + strokeWidth) * 2;

  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className={`score-indicator score-indicator-${size} ${className}`}>
      <div className="score-circle-container">
        <svg
          width={viewBoxSize}
          height={viewBoxSize}
          viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
          className="score-circle"
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#e9ecef"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            className="score-progress"
          />
        </svg>
        <div className="score-text">
          <span className="score-value">
            {Math.round(score)}{showPercentage ? '%' : ''}
          </span>
        </div>
      </div>
      <div className="score-label">{label}</div>
    </div>
  );
};