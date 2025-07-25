import React, { useState, useEffect, useMemo } from 'react';
import { CandidateCard } from './CandidateCard';
import { CandidateFilters } from './CandidateFilters';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { evaluationService } from '../../services/evaluationService';
import { useAuth } from '../../contexts/AuthContext';
import type { CandidateWithEvaluation } from '../../types/evaluation';
import '../../styles/evaluation.css';

interface CandidateListProps {
  jobPostingId: string;
  onCandidateSelect?: (candidate: CandidateWithEvaluation) => void;
}

export interface SortOption {
  field: 'overallScore' | 'skillScore' | 'experienceScore' | 'name' | 'uploadedAt';
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  minScore: number;
  maxScore: number;
  hasEvaluation: 'all' | 'evaluated' | 'not-evaluated';
  source: 'all' | 'direct' | 'portal';
  searchQuery: string;
}

export const CandidateList: React.FC<CandidateListProps> = ({
  jobPostingId,
  onCandidateSelect,
}) => {
  const { token } = useAuth();
  const [candidates, setCandidates] = useState<CandidateWithEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>({
    field: 'overallScore',
    direction: 'desc',
  });
  const [filters, setFilters] = useState<FilterOptions>({
    minScore: 0,
    maxScore: 100,
    hasEvaluation: 'all',
    source: 'all',
    searchQuery: '',
  });

  useEffect(() => {
    fetchCandidates();
  }, [jobPostingId, token]);

  const fetchCandidates = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Get candidates with evaluations from the new endpoint
      const candidatesWithEvaluations = await evaluationService.getCandidatesWithEvaluations(jobPostingId, token);
      
      setCandidates(candidatesWithEvaluations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedCandidates = useMemo(() => {
    let filtered = candidates.filter((candidate) => {
      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const fullName = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
        const email = candidate.email.toLowerCase();
        if (!fullName.includes(query) && !email.includes(query)) {
          return false;
        }
      }

      // Evaluation filter
      if (filters.hasEvaluation === 'evaluated' && !candidate.evaluation) {
        return false;
      }
      if (filters.hasEvaluation === 'not-evaluated' && candidate.evaluation) {
        return false;
      }

      // Score filter (only for evaluated candidates)
      if (candidate.evaluation) {
        const score = candidate.evaluation.overallScore;
        if (score < filters.minScore || score > filters.maxScore) {
          return false;
        }
      }

      // Source filter
      if (filters.source !== 'all' && candidate.resume.source !== filters.source) {
        return false;
      }

      return true;
    });

    // Sort candidates
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortOption.field) {
        case 'overallScore':
          aValue = a.evaluation?.overallScore ?? -1;
          bValue = b.evaluation?.overallScore ?? -1;
          break;
        case 'skillScore':
          aValue = a.evaluation?.skillScore ?? -1;
          bValue = b.evaluation?.skillScore ?? -1;
          break;
        case 'experienceScore':
          aValue = a.evaluation?.experienceScore ?? -1;
          bValue = b.evaluation?.experienceScore ?? -1;
          break;
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'uploadedAt':
          aValue = new Date(a.resume.uploadedAt).getTime();
          bValue = new Date(b.resume.uploadedAt).getTime();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOption.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOption.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [candidates, filters, sortOption]);

  const handleCandidateExpand = (candidateId: string) => {
    setExpandedCandidateId(expandedCandidateId === candidateId ? null : candidateId);
  };

  const handleCandidateClick = (candidate: CandidateWithEvaluation) => {
    onCandidateSelect?.(candidate);
  };

  const handleTriggerEvaluation = async (candidate: CandidateWithEvaluation) => {
    if (!token) return;

    try {
      const evaluation = await evaluationService.triggerEvaluationForResume(
        candidate.resume.id,
        jobPostingId,
        token
      );

      // Update the candidate with the new evaluation
      setCandidates(prev => prev.map(c => 
        c.id === candidate.id ? { ...c, evaluation } : c
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to trigger evaluation');
    }
  };

  if (loading) {
    return (
      <div className="candidate-list">
        <LoadingSpinner message="Loading candidates..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-list">
        <div className="error-message">
          {error}
          <button onClick={fetchCandidates} className="btn btn-primary" style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  const evaluatedCount = candidates.filter(c => c.evaluation).length;
  const averageScore = evaluatedCount > 0 
    ? candidates
        .filter(c => c.evaluation)
        .reduce((sum, c) => sum + c.evaluation!.overallScore, 0) / evaluatedCount
    : 0;

  return (
    <div className="candidate-list">
      <div className="candidate-list-header">
        <div className="candidate-stats">
          <h2>Candidates ({filteredAndSortedCandidates.length})</h2>
          <div className="stats-summary">
            <span className="stat-item">
              <strong>{evaluatedCount}</strong> evaluated
            </span>
            {evaluatedCount > 0 && (
              <span className="stat-item">
                <strong>{averageScore.toFixed(1)}%</strong> avg score
              </span>
            )}
          </div>
        </div>
      </div>

      <CandidateFilters
        filters={filters}
        sortOption={sortOption}
        onFiltersChange={setFilters}
        onSortChange={setSortOption}
        candidateCount={filteredAndSortedCandidates.length}
        totalCount={candidates.length}
      />

      {filteredAndSortedCandidates.length === 0 ? (
        <div className="empty-state">
          <h3>No candidates found</h3>
          <p>
            {candidates.length === 0
              ? 'No applications have been submitted for this job posting yet.'
              : 'No candidates match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="candidate-cards">
          {filteredAndSortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isExpanded={expandedCandidateId === candidate.id}
              onExpand={() => handleCandidateExpand(candidate.id)}
              onClick={() => handleCandidateClick(candidate)}
              onTriggerEvaluation={() => handleTriggerEvaluation(candidate)}
            />
          ))}
        </div>
      )}
    </div>
  );
};