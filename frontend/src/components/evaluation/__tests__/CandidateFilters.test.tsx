import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CandidateFilters } from '../CandidateFilters';
import type { SortOption, FilterOptions } from '../CandidateList';

const mockFilters: FilterOptions = {
  minScore: 0,
  maxScore: 100,
  hasEvaluation: 'all',
  source: 'all',
  searchQuery: '',
};

const mockSortOption: SortOption = {
  field: 'overallScore',
  direction: 'desc',
};

describe('CandidateFilters', () => {
  const mockProps = {
    filters: mockFilters,
    sortOption: mockSortOption,
    onFiltersChange: vi.fn(),
    onSortChange: vi.fn(),
    candidateCount: 5,
    totalCount: 10,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all filter controls', () => {
    render(<CandidateFilters {...mockProps} />);
    
    expect(screen.getByPlaceholderText('Search candidates...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Candidates')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Sources')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
  });

  it('renders all sort buttons', () => {
    render(<CandidateFilters {...mockProps} />);
    
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Upload Date')).toBeInTheDocument();
  });

  it('displays candidate count correctly', () => {
    render(<CandidateFilters {...mockProps} />);
    
    expect(screen.getByText('Showing 5 of 10 candidates')).toBeInTheDocument();
  });

  it('calls onFiltersChange when search query changes', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search candidates...');
    fireEvent.change(searchInput, { target: { value: 'john' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      searchQuery: 'john',
    });
  });

  it('calls onFiltersChange when evaluation status filter changes', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const evaluationSelect = screen.getByDisplayValue('All Candidates');
    fireEvent.change(evaluationSelect, { target: { value: 'evaluated' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      hasEvaluation: 'evaluated',
    });
  });

  it('calls onFiltersChange when source filter changes', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const sourceSelect = screen.getByDisplayValue('All Sources');
    fireEvent.change(sourceSelect, { target: { value: 'portal' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      source: 'portal',
    });
  });

  it('calls onFiltersChange when score range changes', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const minScoreInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minScoreInput, { target: { value: '50' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      minScore: 50,
    });
  });

  it('calls onSortChange when sort button is clicked', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const skillsButton = screen.getByText('Skills');
    fireEvent.click(skillsButton);
    
    expect(mockProps.onSortChange).toHaveBeenCalledWith({
      field: 'skillScore',
      direction: 'desc',
    });
  });

  it('toggles sort direction when same field is clicked', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const overallScoreButton = screen.getByText('Overall Score');
    fireEvent.click(overallScoreButton);
    
    expect(mockProps.onSortChange).toHaveBeenCalledWith({
      field: 'overallScore',
      direction: 'asc',
    });
  });

  it('shows clear filters button when filters are active', () => {
    const activeFilters = {
      ...mockFilters,
      searchQuery: 'test',
    };
    
    render(<CandidateFilters {...mockProps} filters={activeFilters} />);
    
    expect(screen.getByText('Clear Filters')).toBeInTheDocument();
  });

  it('does not show clear filters button when no active filters', () => {
    render(<CandidateFilters {...mockProps} />);
    
    expect(screen.queryByText('Clear Filters')).not.toBeInTheDocument();
  });

  it('clears all filters when clear button is clicked', () => {
    const activeFilters = {
      ...mockFilters,
      searchQuery: 'test',
      minScore: 50,
      hasEvaluation: 'evaluated' as const,
    };
    
    render(<CandidateFilters {...mockProps} filters={activeFilters} />);
    
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      minScore: 0,
      maxScore: 100,
      hasEvaluation: 'all',
      source: 'all',
      searchQuery: '',
    });
  });

  it('applies active class to current sort button', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const overallScoreButton = screen.getByText('Overall Score');
    expect(overallScoreButton).toHaveClass('active');
  });

  it('handles invalid score input gracefully', () => {
    render(<CandidateFilters {...mockProps} />);
    
    const minScoreInput = screen.getByPlaceholderText('Min');
    fireEvent.change(minScoreInput, { target: { value: 'invalid' } });
    
    expect(mockProps.onFiltersChange).toHaveBeenCalledWith({
      ...mockFilters,
      minScore: 0,
    });
  });
});