import React, { useState, useEffect } from 'react';
import { resumeService } from '../../services/resumeService';
import type { ResumeWithCandidate } from '../../types/resume';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/resume.css';

interface ResumeManagementProps {
  jobPostingId?: string;
}

export const ResumeManagement: React.FC<ResumeManagementProps> = ({ jobPostingId }) => {
  const { token } = useAuth();
  const [resumes, setResumes] = useState<ResumeWithCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, [jobPostingId, token]);

  const fetchResumes = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);
      
      const data = jobPostingId 
        ? await resumeService.getResumesByJobPosting(jobPostingId, token)
        : await resumeService.getAllResumes(token);
      
      setResumes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resume: ResumeWithCandidate) => {
    if (!token) return;

    try {
      const blob = await resumeService.downloadResume(resume.id, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = resume.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download resume');
    }
  };

  const handleDelete = async (resumeId: string) => {
    if (!token || !confirm('Are you sure you want to delete this resume?')) return;

    try {
      setDeletingId(resumeId);
      await resumeService.deleteResume(resumeId, token);
      setResumes(prev => prev.filter(r => r.id !== resumeId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete resume');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusUpdate = async (resumeId: string, newStatus: string) => {
    if (!token) return;

    try {
      await resumeService.updateResumeStatus(resumeId, newStatus, token);
      setResumes(prev => prev.map(r => 
        r.id === resumeId ? { ...r, status: newStatus } : r
      ));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update resume status');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusClass = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'processed': return 'status-processed';
      case 'failed': return 'status-failed';
      default: return 'status-pending';
    }
  };

  if (loading) {
    return (
      <div className="resume-management">
        <div className="loading">Loading resumes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resume-management">
        <div className="error-message">
          {error}
          <button onClick={fetchResumes} className="btn btn-primary" style={{ marginLeft: '1rem' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="resume-management">
      <div className="resume-list">
        <div className="resume-list-header">
          <h2>{jobPostingId ? 'Job Applications' : 'All Resumes'}</h2>
          <span className="resume-count">{resumes.length} resume{resumes.length !== 1 ? 's' : ''}</span>
        </div>

        {resumes.length === 0 ? (
          <div className="empty-state">
            <h3>No resumes found</h3>
            <p>
              {jobPostingId 
                ? 'No applications have been submitted for this job posting yet.'
                : 'No resumes have been uploaded to the system yet.'
              }
            </p>
          </div>
        ) : (
          resumes.map((resume) => (
            <div key={resume.id} className="resume-item">
              <div className="resume-header">
                <div className="candidate-info">
                  <h3>{resume.candidate.firstName} {resume.candidate.lastName}</h3>
                  <div className="candidate-email">{resume.candidate.email}</div>
                  {resume.candidate.phone && (
                    <div className="candidate-email">{resume.candidate.phone}</div>
                  )}
                </div>
                <div className="resume-actions">
                  <button
                    onClick={() => handleDownload(resume)}
                    className="btn btn-secondary btn-small"
                    title="Download Resume"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="btn btn-danger btn-small"
                    disabled={deletingId === resume.id}
                    title="Delete Resume"
                  >
                    {deletingId === resume.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>

              <div className="resume-meta">
                <span className={`resume-status ${getStatusClass(resume.status)}`}>
                  {resume.status}
                </span>
                <span className="resume-file-info">
                  {resume.fileName} ({formatFileSize(resume.fileSize)})
                </span>
                <span className="upload-date">
                  Uploaded {formatDate(resume.uploadedAt)}
                </span>
                <span className="resume-source">
                  Source: {resume.source === 'portal' ? 'Applicant Portal' : 'Direct Upload'}
                </span>
              </div>

              {resume.status === 'pending' && (
                <div style={{ marginTop: '1rem' }}>
                  <button
                    onClick={() => handleStatusUpdate(resume.id, 'processing')}
                    className="btn btn-primary btn-small"
                  >
                    Start Processing
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};