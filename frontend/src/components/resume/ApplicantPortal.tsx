import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { resumeService } from '../../services/resumeService';
import { jobPostingService } from '../../services/jobPostingService';
import type { JobPosting } from '../../types/jobPosting';
import { ErrorHandler, NotificationService } from '../../utils/errorHandler';
import { FILE_UPLOAD, ERROR_MESSAGES } from '../../config/constants';
import '../../styles/resume.css';

interface FormData {
  candidateFirstName: string;
  candidateLastName: string;
  candidateEmail: string;
  candidatePhone: string;
  resume: File | null;
}

interface FormErrors {
  candidateFirstName?: string;
  candidateLastName?: string;
  candidateEmail?: string;
  resume?: string;
}

export const ApplicantPortal: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [jobPosting, setJobPosting] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<FormData>({
    candidateFirstName: '',
    candidateLastName: '',
    candidateEmail: '',
    candidatePhone: '',
    resume: null,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobPosting = async () => {
      if (!jobId) return;
      
      try {
        const job = await jobPostingService.getJobPostingById(jobId);
        setJobPosting(job);
      } catch (error) {
        ErrorHandler.logError(error, 'Fetch job posting for application');
        setSubmitError('Job posting not found or no longer available.');
      } finally {
        setLoading(false);
      }
    };

    fetchJobPosting();
  }, [jobId]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.candidateFirstName.trim()) {
      newErrors.candidateFirstName = 'First name is required';
    }

    if (!formData.candidateLastName.trim()) {
      newErrors.candidateLastName = 'Last name is required';
    }

    if (!formData.candidateEmail.trim()) {
      newErrors.candidateEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.candidateEmail)) {
      newErrors.candidateEmail = 'Please enter a valid email address';
    }

    if (!formData.resume) {
      newErrors.resume = 'Resume file is required';
    } else {
      if (!FILE_UPLOAD.ALLOWED_TYPES.includes(formData.resume.type)) {
        newErrors.resume = ERROR_MESSAGES.INVALID_FILE_TYPE;
      } else if (formData.resume.size > FILE_UPLOAD.MAX_SIZE_BYTES) {
        newErrors.resume = ERROR_MESSAGES.FILE_TOO_LARGE;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      resume: file,
    }));
    
    // Clear error when user selects a file
    if (errors.resume) {
      setErrors(prev => ({
        ...prev,
        resume: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !jobId || !formData.resume) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await resumeService.uploadResume({
        jobPostingId: jobId,
        candidateFirstName: formData.candidateFirstName,
        candidateLastName: formData.candidateLastName,
        candidateEmail: formData.candidateEmail,
        candidatePhone: formData.candidatePhone || undefined,
        source: 'portal',
        resume: formData.resume,
      });

      setSubmitSuccess(true);
      setFormData({
        candidateFirstName: '',
        candidateLastName: '',
        candidateEmail: '',
        candidatePhone: '',
        resume: null,
      });
      
      // Reset file input
      const fileInput = document.getElementById('resume') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="applicant-portal">
        <div className="loading">Loading job details...</div>
      </div>
    );
  }

  if (!jobPosting) {
    return (
      <div className="applicant-portal">
        <div className="error-message">
          Job posting not found or no longer available.
        </div>
      </div>
    );
  }

  if (submitSuccess) {
    return (
      <div className="applicant-portal">
        <div className="success-message">
          <h2>Application Submitted Successfully!</h2>
          <p>Thank you for your interest in the <strong>{jobPosting.title}</strong> position.</p>
          <p>We have received your resume and will review it shortly. You will be contacted if your qualifications match our requirements.</p>
          <button 
            onClick={() => setSubmitSuccess(false)}
            className="btn btn-primary"
          >
            Submit Another Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="applicant-portal">
      <div className="job-header">
        <h1>{jobPosting.title}</h1>
        <div className="job-details">
          {jobPosting.department && <span className="department">{jobPosting.department}</span>}
          {jobPosting.location && <span className="location">{jobPosting.location}</span>}
        </div>
        <div className="job-description">
          <p>{jobPosting.description}</p>
        </div>
      </div>

      <div className="application-form">
        <h2>Apply for this Position</h2>
        
        {submitError && (
          <div className="error-message">
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="candidateFirstName">
                First Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="candidateFirstName"
                name="candidateFirstName"
                value={formData.candidateFirstName}
                onChange={handleInputChange}
                className={errors.candidateFirstName ? 'error' : ''}
                disabled={isSubmitting}
              />
              {errors.candidateFirstName && (
                <span className="error-text">{errors.candidateFirstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="candidateLastName">
                Last Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="candidateLastName"
                name="candidateLastName"
                value={formData.candidateLastName}
                onChange={handleInputChange}
                className={errors.candidateLastName ? 'error' : ''}
                disabled={isSubmitting}
              />
              {errors.candidateLastName && (
                <span className="error-text">{errors.candidateLastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="candidateEmail">
              Email Address <span className="required">*</span>
            </label>
            <input
              type="email"
              id="candidateEmail"
              name="candidateEmail"
              value={formData.candidateEmail}
              onChange={handleInputChange}
              className={errors.candidateEmail ? 'error' : ''}
              disabled={isSubmitting}
            />
            {errors.candidateEmail && (
              <span className="error-text">{errors.candidateEmail}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="candidatePhone">Phone Number</label>
            <input
              type="tel"
              id="candidatePhone"
              name="candidatePhone"
              value={formData.candidatePhone}
              onChange={handleInputChange}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="resume">
              Resume <span className="required">*</span>
            </label>
            <input
              type="file"
              id="resume"
              name="resume"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt"
              className={errors.resume ? 'error' : ''}
              disabled={isSubmitting}
            />
            <div className="file-help">
              Accepted formats: {FILE_UPLOAD.ALLOWED_EXTENSIONS.join(', ')} (Max size: {FILE_UPLOAD.MAX_SIZE_DISPLAY})
            </div>
            {errors.resume && (
              <span className="error-text">{errors.resume}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
};