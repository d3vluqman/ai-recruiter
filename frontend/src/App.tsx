import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobPostingsPage } from './pages/JobPostingsPage';
import { ResumesPage } from './pages/ResumesPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { ApplicantPortal } from './components/resume/ApplicantPortal';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/job-postings"
              element={
                <ProtectedRoute>
                  <JobPostingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resumes"
              element={
                <ProtectedRoute>
                  <ResumesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/candidates"
              element={
                <ProtectedRoute>
                  <CandidatesPage />
                </ProtectedRoute>
              }
            />
            
            {/* Public applicant portal routes */}
            <Route path="/apply/:jobId" element={<ApplicantPortal />} />
            
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;