import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResumeManagement } from '../ResumeManagement';
import { resumeService } from '../../../services/resumeService';
import { useAuth } from '../../../contexts/AuthContext';

// Mock services and hooks
vi.mock('../../../services/resumeService');
vi.mock('../../../contexts/AuthContext');

const mockResumeService = vi.mocked(resumeService);
const mockUseAuth = vi.mocked(useAuth);

const mockResumes = [
  {
    id: 'resume-1',
    candidateId: 'candidate-1',
    jobPostingId: 'job-1',
    fileName: 'john_doe_resume.pdf',
    fileSize: 1024000,
    source: 'portal' as const,
    filePath: '/uploads/resume1.pdf',
    status: 'pending',
    uploadedAt: new Date('2024-01-15T10:00:00Z'),
    candidate: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-1234',
    },
  },
  {
    id: 'resume-2',
    candidateId: 'candidate-2',
    jobPostingId: 'job-1',
    fileName: 'jane_smith_resume.docx',
    fileSize: 2048000,
    source: 'direct' as const,
    filePath: '/uploads/resume2.docx',
    status: 'processed',
    uploadedAt: new Date('2024-01-16T14:30:00Z'),
    candidate: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
    },
  },
];

describe('ResumeManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'recruiter@example.com' },
      token: 'mock-token',
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    });
  });

  it('should render all resumes when no jobPostingId provided', async () => {
    mockResumeService.getAllResumes.mockResolvedValue(mockResumes);

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('All Resumes')).toBeInTheDocument();
      expect(screen.getByText('2 resumes')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    expect(mockResumeService.getAllResumes).toHaveBeenCalledWith('mock-token');
  });

  it('should render job-specific resumes when jobPostingId provided', async () => {
    mockResumeService.getResumesByJobPosting.mockResolvedValue([mockResumes[0]]);

    render(<ResumeManagement jobPostingId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText('Job Applications')).toBeInTheDocument();
      expect(screen.getByText('1 resume')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(mockResumeService.getResumesByJobPosting).toHaveBeenCalledWith('job-1', 'mock-token');
  });

  it('should display resume information correctly', async () => {
    mockResumeService.getAllResumes.mockResolvedValue(mockResumes);

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Check candidate info
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-1234')).toBeInTheDocument();

    // Check file info
    expect(screen.getByText('john_doe_resume.pdf (1000 KB)')).toBeInTheDocument();
    expect(screen.getByText('jane_smith_resume.docx (2000 KB)')).toBeInTheDocument();

    // Check status
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('processed')).toBeInTheDocument();

    // Check source
    expect(screen.getByText('Source: Applicant Portal')).toBeInTheDocument();
    expect(screen.getByText('Source: Direct Upload')).toBeInTheDocument();

    // Check upload dates
    expect(screen.getByText(/Uploaded Jan 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Uploaded Jan 16, 2024/)).toBeInTheDocument();
  });

  it('should handle download resume', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue([mockResumes[0]]);
    mockResumeService.downloadResume.mockResolvedValue(new Blob(['fake pdf content']));

    // Mock URL.createObjectURL and related functions
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement and appendChild/removeChild
    const mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    };
    const mockCreateElement = vi.fn(() => mockAnchor);
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    Object.defineProperty(document, 'createElement', { value: mockCreateElement });
    Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
    Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download');
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockResumeService.downloadResume).toHaveBeenCalledWith('resume-1', 'mock-token');
    });

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('john_doe_resume.pdf');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should handle delete resume', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue(mockResumes);
    mockResumeService.deleteResume.mockResolvedValue();

    // Mock window.confirm
    const mockConfirm = vi.fn(() => true);
    global.confirm = mockConfirm;

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this resume?');

    await waitFor(() => {
      expect(mockResumeService.deleteResume).toHaveBeenCalledWith('resume-1', 'mock-token');
    });

    // Resume should be removed from the list
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('should not delete resume if user cancels confirmation', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue(mockResumes);

    // Mock window.confirm to return false
    const mockConfirm = vi.fn(() => false);
    global.confirm = mockConfirm;

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    expect(mockConfirm).toHaveBeenCalled();
    expect(mockResumeService.deleteResume).not.toHaveBeenCalled();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle status update for pending resumes', async () => {
    const user = userEvent.setup();
    const pendingResume = { ...mockResumes[0], status: 'pending' };
    mockResumeService.getAllResumes.mockResolvedValue([pendingResume]);
    mockResumeService.updateResumeStatus.mockResolvedValue({
      ...pendingResume,
      status: 'processing',
    });

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const startProcessingButton = screen.getByText('Start Processing');
    await user.click(startProcessingButton);

    await waitFor(() => {
      expect(mockResumeService.updateResumeStatus).toHaveBeenCalledWith('resume-1', 'processing', 'mock-token');
    });
  });

  it('should show loading state', () => {
    mockResumeService.getAllResumes.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ResumeManagement />);

    expect(screen.getByText('Loading resumes...')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    mockResumeService.getAllResumes.mockRejectedValue(new Error('Failed to fetch resumes'));

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch resumes')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should retry fetching resumes on error', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes
      .mockRejectedValueOnce(new Error('Failed to fetch resumes'))
      .mockResolvedValueOnce(mockResumes);

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch resumes')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    expect(mockResumeService.getAllResumes).toHaveBeenCalledTimes(2);
  });

  it('should show empty state when no resumes', async () => {
    mockResumeService.getAllResumes.mockResolvedValue([]);

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('No resumes found')).toBeInTheDocument();
      expect(screen.getByText('No resumes have been uploaded to the system yet.')).toBeInTheDocument();
    });
  });

  it('should show job-specific empty state', async () => {
    mockResumeService.getResumesByJobPosting.mockResolvedValue([]);

    render(<ResumeManagement jobPostingId="job-1" />);

    await waitFor(() => {
      expect(screen.getByText('No resumes found')).toBeInTheDocument();
      expect(screen.getByText('No applications have been submitted for this job posting yet.')).toBeInTheDocument();
    });
  });

  it('should handle download errors', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue([mockResumes[0]]);
    mockResumeService.downloadResume.mockRejectedValue(new Error('Download failed'));

    // Mock window.alert
    const mockAlert = vi.fn();
    global.alert = mockAlert;

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const downloadButton = screen.getByText('Download');
    await user.click(downloadButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Download failed');
    });
  });

  it('should handle delete errors', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue(mockResumes);
    mockResumeService.deleteResume.mockRejectedValue(new Error('Delete failed'));

    // Mock window.confirm and alert
    const mockConfirm = vi.fn(() => true);
    const mockAlert = vi.fn();
    global.confirm = mockConfirm;
    global.alert = mockAlert;

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('Delete failed');
    });

    // Resume should still be in the list
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show deleting state', async () => {
    const user = userEvent.setup();
    mockResumeService.getAllResumes.mockResolvedValue([mockResumes[0]]);
    
    let resolveDelete: () => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    mockResumeService.deleteResume.mockReturnValue(deletePromise);

    // Mock window.confirm
    const mockConfirm = vi.fn(() => true);
    global.confirm = mockConfirm;

    render(<ResumeManagement />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('Delete');
    await user.click(deleteButton);

    // Check deleting state
    expect(screen.getByText('Deleting...')).toBeInTheDocument();
    expect(screen.getByText('Deleting...')).toBeDisabled();

    // Resolve the delete
    resolveDelete!();

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });
});