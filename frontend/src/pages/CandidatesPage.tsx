import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CandidateList } from '../components/evaluation/CandidateList';
import { jobPostingService } from '../services/jobPostingService';
import { useAuth } from '../contexts/AuthContext';
import type { JobPosting } from '../types/jobPosting';
import type { CandidateWithEvaluation } from '../types/evaluation';

export const CandidatesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [, setSelectedCandidate] = useState<CandidateWithEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobPostings();
  }, [token]);

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    if (jobId && jobPostings.some(job => job.id === jobId)) {
      setSelectedJobId(jobId);
    } else if (jobPostings.length > 0 && !selectedJobId) {
      setSelectedJobId(jobPostings[0].id);
    }
  }, [searchParams, jobPostings]);

  const fetchJobPostings = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      const data = await jobPostingService.getJobPostings();
      setJobPostings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job postings');
    } finally {
      setLoading(false);
    }
  };

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    setSelectedCandidate(null);
    setSearchParams({ jobId });
  };

  const handleCandidateSelect = (candidate: CandidateWithEvaluation) => {
    setSelectedCandidate(candidate);
  };

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Please log in to view candidates.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchJobPostings} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (jobPostings.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Job Postings</h2>
        <p>Create a job posting first to start evaluating candidates.</p>
      </div>
    );
  }

  const selectedJob = jobPostings.find(job => job.id === selectedJobId);

  return (
    <div className="candidates-page">
      <div className="candidates-header">
        <div className="header-content">
          <h1 style={{ margin: 0, color: '#0073b1' }}>Candidate Evaluation</h1>
          <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
            Review and evaluate candidates for your job postings.
          </p>
        </div>
        
        <div className="job-selector">
          <label htmlFor="job-select" style={{ 
            display: 'block', 
            marginBottom: '0.5rem', 
            fontWeight: 500,
            color: '#495057'
          }}>
            Select Job Posting:
          </label>
          <select
            id="job-select"
            value={selectedJobId}
            onChange={(e) => handleJobChange(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '0.9rem',
              background: 'white',
              minWidth: '250px'
            }}
          >
            {jobPostings.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} - {job.department || 'No Department'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedJob && (
        <div className="job-info-banner">
          <div className="job-details">
            <h3 style={{ margin: 0, color: '#333' }}>{selectedJob.title}</h3>
            <div style={{ 
              display: 'flex', 
              gap: '1rem', 
              marginTop: '0.25rem',
              fontSize: '0.9rem',
              color: '#666'
            }}>
              {selectedJob.department && <span>Department: {selectedJob.department}</span>}
              {selectedJob.location && <span>Location: {selectedJob.location}</span>}
              <span>Status: {selectedJob.status}</span>
            </div>
          </div>
        </div>
      )}

      {selectedJobId && (
        <CandidateList
          jobPostingId={selectedJobId}
          onCandidateSelect={handleCandidateSelect}
        />
      )}

      <style>{`
        .candidates-page {
          min-height: 100vh;
          background: #f8f9fa;
        }

        .candidates-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 2rem 2rem 1rem 2rem;
          background: white;
          border-bottom: 1px solid #e9ecef;
          gap: 2rem;
        }

        .header-content {
          flex: 1;
        }

        .job-selector {
          flex-shrink: 0;
        }

        .job-info-banner {
          background: #e3f2fd;
          border-bottom: 1px solid #bbdefb;
          padding: 1rem 2rem;
        }

        @media (max-width: 768px) {
          .candidates-header {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }

          .job-selector select {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};