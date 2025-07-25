import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { CandidateCard } from '../CandidateCard';
import type { CandidateWithEvaluation } from '../../../types/evaluation';

const mockCandidate: CandidateWithEvaluation = {
  id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  resume: {
    id: 'resume-1',
    fileName: 'john_doe_resume.pdf',
    uploadedAt: new Date('2024-01-15'),
    source: 'portal',
  },
  evaluation: {
    id: 'eval-1',
    resumeId: 'resume-1',
    jobPostingId: 'job-1',
    overallScore: 85,
    skillScore: 80,
    experienceScore: 90,
    educationScore: 85,
    evaluationDetails: {
      skillMatches: [],
      experienceMatch: {
        totalYears: 5,
        relevantYears: 3,
        experienceScore: 90,
        relevantPositions: ['Software Engineer'],
      },
      educationMatch: {
        degreeMatch: true,
        fieldMatch: true,
        educationScore: 85,
        matchedDegrees: ['Bachelor of Computer Science'],
      },
      gapAnalysis: [],
      recommendations: [],
    },
    status: 'completed',
    evaluatedAt: new Date('2024-01-16'),
  },
};

const mockCandidateWithoutEvaluation: CandidateWithEvaluation = {
  ...mockCandidate,
  evaluation: undefined,
};

describe('CandidateCard', () => {
  const mockProps = {
    isExpanded: false,
    onExpand: vi.fn(),
    onClick: vi.fn(),
    onTriggerEvaluation: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders candidate information correctly', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('john_doe_resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('Applicant Portal')).toBeInTheDocument();
  });

  it('displays evaluation scores when evaluation exists', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    expect(screen.getByText('Overall')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Education')).toBeInTheDocument();
  });

  it('shows "Not evaluated" when no evaluation exists', () => {
    render(<CandidateCard candidate={mockCandidateWithoutEvaluation} {...mockProps} />);
    
    expect(screen.getByText('Not evaluated')).toBeInTheDocument();
    expect(screen.getByText('Evaluate')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    const cardHeader = document.querySelector('.candidate-card-header');
    fireEvent.click(cardHeader!);
    
    expect(mockProps.onClick).toHaveBeenCalledTimes(1);
  });

  it('calls onExpand when expand button is clicked', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    const expandButton = screen.getByTitle('Expand details');
    fireEvent.click(expandButton);
    
    expect(mockProps.onExpand).toHaveBeenCalledTimes(1);
  });

  it('calls onTriggerEvaluation when evaluate button is clicked', () => {
    render(<CandidateCard candidate={mockCandidateWithoutEvaluation} {...mockProps} />);
    
    const evaluateButton = screen.getByText('Evaluate');
    fireEvent.click(evaluateButton);
    
    expect(mockProps.onTriggerEvaluation).toHaveBeenCalledTimes(1);
  });

  it('shows evaluation details when expanded and evaluation exists', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} isExpanded={true} />);
    
    expect(document.querySelector('.candidate-card-details')).toBeInTheDocument();
  });

  it('shows no evaluation message when expanded but no evaluation', () => {
    render(<CandidateCard candidate={mockCandidateWithoutEvaluation} {...mockProps} isExpanded={true} />);
    
    expect(screen.getByText('This candidate has not been evaluated yet.')).toBeInTheDocument();
    expect(screen.getByText('Start Evaluation')).toBeInTheDocument();
  });

  it('applies expanded class when isExpanded is true', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} isExpanded={true} />);
    
    expect(document.querySelector('.candidate-card.expanded')).toBeInTheDocument();
  });

  it('formats upload date correctly', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    expect(screen.getByText('Uploaded Jan 15, 2024')).toBeInTheDocument();
  });

  it('shows correct source label for direct upload', () => {
    const directCandidate = {
      ...mockCandidate,
      resume: { ...mockCandidate.resume, source: 'direct' as const },
    };
    
    render(<CandidateCard candidate={directCandidate} {...mockProps} />);
    
    expect(screen.getByText('Direct Upload')).toBeInTheDocument();
  });

  it('does not call onClick when clicking on action buttons', () => {
    render(<CandidateCard candidate={mockCandidate} {...mockProps} />);
    
    const expandButton = screen.getByTitle('Expand details');
    fireEvent.click(expandButton);
    
    expect(mockProps.onClick).not.toHaveBeenCalled();
    expect(mockProps.onExpand).toHaveBeenCalledTimes(1);
  });
});