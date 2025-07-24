import React from 'react';

export const TestApplicantPortal: React.FC = () => {
  return (
    <div>
      <div style={{ padding: '1rem', backgroundColor: '#f0f0f0', marginBottom: '1rem' }}>
        <h3>🧪 Test Mode - Applicant Portal</h3>
        <p>This is a test version of the applicant portal. You can access the real applicant portal by going to /apply/YOUR_JOB_ID</p>
        <p><strong>Example:</strong> /apply/test-job-1</p>
      </div>
    </div>
  );
};