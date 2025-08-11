import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/landing.css';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // If user is already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = () => {
    navigate('/login');
  };

  const handleLearnMore = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-brand">
            <h2>AI Recruiter</h2>
          </div>
          <div className="nav-actions">
            <button 
              className="btn btn-outline"
              onClick={() => navigate('/login')}
            >
              Sign In
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleGetStarted}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">
              AI-Powered Candidate Evaluation System
            </h1>
            <p className="hero-subtitle">
              Transform your hiring process with intelligent resume analysis, automated scoring, 
              and data-driven candidate insights. Save time, reduce bias, and find the best talent faster.
            </p>
            <div className="hero-actions">
              <button 
                className="btn btn-primary btn-large"
                onClick={handleGetStarted}
              >
                Get Started
              </button>
              <button 
                className="btn btn-outline btn-large"
                onClick={handleLearnMore}
              >
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="preview-title">Candidate Evaluation</span>
              </div>
              <div className="preview-content">
                <div className="candidate-card-preview">
                  <div className="candidate-info">
                    <div className="candidate-name">John Smith</div>
                    <div className="candidate-role">Senior Software Engineer</div>
                  </div>
                  <div className="score-indicators">
                    <div className="score-circle">
                      <span>85%</span>
                    </div>
                    <div className="score-circle">
                      <span>92%</span>
                    </div>
                    <div className="score-circle">
                      <span>78%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Powerful Features for Modern Hiring</h2>
            <p>Everything you need to streamline your recruitment process</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                  <path d="M3 12h6m6 0h6"/>
                </svg>
              </div>
              <h3>Intelligent Resume Analysis</h3>
              <p>AI-powered extraction and analysis of skills, experience, and qualifications from any resume format.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                  <line x1="9" y1="9" x2="9.01" y2="9"/>
                  <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
              </div>
              <h3>Automated Scoring</h3>
              <p>Comprehensive evaluation with detailed scoring for skills match, experience level, and education requirements.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <h3>Real-time Insights</h3>
              <p>Get instant gap analysis, recommendations, and detailed candidate insights to make informed decisions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
              <h3>Streamlined Workflow</h3>
              <p>From job posting creation to candidate ranking - manage your entire recruitment pipeline in one place.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="section-container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Simple steps to transform your hiring process</p>
          </div>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Create Job Postings</h3>
                <p>Define your requirements, skills, and qualifications for the perfect candidate.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Collect Applications</h3>
                <p>Candidates apply through your portal or upload resumes directly to the system.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>AI Evaluation</h3>
                <p>Our AI automatically analyzes and scores each candidate against your requirements.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3>Review & Hire</h3>
                <p>Review ranked candidates with detailed insights and make data-driven hiring decisions.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-container">
          <div className="section-header">
            <h2>Why Choose AI Recruiter?</h2>
            <p>Measurable results that transform your hiring process</p>
          </div>
          <div className="benefits-grid">
            <div className="benefit-item">
              <div className="benefit-stat">80%</div>
              <div className="benefit-label">Time Saved</div>
              <p>Reduce initial screening time with automated candidate evaluation</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-stat">95%</div>
              <div className="benefit-label">Accuracy</div>
              <p>AI-powered matching ensures you find the most qualified candidates</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-stat">50%</div>
              <div className="benefit-label">Faster Hiring</div>
              <p>Streamlined process gets you from job posting to hire faster</p>
            </div>
            <div className="benefit-item">
              <div className="benefit-stat">100%</div>
              <div className="benefit-label">Objective</div>
              <p>Reduce unconscious bias with data-driven candidate evaluation</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Ready to Transform Your Hiring?</h2>
            <p>Join forward-thinking companies using AI to find the best talent faster.</p>
            <div className="cta-actions">
              <button 
                className="btn btn-primary btn-large"
                onClick={handleGetStarted}
              >
                Get Started
              </button>
              <button 
                className="btn btn-outline btn-large"
                onClick={() => navigate('/login')}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>AI Recruiter</h3>
              <p>Intelligent candidate evaluation for modern hiring teams.</p>
            </div>
            <div className="footer-links">
              <div className="footer-section">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><a href="#how-it-works">How It Works</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Company</h4>
                <ul>
                  <li><a href="#about">About</a></li>
                  <li><a href="#contact">Contact</a></li>
                  <li><a href="#support">Support</a></li>
                </ul>
              </div>
              <div className="footer-section">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#privacy">Privacy Policy</a></li>
                  <li><a href="#terms">Terms of Service</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 AI Recruiter. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};