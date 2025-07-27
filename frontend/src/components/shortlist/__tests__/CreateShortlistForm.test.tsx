import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CreateShortlistForm } from '../CreateShortlistForm';
import { shortlistService } from '../../../services/shortlistService';
import { evaluationService } from '../../../services/evaluationService';

// Mock the services
vi.mock('../../../services/shortlistService', () => ({
  shortlistService: {
    createShortlist: vi.fn(),
  }
}));

vi.mock('../../../services/evaluationService', () => ({
  evaluationService: {
    getEvaluationsByJob: vi.fn(),
  }
}));

const mockShortlistService = vi.mocked(shortlistService);
const mockEvaluationService = vi.mocked(evaluationService);

describe('CreateShortlistForm', () => {
  const mockProps = {
    jobId: 'test-job-id',
    onSuccess: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with automatic selection by default', () => {
    render(<CreateShortlistForm {...mockProps} />);
    
    expect(screen.getByText('Create New Shortlist')).toBeInTheDocument();
    expect(screen.getByLabelText('Automatic Selection')).toBeChecked();
    expect(screen.getByLabelText('Number of Top Candidates')).toBeInTheDocument();
    expect(screen.getByLabelText('Minimum Score (%)')).toBeInTheDocument();
  });

  it('switches to manual selection mode', async () => {
    const mockCandidates = [
      {
        id: '1',
        candidate: { id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        overallScore: 85
      }
    ];

    mockEvaluationService.getEvaluationsByJob.mockResolvedValue(mockCandidates as any);

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByLabelText('Manual Selection'));
    
    await waitFor(() => {
      expect(mockEvaluationService.getEvaluationsByJob).toHaveBeenCalledWith('test-job-id');
    });

    expect(screen.getByText('Select Candidates')).toBeInTheDocument();
  });

  it('submits automatic selection form', async () => {
    const mockShortlist = {
      id: 'shortlist-1',
      jobPostingId: 'test-job-id',
      status: 'draft' as const,
      candidateCount: 5,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      selectionCriteria: {}
    };

    mockShortlistService.createShortlist.mockResolvedValue(mockShortlist);

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.change(screen.getByLabelText('Number of Top Candidates'), {
      target: { value: '10' }
    });
    
    fireEvent.change(screen.getByLabelText('Minimum Score (%)'), {
      target: { value: '80' }
    });

    fireEvent.click(screen.getByText('Create Shortlist'));

    await waitFor(() => {
      expect(mockShortlistService.createShortlist).toHaveBeenCalledWith({
        jobPostingId: 'test-job-id',
        selectionCriteria: {
          topCandidateCount: 10,
          minimumScore: 80,
          manualSelection: false
        }
      });
    });

    expect(mockProps.onSuccess).toHaveBeenCalledWith(mockShortlist);
  });

  it('submits manual selection form', async () => {
    const mockCandidates = [
      {
        id: '1',
        candidate: { id: 'candidate-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        overallScore: 85
      }
    ];

    const mockShortlist = {
      id: 'shortlist-1',
      jobPostingId: 'test-job-id',
      status: 'draft' as const,
      candidateCount: 1,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      selectionCriteria: {}
    };

    mockEvaluationService.getEvaluationsByJob.mockResolvedValue(mockCandidates as any);
    mockShortlistService.createShortlist.mockResolvedValue(mockShortlist);

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByLabelText('Manual Selection'));
    
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox', { name: /John Doe/ }));
    fireEvent.click(screen.getByText('Create Shortlist'));

    await waitFor(() => {
      expect(mockShortlistService.createShortlist).toHaveBeenCalledWith({
        jobPostingId: 'test-job-id',
        selectionCriteria: {
          manualSelection: true
        },
        manualCandidateIds: ['candidate-1']
      });
    });

    expect(mockProps.onSuccess).toHaveBeenCalledWith(mockShortlist);
  });

  it('handles form submission error', async () => {
    mockShortlistService.createShortlist.mockRejectedValue(new Error('Creation failed'));

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Create Shortlist'));

    await waitFor(() => {
      expect(screen.getByText('Creation failed')).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close button is clicked', () => {
    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByText('×'));
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('disables submit button when no candidates selected in manual mode', async () => {
    mockEvaluationService.getEvaluationsByJob.mockResolvedValue([]);

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.click(screen.getByLabelText('Manual Selection'));
    
    await waitFor(() => {
      expect(screen.getByText('No candidates available for selection')).toBeInTheDocument();
    });

    expect(screen.getByText('Create Shortlist')).toBeDisabled();
  });

  it('processes required skills correctly', async () => {
    const mockShortlist = {
      id: 'shortlist-1',
      jobPostingId: 'test-job-id',
      status: 'draft' as const,
      candidateCount: 5,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1',
      selectionCriteria: {}
    };

    mockShortlistService.createShortlist.mockResolvedValue(mockShortlist);

    render(<CreateShortlistForm {...mockProps} />);
    
    fireEvent.change(screen.getByLabelText('Required Skills (comma-separated, optional)'), {
      target: { value: 'JavaScript, React, Node.js' }
    });

    fireEvent.click(screen.getByText('Create Shortlist'));

    await waitFor(() => {
      expect(mockShortlistService.createShortlist).toHaveBeenCalledWith({
        jobPostingId: 'test-job-id',
        selectionCriteria: {
          topCandidateCount: 5,
          minimumScore: 70,
          manualSelection: false,
          requiredSkills: ['JavaScript', 'React', 'Node.js']
        }
      });
    });
  });
});