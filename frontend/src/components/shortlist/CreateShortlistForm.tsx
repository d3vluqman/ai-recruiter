import React, { useState, useEffect } from 'react';
import { shortlistService, Shortlist, CreateShortlistRequest } from '../../services/shortlistService';
import { evaluationService } from '../../services/evaluationService';

interface CreateShortlistFormProps {
  jobId: string;
  onSuccess: (shortlist: Shortlist) => void;
  onCancel: () => void;
}

interface CandidateOption {
  id: string;
  name: string;
  email: string;
  score: number;
  evaluationId: string;
}

export const CreateShortlistForm: React.FC<CreateShortlistFormProps> = ({
  jobId,
  onSuccess,
  onCancel
}) => {
  const [selectionType, setSelectionType] = useState<'automatic' | 'manual'>('automatic');
  const [topCandidateCount, setTopCandidateCount] = useState<number>(5);
  const [minimumScore, setMinimumScore] = useState<number>(70);
  const [requiredSkills, setRequiredSkills] = useState<string>('');
  const [availableCandidates, setAvailableCandidates] = useState<CandidateOption[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectionType === 'manual') {
      loadAvailableCandidates();
    }
  }, [selectionType, jobId]);

  const loadAvailableCandidates = async () => {
    try {
      const evaluations = await evaluationService.getEvaluationsByJob(jobId);
      const candidates = evaluations.map(evaluation => ({
        id: evaluation.candidate?.id || '',
        name: evaluation.candidate ? `${evaluation.candidate.firstName} ${evaluation.candidate.lastName}` : 'Unknown',
        email: evaluation.candidate?.email || '',
        score: evaluation.overallScore,
        evaluationId: evaluation.id
      })).sort((a, b) => b.score - a.score);
      
      setAvailableCandidates(candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const request: CreateShortlistRequest = {
        jobPostingId: jobId,
        selectionCriteria: {
          manualSelection: selectionType === 'manual'
        }
      };

      if (selectionType === 'automatic') {
        request.selectionCriteria.topCandidateCount = topCandidateCount;
        request.selectionCriteria.minimumScore = minimumScore;
        
        if (requiredSkills.trim()) {
          request.selectionCriteria.requiredSkills = requiredSkills
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0);
        }
      } else {
        request.manualCandidateIds = selectedCandidates;
      }

      const shortlist = await shortlistService.createShortlist(request);
      onSuccess(shortlist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create shortlist');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateToggle = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  return (
    <div className="create-shortlist-form-overlay">
      <div className="create-shortlist-form">
        <div className="form-header">
          <h3>Create New Shortlist</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Selection Method</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  value="automatic"
                  checked={selectionType === 'automatic'}
                  onChange={(e) => setSelectionType(e.target.value as 'automatic')}
                />
                Automatic Selection
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  value="manual"
                  checked={selectionType === 'manual'}
                  onChange={(e) => setSelectionType(e.target.value as 'manual')}
                />
                Manual Selection
              </label>
            </div>
          </div>

          {selectionType === 'automatic' && (
            <>
              <div className="form-group">
                <label htmlFor="topCandidateCount">Number of Top Candidates</label>
                <input
                  type="number"
                  id="topCandidateCount"
                  value={topCandidateCount}
                  onChange={(e) => setTopCandidateCount(parseInt(e.target.value))}
                  min="1"
                  max="50"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="minimumScore">Minimum Score (%)</label>
                <input
                  type="number"
                  id="minimumScore"
                  value={minimumScore}
                  onChange={(e) => setMinimumScore(parseInt(e.target.value))}
                  min="0"
                  max="100"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="requiredSkills">Required Skills (comma-separated, optional)</label>
                <input
                  type="text"
                  id="requiredSkills"
                  value={requiredSkills}
                  onChange={(e) => setRequiredSkills(e.target.value)}
                  placeholder="JavaScript, React, Node.js"
                />
              </div>
            </>
          )}

          {selectionType === 'manual' && (
            <div className="form-group">
              <label>Select Candidates</label>
              <div className="candidate-selection">
                {availableCandidates.length === 0 ? (
                  <p>No candidates available for selection</p>
                ) : (
                  <div className="candidate-list">
                    {availableCandidates.map(candidate => (
                      <div key={candidate.id} className="candidate-option">
                        <label className="candidate-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedCandidates.includes(candidate.id)}
                            onChange={() => handleCandidateToggle(candidate.id)}
                          />
                          <div className="candidate-info">
                            <div className="candidate-name">{candidate.name}</div>
                            <div className="candidate-details">
                              <span className="candidate-email">{candidate.email}</span>
                              <span className="candidate-score">{candidate.score.toFixed(1)}%</span>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || (selectionType === 'manual' && selectedCandidates.length === 0)}
            >
              {loading ? 'Creating...' : 'Create Shortlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};