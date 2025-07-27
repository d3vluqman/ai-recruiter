import React from 'react';
import { ShortlistCandidate } from '../../services/shortlistService';
import { ScoreIndicator } from '../evaluation/ScoreIndicator';

interface ShortlistCandidateListProps {
  candidates: ShortlistCandidate[];
  shortlistStatus: 'draft' | 'finalized' | 'sent';
  onCandidateRemove: (candidateId: string) => void;
}

export const ShortlistCandidateList: React.FC<ShortlistCandidateListProps> = ({
  candidates,
  shortlistStatus,
  onCandidateRemove
}) => {
  if (candidates.length === 0) {
    return (
      <div className="no-candidates">
        <p>No candidates in this shortlist</p>
      </div>
    );
  }

  return (
    <div className="shortlist-candidate-list">
      <div className="candidate-list-header">
        <h4>Shortlisted Candidates ({candidates.length})</h4>
      </div>

      <div className="candidate-cards">
        {candidates.map(candidate => (
          <div key={candidate.id} className="shortlist-candidate-card">
            <div className="candidate-header">
              <div className="candidate-info">
                <h5 className="candidate-name">
                  {candidate.candidate?.firstName} {candidate.candidate?.lastName}
                </h5>
                <p className="candidate-email">{candidate.candidate?.email}</p>
                {candidate.candidate?.phone && (
                  <p className="candidate-phone">{candidate.candidate.phone}</p>
                )}
              </div>
              
              <div className="candidate-actions">
                {candidate.selectedManually && (
                  <span className="manual-selection-badge">Manual</span>
                )}
                {shortlistStatus === 'draft' && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onCandidateRemove(candidate.candidateId)}
                    title="Remove from shortlist"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {candidate.evaluation && (
              <div className="candidate-evaluation">
                <div className="score-section">
                  <div className="overall-score">
                    <ScoreIndicator 
                      score={candidate.evaluation.overallScore} 
                      size="large"
                      label="Overall Score"
                    />
                  </div>
                  
                  <div className="detailed-scores">
                    <div className="score-item">
                      <ScoreIndicator 
                        score={candidate.evaluation.skillScore} 
                        size="small"
                        label="Skills"
                      />
                    </div>
                    <div className="score-item">
                      <ScoreIndicator 
                        score={candidate.evaluation.experienceScore} 
                        size="small"
                        label="Experience"
                      />
                    </div>
                    <div className="score-item">
                      <ScoreIndicator 
                        score={candidate.evaluation.educationScore} 
                        size="small"
                        label="Education"
                      />
                    </div>
                  </div>
                </div>

                {candidate.evaluation.evaluationDetails?.skillMatches && (
                  <div className="skill-matches">
                    <h6>Key Skills</h6>
                    <div className="skills-list">
                      {candidate.evaluation.evaluationDetails.skillMatches
                        .filter((skill: any) => skill.matched)
                        .slice(0, 5)
                        .map((skill: any, index: number) => (
                          <span key={index} className="skill-tag matched">
                            {skill.skillName}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {candidate.evaluation.evaluationDetails?.experienceMatch && (
                  <div className="experience-summary">
                    <h6>Experience</h6>
                    <p>
                      {candidate.evaluation.evaluationDetails.experienceMatch.totalYears} years total, 
                      {candidate.evaluation.evaluationDetails.experienceMatch.relevantYears} years relevant
                    </p>
                  </div>
                )}

                {candidate.evaluation.evaluationDetails?.recommendations && 
                 candidate.evaluation.evaluationDetails.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h6>Highlights</h6>
                    <ul>
                      {candidate.evaluation.evaluationDetails.recommendations
                        .slice(0, 2)
                        .map((rec: string, index: number) => (
                          <li key={index}>{rec}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};