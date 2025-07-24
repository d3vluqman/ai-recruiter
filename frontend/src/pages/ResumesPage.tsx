import React from 'react';
import { ResumeManagement } from '../components/resume/ResumeManagement';
import { useAuth } from '../contexts/AuthContext';

export const ResumesPage: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>Please log in to view resumes.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '2rem 2rem 1rem 2rem' }}>
        <h1 style={{ margin: 0, color: '#0073b1' }}>Resume Management</h1>
        <p style={{ color: '#666', margin: '0.5rem 0 0 0' }}>
          View and manage all uploaded resumes across all job postings.
        </p>
      </div>
      <ResumeManagement />
    </div>
  );
};