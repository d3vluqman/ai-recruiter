import React from 'react';
import type { SortOption, FilterOptions } from './CandidateList';

interface CandidateFiltersProps {
  filters: FilterOptions;
  sortOption: SortOption;
  onFiltersChange: (filters: FilterOptions) => void;
  onSortChange: (sortOption: SortOption) => void;
  candidateCount: number;
  totalCount: number;
}

export const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  filters,
  sortOption,
  onFiltersChange,
  onSortChange,
  candidateCount,
  totalCount,
}) => {
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleSortChange = (field: SortOption['field']) => {
    if (sortOption.field === field) {
      // Toggle direction if same field
      onSortChange({
        field,
        direction: sortOption.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      // Default to desc for scores, asc for others
      onSortChange({
        field,
        direction: field.includes('Score') ? 'desc' : 'asc',
      });
    }
  };

  const getSortIcon = (field: SortOption['field']) => {
    if (sortOption.field !== field) {
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="#6c757d">
          <path d="M6 2l3 3H3l3-3zM6 10L3 7h6l-3 3z" />
        </svg>
      );
    }

    return sortOption.direction === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="#0073b1">
        <path d="M6 2l3 3H3l3-3z" />
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="#0073b1">
        <path d="M6 10L3 7h6l-3 3z" />
      </svg>
    );
  };

  const clearFilters = () => {
    onFiltersChange({
      minScore: 0,
      maxScore: 100,
      hasEvaluation: 'all',
      source: 'all',
      searchQuery: '',
    });
  };

  const hasActiveFilters = 
    filters.minScore > 0 ||
    filters.maxScore < 100 ||
    filters.hasEvaluation !== 'all' ||
    filters.source !== 'all' ||
    filters.searchQuery !== '';

  return (
    <div className="candidate-filters">
      <div className="filters-row">
        <div className="search-filter">
          <input
            type="text"
            placeholder="Search candidates..."
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>Evaluation Status:</label>
          <select
            value={filters.hasEvaluation}
            onChange={(e) => handleFilterChange('hasEvaluation', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Candidates</option>
            <option value="evaluated">Evaluated Only</option>
            <option value="not-evaluated">Not Evaluated</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Source:</label>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="filter-select"
          >
            <option value="all">All Sources</option>
            <option value="portal">Applicant Portal</option>
            <option value="direct">Direct Upload</option>
          </select>
        </div>

        <div className="filter-group score-range">
          <label>Score Range:</label>
          <div className="range-inputs">
            <input
              type="number"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value) || 0)}
              className="range-input"
              placeholder="Min"
            />
            <span>-</span>
            <input
              type="number"
              min="0"
              max="100"
              value={filters.maxScore}
              onChange={(e) => handleFilterChange('maxScore', parseInt(e.target.value) || 100)}
              className="range-input"
              placeholder="Max"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={clearFilters} className="btn btn-secondary btn-small">
            Clear Filters
          </button>
        )}
      </div>

      <div className="sort-row">
        <div className="sort-options">
          <span className="sort-label">Sort by:</span>
          <button
            className={`sort-button ${sortOption.field === 'overallScore' ? 'active' : ''}`}
            onClick={() => handleSortChange('overallScore')}
          >
            Overall Score {getSortIcon('overallScore')}
          </button>
          <button
            className={`sort-button ${sortOption.field === 'skillScore' ? 'active' : ''}`}
            onClick={() => handleSortChange('skillScore')}
          >
            Skills {getSortIcon('skillScore')}
          </button>
          <button
            className={`sort-button ${sortOption.field === 'experienceScore' ? 'active' : ''}`}
            onClick={() => handleSortChange('experienceScore')}
          >
            Experience {getSortIcon('experienceScore')}
          </button>
          <button
            className={`sort-button ${sortOption.field === 'name' ? 'active' : ''}`}
            onClick={() => handleSortChange('name')}
          >
            Name {getSortIcon('name')}
          </button>
          <button
            className={`sort-button ${sortOption.field === 'uploadedAt' ? 'active' : ''}`}
            onClick={() => handleSortChange('uploadedAt')}
          >
            Upload Date {getSortIcon('uploadedAt')}
          </button>
        </div>

        <div className="results-count">
          Showing {candidateCount} of {totalCount} candidates
        </div>
      </div>
    </div>
  );
};