import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'medium',
}) => {
  const getSpinnerSize = () => {
    switch (size) {
      case 'small':
        return '20px';
      case 'large':
        return '48px';
      default:
        return '32px';
    }
  };

  return (
    <div className={`loading-spinner loading-spinner-${size}`}>
      <div
        className="spinner"
        style={{
          width: getSpinnerSize(),
          height: getSpinnerSize(),
          border: `3px solid #f3f3f3`,
          borderTop: `3px solid #0073b1`,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      {message && <p className="loading-message">{message}</p>}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .loading-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }
        .loading-message {
          margin-top: 1rem;
          color: #666;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};