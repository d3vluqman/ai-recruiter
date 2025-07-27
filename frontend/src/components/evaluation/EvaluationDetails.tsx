import React from 'react';
import { ScoreIndicator } from './ScoreIndicator';
import type { Evaluation } from '../../types/evaluation';

interface EvaluationDetailsProps {
  evaluation: Evaluation;
}

export const EvaluationDetails: React.FC<EvaluationDetailsProps> = ({
  evaluation,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSkillMatchIcon = (matched: boolean, required: boolean) => {
    if (matched) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#28a745">
          <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
        </svg>
      );
    } else if (required) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#dc3545">
          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
        </svg>
      );
    } else {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="#6c757d">
          <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
          <path d="M5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
        </svg>
      );
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#28a745';
    if (confidence >= 0.6) return '#ffc107';
    return '#dc3545';
  };

  return (
    <div className="evaluation-details">
      <div className="evaluation-header">
        <div className="evaluation-scores">
          <ScoreIndicator
            label="Overall Score"
            score={evaluation.overallScore}
            size="large"
            showPercentage
          />
          <div className="detailed-scores">
            <ScoreIndicator
              label="Skills Match"
              score={evaluation.skillScore}
              size="medium"
              showPercentage
            />
            <ScoreIndicator
              label="Experience"
              score={evaluation.experienceScore}
              size="medium"
              showPercentage
            />
            <ScoreIndicator
              label="Education"
              score={evaluation.educationScore}
              size="medium"
              showPercentage
            />
          </div>
        </div>
        <div className="evaluation-meta">
          <span className="evaluation-date">
            Evaluated on {formatDate(evaluation.evaluatedAt)}
          </span>
          <span className={`evaluation-status status-${evaluation.status}`}>
            {evaluation.status}
          </span>
        </div>
      </div>

      {evaluation.evaluationDetails.evaluationSummary && (
        <div className="evaluation-section">
          <h4>Summary</h4>
          <p className="evaluation-summary">
            {evaluation.evaluationDetails.evaluationSummary}
          </p>
        </div>
      )}

      <div className="evaluation-section">
        <h4>Skills Analysis</h4>
        <div className="skills-analysis">
          {evaluation.evaluationDetails.skillMatches.length > 0 ? (
            <div className="skill-matches">
              {evaluation.evaluationDetails.skillMatches.map((skill, index) => (
                <div
                  key={index}
                  className={`skill-match ${skill.matched ? 'matched' : 'not-matched'} ${
                    skill.required ? 'required' : 'optional'
                  }`}
                >
                  <div className="skill-info">
                    <span className="skill-icon">
                      {getSkillMatchIcon(skill.matched, skill.required)}
                    </span>
                    <span className="skill-name">{skill.skillName}</span>
                    {skill.required && (
                      <span className="skill-badge required">Required</span>
                    )}
                  </div>
                  <div className="skill-confidence">
                    <span
                      className="confidence-score"
                      style={{ color: getConfidenceColor(skill.confidenceScore) }}
                    >
                      {Math.round(skill.confidenceScore * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No skill analysis available</p>
          )}
        </div>
      </div>

      <div className="evaluation-section">
        <h4>Experience Analysis</h4>
        <div className="experience-analysis">
          <div className="experience-stats">
            <div className="experience-stat">
              <span className="stat-label">Total Experience</span>
              <span className="stat-value">
                {evaluation.evaluationDetails.experienceMatch.totalYears} years
              </span>
            </div>
            <div className="experience-stat">
              <span className="stat-label">Relevant Experience</span>
              <span className="stat-value">
                {evaluation.evaluationDetails.experienceMatch.relevantYears} years
              </span>
            </div>
            {evaluation.evaluationDetails.experienceMatch.requiredYears && (
              <div className="experience-stat">
                <span className="stat-label">Required Experience</span>
                <span className="stat-value">
                  {evaluation.evaluationDetails.experienceMatch.requiredYears} years
                </span>
              </div>
            )}
          </div>
          {evaluation.evaluationDetails.experienceMatch.relevantPositions && 
           evaluation.evaluationDetails.experienceMatch.relevantPositions.length > 0 && (
            <div className="relevant-positions">
              <h5>Relevant Positions</h5>
              <ul>
                {evaluation.evaluationDetails.experienceMatch.relevantPositions.map(
                  (position, index) => (
                    <li key={index}>{position}</li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="evaluation-section">
        <h4>Education Analysis</h4>
        <div className="education-analysis">
          <div className="education-matches">
            <div className="education-match">
              <span className="match-label">Degree Match:</span>
              <span className={`match-status ${
                evaluation.evaluationDetails.educationMatch.degreeMatch ? 'matched' : 'not-matched'
              }`}>
                {evaluation.evaluationDetails.educationMatch.degreeMatch ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="education-match">
              <span className="match-label">Field Match:</span>
              <span className={`match-status ${
                evaluation.evaluationDetails.educationMatch.fieldMatch ? 'matched' : 'not-matched'
              }`}>
                {evaluation.evaluationDetails.educationMatch.fieldMatch ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
          {evaluation.evaluationDetails.educationMatch.matchedDegrees && 
           evaluation.evaluationDetails.educationMatch.matchedDegrees.length > 0 && (
            <div className="matched-degrees">
              <h5>Matched Degrees</h5>
              <ul>
                {evaluation.evaluationDetails.educationMatch.matchedDegrees.map(
                  (degree, index) => (
                    <li key={index}>{degree}</li>
                  )
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {evaluation.evaluationDetails.gapAnalysis && 
       evaluation.evaluationDetails.gapAnalysis.length > 0 && (
        <div className="evaluation-section">
          <h4>Gap Analysis</h4>
          <ul className="gap-analysis">
            {evaluation.evaluationDetails.gapAnalysis.map((gap, index) => (
              <li key={index} className="gap-item">
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.evaluationDetails.recommendations && 
       evaluation.evaluationDetails.recommendations.length > 0 && (
        <div className="evaluation-section">
          <h4>Recommendations</h4>
          <ul className="recommendations">
            {evaluation.evaluationDetails.recommendations.map((recommendation, index) => (
              <li key={index} className="recommendation-item">
                {recommendation}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};