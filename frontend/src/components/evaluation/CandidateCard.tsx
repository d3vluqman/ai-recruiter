import React from 'react';
import { ScoreIndicator } from './ScoreIndicator';
import { EvaluationDetails } from './EvaluationDetails';
import type { CandidateWithEvaluation } from '../../types/evaluation';

interface CandidateCardProps {
  candidate: CandidateWithEvaluation;
  isExpanded: boolean;
  onExpand: () => void;
  onClick: () => void;
  onTriggerEvaluation: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isExpanded,
  onExpand,
  onClick,
  onTriggerEvaluation,
}) => {
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getSourceLabel = (source: 'direct' | 'portal'): string => {
    return source === 'portal' ? 'Applicant Portal' : 'Direct Upload';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on action buttons
    if ((e.target as HTMLElement).closest('.candidate-actions, .expand-button')) {
      return;
    }
    onClick();
  };

  return (
    <div className={`candidate-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="candidate-card-header" onClick={handleCardClick}>
        <div className="candidate-info">
          <div className="candidate-name-section">
            <h3 className="candidate-name">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <div className="candidate-contact">
              <span className="candidate-email">{candidate.email}</span>
              {candidate.phone && (
                <span className="candidate-phone">{candidate.phone}</span>
              )}
            </div>
          </div>
          
          <div className="candidate-meta">
            <span className="resume-info">
              {candidate.resume.fileName}
            </span>
            <span className="upload-date">
              Uploaded {formatDate(candidate.resume.uploadedAt)}
            </span>
            <span className="resume-source">
              {getSourceLabel(candidate.resume.source)}
            </span>
          </div>
        </div>

        <div className="candidate-score-section">
          {candidate.evaluation ? (
            <div className="score-indicators">
              <ScoreIndicator
                label="Overall"
                score={candidate.evaluation.overallScore}
                size="large"
                showPercentage
              />
              <div className="sub-scores">
                <ScoreIndicator
                  label="Skills"
                  score={candidate.evaluation.skillScore}
                  size="small"
                />
                <ScoreIndicator
                  label="Experience"
                  score={candidate.evaluation.experienceScore}
                  size="small"
                />
                <ScoreIndicator
                  label="Education"
                  score={candidate.evaluation.educationScore}
                  size="small"
                />
              </div>
            </div>
          ) : (
            <div className="no-evaluation">
              <span className="evaluation-status">Not evaluated</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTriggerEvaluation();
                }}
                className="btn btn-primary btn-small"
              >
                Evaluate
              </button>
            </div>
          )}
        </div>

        <div className="candidate-actions">
          <button
            className={`expand-button ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            title={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 4l4 4H4l4-4z" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && candidate.evaluation && (
        <div className="candidate-card-details">
          <EvaluationDetails evaluation={candidate.evaluation} />
        </div>
      )}

      {isExpanded && !candidate.evaluation && (
        <div className="candidate-card-details">
          <div className="no-evaluation-details">
            <p>This candidate has not been evaluated yet.</p>
            <button
              onClick={onTriggerEvaluation}
              className="btn btn-primary"
            >
              Start Evaluation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};