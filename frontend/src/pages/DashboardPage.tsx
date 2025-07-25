import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserProfile } from '../components/auth/UserProfile';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleJobPostingsClick = () => {
    navigate('/job-postings');
  };

  const handleResumesClick = () => {
    navigate('/resumes');
  };

  const handleCandidatesClick = () => {
    navigate('/candidates');
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Candidate Evaluation System</h1>
        <p>Welcome back, {user?.firstName}!</p>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="action-cards">
            <div className="action-card">
              <h3>Job Postings</h3>
              <p>Create and manage job postings</p>
              <button className="action-button" onClick={handleJobPostingsClick}>
                Manage Job Postings
              </button>
            </div>
            <div className="action-card">
              <h3>Resume Management</h3>
              <p>View and manage uploaded resumes</p>
              <button className="action-button" onClick={handleResumesClick}>
                Manage Resumes
              </button>
            </div>
            <div className="action-card">
              <h3>Candidates</h3>
              <p>View and evaluate candidates</p>
              <button className="action-button" onClick={handleCandidatesClick}>
                Evaluate Candidates
              </button>
            </div>
            <div className="action-card">
              <h3>Reports</h3>
              <p>View recruitment analytics</p>
              <button className="action-button" disabled>
                Coming Soon
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <UserProfile />
        </div>
      </div>
    </div>
  );
};