import React, { useState, useEffect } from 'react';
import { JobPostingForm } from '../components/jobPosting/JobPostingForm';
import { JobPostingList } from '../components/jobPosting/JobPostingList';
import { jobPostingService } from '../services/jobPostingService';
import type { JobPosting, CreateJobPostingData, UpdateJobPostingData } from '../types/jobPosting';
import { ErrorHandler, NotificationService } from '../utils/errorHandler';
import '../styles/jobPosting.css';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export const JobPostingsPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobPostings();
  }, []);

  const loadJobPostings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const jobs = await jobPostingService.getMyJobPostings();
      setJobPostings(jobs);
    } catch (err) {
      const appError = ErrorHandler.handleApiError(err, 'Load job postings');
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async (data: CreateJobPostingData | UpdateJobPostingData) => {
    try {
      setIsLoading(true);
      const newJob = await jobPostingService.createJobPosting(data as CreateJobPostingData);
      setJobPostings(prev => [newJob, ...prev]);
      setViewMode('list');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job posting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateJob = async (data: CreateJobPostingData | UpdateJobPostingData) => {
    if (!selectedJob) return;

    try {
      setIsLoading(true);
      const updatedJob = await jobPostingService.updateJobPosting(selectedJob.id, data as UpdateJobPostingData);
      setJobPostings(prev =>
        prev.map(job => (job.id === selectedJob.id ? updatedJob : job))
      );
      setViewMode('list');
      setSelectedJob(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update job posting');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      setIsLoading(true);
      await jobPostingService.deleteJobPosting(id);
      setJobPostings(prev => prev.filter(job => job.id !== id));
      setError(null);
    } catch (err) {
      const appError = ErrorHandler.handleApiError(err, 'Delete job posting');
      setError(appError.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditJob = (job: JobPosting) => {
    setSelectedJob(job);
    setViewMode('edit');
  };

  const handleViewJob = (job: JobPosting) => {
    setSelectedJob(job);
    setViewMode('view');
  };

  const handleCancel = () => {
    setViewMode('list');
    setSelectedJob(null);
    setError(null);
  };

  const renderJobDetails = () => {
    if (!selectedJob) return null;

    return (
      <div className="job-details">
        <div className="job-details-header">
          <button onClick={handleCancel} className="btn-back">
            ← Back to List
          </button>
          <div className="job-details-actions">
            <button
              onClick={() => handleEditJob(selectedJob)}
              className="btn btn-secondary"
            >
              Edit Job
            </button>
            <button
              onClick={() => handleDeleteJob(selectedJob.id)}
              className="btn btn-danger"
            >
              Delete Job
            </button>
          </div>
        </div>

        <div className="job-details-content">
          <div className="job-header">
            <h1>{selectedJob.title}</h1>
            <span className={`status-badge status-${selectedJob.status}`}>
              {selectedJob.status}
            </span>
          </div>

          <div className="job-meta-details">
            {selectedJob.department && (
              <div className="meta-item">
                <strong>Department:</strong> {selectedJob.department}
              </div>
            )}
            {selectedJob.location && (
              <div className="meta-item">
                <strong>Location:</strong> {selectedJob.location}
              </div>
            )}
            <div className="meta-item">
              <strong>Created:</strong> {new Date(selectedJob.createdAt).toLocaleDateString()}
            </div>
            <div className="meta-item">
              <strong>Updated:</strong> {new Date(selectedJob.updatedAt).toLocaleDateString()}
            </div>
          </div>

          <div className="job-section">
            <h3>Description</h3>
            <div className="job-description-full">
              {selectedJob.description.split('\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          {selectedJob.requirements.length > 0 && (
            <div className="job-section">
              <h3>Requirements ({selectedJob.requirements.length})</h3>
              <ul className="requirements-full">
                {selectedJob.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedJob.parsedRequirements?.skills && selectedJob.parsedRequirements.skills.length > 0 && (
            <div className="job-section">
              <h3>Skills ({selectedJob.parsedRequirements.skills.length})</h3>
              <div className="skills-full">
                {selectedJob.parsedRequirements.skills.map((skill, index) => (
                  <span key={index} className="skill-tag-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedJob.parsedRequirements?.qualifications && selectedJob.parsedRequirements.qualifications.length > 0 && (
            <div className="job-section">
              <h3>Qualifications</h3>
              <ul className="qualifications-full">
                {selectedJob.parsedRequirements.qualifications.map((qual, index) => (
                  <li key={index}>{qual}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedJob.parsedRequirements?.responsibilities && selectedJob.parsedRequirements.responsibilities.length > 0 && (
            <div className="job-section">
              <h3>Responsibilities</h3>
              <ul className="responsibilities-full">
                {selectedJob.parsedRequirements.responsibilities.map((resp, index) => (
                  <li key={index}>{resp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="job-postings-page">
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn-close-error">
            ×
          </button>
        </div>
      )}

      {viewMode === 'list' && (
        <>
          <div className="page-header">
            <h1>Job Postings</h1>
            <button
              onClick={() => setViewMode('create')}
              className="btn btn-primary"
            >
              + Create Job Posting
            </button>
          </div>
          <JobPostingList
            jobPostings={jobPostings}
            onEdit={handleEditJob}
            onDelete={handleDeleteJob}
            onView={handleViewJob}
            isLoading={isLoading}
          />
        </>
      )}

      {viewMode === 'create' && (
        <JobPostingForm
          onSubmit={handleCreateJob}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'edit' && selectedJob && (
        <JobPostingForm
          initialData={selectedJob}
          onSubmit={handleUpdateJob}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}

      {viewMode === 'view' && renderJobDetails()}
    </div>
  );
};