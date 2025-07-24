import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApplicantPortal } from '../ApplicantPortal';
import { jobPostingService } from '../../../services/jobPostingService';
import { resumeService } from '../../../services/resumeService';

// Mock services
vi.mock('../../../services/jobPostingService');
vi.mock('../../../services/resumeService');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ jobId: 'job-1' }),
  };
});

const mockJobPostingService = vi.mocked(jobPostingService);
const mockResumeService = vi.mocked(resumeService);

const mockJobPosting = {
  id: 'job-1',
  title: 'Software Engineer',
  description: 'We are looking for a talented software engineer...',
  department: 'Engineering',
  location: 'San Francisco, CA',
  requirements: ['JavaScript', 'React', 'Node.js'],
  status: 'active',
  createdBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ApplicantPortal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockJobPostingService.getJobPostingById.mockResolvedValue(mockJobPosting);
  });

  it('should render job posting details', async () => {
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Engineering')).toBeInTheDocument();
      expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
      expect(screen.getByText('We are looking for a talented software engineer...')).toBeInTheDocument();
    });
  });

  it('should render application form', async () => {
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
      expect(screen.getByLabelText(/First Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Last Name/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Resume/)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Resume file is required')).toBeInTheDocument();
    });
  });

  it('should validate email format', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/)).toBeInTheDocument();
    });

    const emailInput = screen.getByLabelText(/Email Address/);
    await user.type(emailInput, 'invalid-email');

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('should validate file type', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Resume/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Resume/);
    const invalidFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });

    await user.upload(fileInput, invalidFile);

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please upload a PDF, DOC, DOCX, or TXT file')).toBeInTheDocument();
    });
  });

  it('should validate file size', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Resume/)).toBeInTheDocument();
    });

    const fileInput = screen.getByLabelText(/Resume/);
    // Create a file larger than 10MB
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

    await user.upload(fileInput, largeFile);

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
    });
  });

  it('should submit application successfully', async () => {
    const user = userEvent.setup();
    mockResumeService.uploadResume.mockResolvedValue({
      message: 'Resume uploaded successfully',
      data: {
        resumeId: 'resume-1',
        candidateId: 'candidate-1',
        fileName: 'resume.pdf',
        status: 'pending',
      },
    });

    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
    });

    // Fill out form
    await user.type(screen.getByLabelText(/First Name/), 'John');
    await user.type(screen.getByLabelText(/Last Name/), 'Doe');
    await user.type(screen.getByLabelText(/Email Address/), 'john.doe@example.com');
    await user.type(screen.getByLabelText(/Phone Number/), '555-1234');

    const fileInput = screen.getByLabelText(/Resume/);
    const validFile = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, validFile);

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockResumeService.uploadResume).toHaveBeenCalledWith({
        jobPostingId: 'job-1',
        candidateFirstName: 'John',
        candidateLastName: 'Doe',
        candidateEmail: 'john.doe@example.com',
        candidatePhone: '555-1234',
        source: 'portal',
        resume: validFile,
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Application Submitted Successfully!')).toBeInTheDocument();
      expect(screen.getByText(/Thank you for your interest in the Software Engineer position/)).toBeInTheDocument();
    });
  });

  it('should handle submission errors', async () => {
    const user = userEvent.setup();
    mockResumeService.uploadResume.mockRejectedValue(new Error('Upload failed'));

    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
    });

    // Fill out form
    await user.type(screen.getByLabelText(/First Name/), 'John');
    await user.type(screen.getByLabelText(/Last Name/), 'Doe');
    await user.type(screen.getByLabelText(/Email Address/), 'john.doe@example.com');

    const fileInput = screen.getByLabelText(/Resume/);
    const validFile = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, validFile);

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('should show loading state during submission', async () => {
    const user = userEvent.setup();
    let resolveUpload: (value: any) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });
    mockResumeService.uploadResume.mockReturnValue(uploadPromise);

    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
    });

    // Fill out form
    await user.type(screen.getByLabelText(/First Name/), 'John');
    await user.type(screen.getByLabelText(/Last Name/), 'Doe');
    await user.type(screen.getByLabelText(/Email Address/), 'john.doe@example.com');

    const fileInput = screen.getByLabelText(/Resume/);
    const validFile = new File(['resume content'], 'resume.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, validFile);

    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    // Check loading state
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the upload
    resolveUpload!({
      message: 'Resume uploaded successfully',
      data: {
        resumeId: 'resume-1',
        candidateId: 'candidate-1',
        fileName: 'resume.pdf',
        status: 'pending',
      },
    });

    await waitFor(() => {
      expect(screen.getByText('Application Submitted Successfully!')).toBeInTheDocument();
    });
  });

  it('should handle job posting not found', async () => {
    mockJobPostingService.getJobPostingById.mockRejectedValue(new Error('Job not found'));

    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Job posting not found or no longer available.')).toBeInTheDocument();
    });
  });

  it('should clear errors when user starts typing', async () => {
    const user = userEvent.setup();
    renderWithRouter(<ApplicantPortal />);

    await waitFor(() => {
      expect(screen.getByText('Apply for this Position')).toBeInTheDocument();
    });

    // Trigger validation error
    const submitButton = screen.getByText('Submit Application');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
    });

    // Start typing to clear error
    const firstNameInput = screen.getByLabelText(/First Name/);
    await user.type(firstNameInput, 'J');

    await waitFor(() => {
      expect(screen.queryByText('First name is required')).not.toBeInTheDocument();
    });
  });
});