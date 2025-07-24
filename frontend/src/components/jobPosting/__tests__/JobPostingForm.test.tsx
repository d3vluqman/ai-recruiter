import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobPostingForm } from '../JobPostingForm';
import { JobPosting } from '../../../types/jobPosting';

describe('JobPostingForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false,
  };

  it('renders create form correctly', () => {
    render(<JobPostingForm {...defaultProps} />);

    expect(screen.getByText('Create New Job Posting')).toBeInTheDocument();
    expect(screen.getByLabelText(/job title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/department/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByText('Requirements')).toBeInTheDocument();
    expect(screen.getByText('Job Description File (Optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create job posting/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('renders edit form with initial data', () => {
    const initialData: JobPosting = {
      id: 'job-1',
      title: 'Software Engineer',
      description: 'A great job opportunity',
      requirements: ['JavaScript', 'React'],
      department: 'Engineering',
      location: 'San Francisco',
      status: 'active',
      createdBy: 'user-1',
      organizationId: 'org-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(<JobPostingForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByText('Edit Job Posting')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A great job opportunity')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument();
    expect(screen.getByDisplayValue('San Francisco')).toBeInTheDocument();
    expect(screen.getByDisplayValue('JavaScript')).toBeInTheDocument();
    expect(screen.getByDisplayValue('React')).toBeInTheDocument();
    const statusSelect = screen.getByLabelText(/status/i);
    expect(statusSelect).toHaveValue('active');
    expect(screen.getByRole('button', { name: /update job posting/i })).toBeInTheDocument();
  });

  it('handles form input changes', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    const titleInput = screen.getByLabelText(/job title/i);
    const descriptionInput = screen.getByLabelText(/job description/i);
    const departmentInput = screen.getByLabelText(/department/i);
    const locationInput = screen.getByLabelText(/location/i);

    await user.type(titleInput, 'Senior Developer');
    await user.type(descriptionInput, 'Looking for a senior developer');
    await user.type(departmentInput, 'Tech');
    await user.type(locationInput, 'Remote');

    expect(titleInput).toHaveValue('Senior Developer');
    expect(descriptionInput).toHaveValue('Looking for a senior developer');
    expect(departmentInput).toHaveValue('Tech');
    expect(locationInput).toHaveValue('Remote');
  });

  it('handles requirements management', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    // Initial requirement input should be present
    const initialRequirement = screen.getByPlaceholderText('Enter a requirement...');
    await user.type(initialRequirement, 'JavaScript experience');

    // Add another requirement
    const addButton = screen.getByText('+ Add Requirement');
    await user.click(addButton);

    const requirementInputs = screen.getAllByPlaceholderText('Enter a requirement...');
    expect(requirementInputs).toHaveLength(2);

    await user.type(requirementInputs[1], 'React knowledge');

    // Remove buttons should be available for both requirements since we have 2
    const removeButtons = screen.getAllByText('×');
    expect(removeButtons).toHaveLength(2); // Both requirements should have remove buttons

    await user.click(removeButtons[0]);
    
    // Should still have one requirement input
    const remainingInputs = screen.getAllByPlaceholderText('Enter a requirement...');
    expect(remainingInputs).toHaveLength(1);
  });

  it('validates required fields on submit', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: /create job posting/i });
    await user.click(submitButton);

    // Should not call onSubmit with empty required fields
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(<JobPostingForm {...defaultProps} />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/job description/i), 'Great opportunity');
    await user.type(screen.getByLabelText(/department/i), 'Engineering');
    await user.type(screen.getByLabelText(/location/i), 'San Francisco');

    // Fill in a requirement
    const requirementInput = screen.getByPlaceholderText('Enter a requirement...');
    await user.type(requirementInput, 'JavaScript');

    const submitButton = screen.getByRole('button', { name: /create job posting/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'Software Engineer',
        description: 'Great opportunity',
        department: 'Engineering',
        location: 'San Francisco',
        requirements: ['JavaScript'],
        status: 'draft',
        jobDescriptionFile: undefined,
      });
    });
  });

  it('handles file selection', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    const file = new File(['job description content'], 'job-description.pdf', {
      type: 'application/pdf',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(screen.getByText('job-description.pdf')).toBeInTheDocument();
    expect(screen.getByText(/0.00 MB/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('handles file removal', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    expect(screen.getByText('test.pdf')).toBeInTheDocument();

    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);

    expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('Click to upload')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<JobPostingForm {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables form when loading', () => {
    render(<JobPostingForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button', { name: /saving.../i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('handles form submission errors', async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    mockOnSubmit.mockRejectedValue(new Error('Submission failed'));

    render(<JobPostingForm {...defaultProps} />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/job title/i), 'Software Engineer');
    await user.type(screen.getByLabelText(/job description/i), 'Great opportunity');

    const submitButton = screen.getByRole('button', { name: /create job posting/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error submitting job posting:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('Failed to save job posting. Please try again.');
    });

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });
});