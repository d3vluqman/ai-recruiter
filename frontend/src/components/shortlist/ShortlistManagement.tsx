import React, { useState, useEffect } from 'react';
import { shortlistService, Shortlist, ShortlistCandidate } from '../../services/shortlistService';
import { CreateShortlistForm } from './CreateShortlistForm';
import { ShortlistCandidateList } from './ShortlistCandidateList';
import { EmailCommunicationPanel } from './EmailCommunicationPanel';
import '../../styles/shortlist.css';

interface ShortlistManagementProps {
  jobId: string;
  jobTitle: string;
}

export const ShortlistManagement: React.FC<ShortlistManagementProps> = ({ jobId, jobTitle }) => {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [selectedShortlist, setSelectedShortlist] = useState<Shortlist | null>(null);
  const [shortlistCandidates, setShortlistCandidates] = useState<ShortlistCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'candidates' | 'emails'>('candidates');

  useEffect(() => {
    loadShortlists();
  }, [jobId]);

  useEffect(() => {
    if (selectedShortlist) {
      loadShortlistCandidates(selectedShortlist.id);
    }
  }, [selectedShortlist]);

  const loadShortlists = async () => {
    try {
      setLoading(true);
      const data = await shortlistService.getShortlistsByJob(jobId);
      setShortlists(data);
      if (data.length > 0 && !selectedShortlist) {
        setSelectedShortlist(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shortlists');
    } finally {
      setLoading(false);
    }
  };

  const loadShortlistCandidates = async (shortlistId: string) => {
    try {
      const candidates = await shortlistService.getShortlistCandidates(shortlistId);
      setShortlistCandidates(candidates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load shortlist candidates');
    }
  };

  const handleCreateShortlist = async (shortlist: Shortlist) => {
    setShortlists(prev => [shortlist, ...prev]);
    setSelectedShortlist(shortlist);
    setShowCreateForm(false);
  };

  const handleStatusUpdate = async (shortlistId: string, status: 'draft' | 'finalized' | 'sent') => {
    try {
      await shortlistService.updateShortlistStatus(shortlistId, status);
      setShortlists(prev => prev.map(s => 
        s.id === shortlistId ? { ...s, status } : s
      ));
      if (selectedShortlist?.id === shortlistId) {
        setSelectedShortlist(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update shortlist status');
    }
  };

  const handleCandidateRemove = async (candidateId: string) => {
    if (!selectedShortlist) return;
    
    try {
      await shortlistService.removeCandidateFromShortlist(selectedShortlist.id, candidateId);
      setShortlistCandidates(prev => prev.filter(c => c.candidateId !== candidateId));
      
      // Update candidate count
      setSelectedShortlist(prev => prev ? {
        ...prev,
        candidateCount: prev.candidateCount - 1
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove candidate');
    }
  };

  if (loading) {
    return (
      <div className="shortlist-management">
        <div className="loading-spinner">Loading shortlists...</div>
      </div>
    );
  }

  return (
    <div className="shortlist-management">
      <div className="shortlist-header">
        <h2>Shortlists for {jobTitle}</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          Create New Shortlist
        </button>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showCreateForm && (
        <CreateShortlistForm
          jobId={jobId}
          onSuccess={handleCreateShortlist}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="shortlist-content">
        <div className="shortlist-sidebar">
          <h3>Shortlists ({shortlists.length})</h3>
          <div className="shortlist-list">
            {shortlists.map(shortlist => (
              <div
                key={shortlist.id}
                className={`shortlist-item ${selectedShortlist?.id === shortlist.id ? 'active' : ''}`}
                onClick={() => setSelectedShortlist(shortlist)}
              >
                <div className="shortlist-info">
                  <div className="shortlist-date">
                    {new Date(shortlist.createdAt).toLocaleDateString()}
                  </div>
                  <div className="shortlist-stats">
                    {shortlist.candidateCount} candidates
                  </div>
                  <div className={`shortlist-status status-${shortlist.status}`}>
                    {shortlist.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shortlist-main">
          {selectedShortlist ? (
            <>
              <div className="shortlist-details">
                <div className="shortlist-title">
                  <h3>Shortlist Details</h3>
                  <div className="shortlist-actions">
                    {selectedShortlist.status === 'draft' && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleStatusUpdate(selectedShortlist.id, 'finalized')}
                      >
                        Finalize
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="shortlist-criteria">
                  <h4>Selection Criteria</h4>
                  <div className="criteria-details">
                    {selectedShortlist.selectionCriteria.topCandidateCount && (
                      <div className="criteria-item">
                        <strong>Top Candidates:</strong> {selectedShortlist.selectionCriteria.topCandidateCount}
                      </div>
                    )}
                    {selectedShortlist.selectionCriteria.minimumScore && (
                      <div className="criteria-item">
                        <strong>Minimum Score:</strong> {selectedShortlist.selectionCriteria.minimumScore}%
                      </div>
                    )}
                    {selectedShortlist.selectionCriteria.requiredSkills && selectedShortlist.selectionCriteria.requiredSkills.length > 0 && (
                      <div className="criteria-item">
                        <strong>Required Skills:</strong> {selectedShortlist.selectionCriteria.requiredSkills.join(', ')}
                      </div>
                    )}
                    {selectedShortlist.selectionCriteria.manualSelection && (
                      <div className="criteria-item">
                        <strong>Manual Selection:</strong> Yes
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="shortlist-tabs">
                <button
                  className={`tab-button ${activeTab === 'candidates' ? 'active' : ''}`}
                  onClick={() => setActiveTab('candidates')}
                >
                  Candidates ({shortlistCandidates.length})
                </button>
                <button
                  className={`tab-button ${activeTab === 'emails' ? 'active' : ''}`}
                  onClick={() => setActiveTab('emails')}
                >
                  Email Communications
                </button>
              </div>

              <div className="tab-content">
                {activeTab === 'candidates' && (
                  <ShortlistCandidateList
                    candidates={shortlistCandidates}
                    shortlistStatus={selectedShortlist.status}
                    onCandidateRemove={handleCandidateRemove}
                  />
                )}
                {activeTab === 'emails' && (
                  <EmailCommunicationPanel
                    shortlistId={selectedShortlist.id}
                    shortlistStatus={selectedShortlist.status}
                    candidates={shortlistCandidates}
                    onStatusUpdate={(status) => handleStatusUpdate(selectedShortlist.id, status)}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="no-shortlist-selected">
              <p>Select a shortlist to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};