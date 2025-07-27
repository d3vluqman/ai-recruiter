import React, { useState, useEffect } from 'react';
import { 
  shortlistService, 
  ShortlistCandidate, 
  EmailCommunication, 
  EmailTemplate,
  SendEmailRequest 
} from '../../services/shortlistService';

interface EmailCommunicationPanelProps {
  shortlistId: string;
  shortlistStatus: 'draft' | 'finalized' | 'sent';
  candidates: ShortlistCandidate[];
  onStatusUpdate: (status: 'sent') => void;
}

export const EmailCommunicationPanel: React.FC<EmailCommunicationPanelProps> = ({
  shortlistId,
  shortlistStatus,
  candidates,
  onStatusUpdate
}) => {
  const [emailCommunications, setEmailCommunications] = useState<EmailCommunication[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    loadEmailCommunications();
    loadEmailTemplates();
  }, [shortlistId]);

  useEffect(() => {
    if (selectedTemplate) {
      setCustomSubject(selectedTemplate.subject);
      setCustomBody(selectedTemplate.body);
    }
  }, [selectedTemplate]);

  const loadEmailCommunications = async () => {
    try {
      const communications = await shortlistService.getEmailCommunications(shortlistId);
      setEmailCommunications(communications);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email communications');
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const templates = await shortlistService.getEmailTemplates();
      setEmailTemplates(templates);
      if (templates.length > 0) {
        setSelectedTemplate(templates[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email templates');
    }
  };

  const handleSendEmails = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      const emailTemplate: EmailTemplate = {
        ...selectedTemplate,
        subject: customSubject,
        body: customBody
      };

      const request: SendEmailRequest = {
        shortlistId,
        emailTemplate,
        candidateIds: selectedCandidates.length > 0 ? selectedCandidates : undefined
      };

      const sentEmails = await shortlistService.sendShortlistEmails(request);
      setEmailCommunications(prev => [...sentEmails, ...prev]);
      setShowEmailForm(false);
      setSelectedCandidates([]);
      
      if (sentEmails.some(email => email.deliveryStatus === 'sent')) {
        onStatusUpdate('sent');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateToggle = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'success';
      case 'failed': return 'danger';
      case 'pending': return 'warning';
      case 'bounced': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="email-communication-panel">
      <div className="panel-header">
        <h4>Email Communications</h4>
        {shortlistStatus === 'finalized' && (
          <button
            className="btn btn-primary"
            onClick={() => setShowEmailForm(true)}
          >
            Send Emails
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {showEmailForm && (
        <div className="email-form-overlay">
          <div className="email-form">
            <div className="form-header">
              <h5>Send Shortlist Emails</h5>
              <button className="close-button" onClick={() => setShowEmailForm(false)}>×</button>
            </div>

            <div className="form-content">
              <div className="form-group">
                <label>Email Template</label>
                <select
                  value={selectedTemplate?.type || ''}
                  onChange={(e) => {
                    const template = emailTemplates.find(t => t.type === e.target.value);
                    setSelectedTemplate(template || null);
                  }}
                >
                  {emailTemplates.map(template => (
                    <option key={template.type} value={template.type}>
                      {template.type.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Recipients</label>
                <div className="candidate-selection">
                  <label className="select-all">
                    <input
                      type="checkbox"
                      checked={selectedCandidates.length === candidates.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCandidates(candidates.map(c => c.candidateId));
                        } else {
                          setSelectedCandidates([]);
                        }
                      }}
                    />
                    Select All ({candidates.length} candidates)
                  </label>
                  
                  <div className="candidate-checkboxes">
                    {candidates.map(candidate => (
                      <label key={candidate.id} className="candidate-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.candidateId)}
                          onChange={() => handleCandidateToggle(candidate.candidateId)}
                        />
                        {candidate.candidate?.firstName} {candidate.candidate?.lastName} 
                        ({candidate.candidate?.email})
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="emailSubject">Subject</label>
                <input
                  type="text"
                  id="emailSubject"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              <div className="form-group">
                <label htmlFor="emailBody">Message</label>
                <textarea
                  id="emailBody"
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  rows={10}
                  placeholder="Email message body"
                />
              </div>

              {selectedTemplate && (
                <div className="template-variables">
                  <h6>Available Variables:</h6>
                  <div className="variables-list">
                    {selectedTemplate.variables.map(variable => (
                      <span key={variable} className="variable-tag">
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowEmailForm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSendEmails}
                disabled={loading || selectedCandidates.length === 0 || !customSubject || !customBody}
              >
                {loading ? 'Sending...' : `Send to ${selectedCandidates.length} candidates`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="email-history">
        <h5>Email History</h5>
        {emailCommunications.length === 0 ? (
          <p>No emails sent yet</p>
        ) : (
          <div className="email-list">
            {emailCommunications.map(email => {
              const candidate = candidates.find(c => c.candidateId === email.candidateId);
              return (
                <div key={email.id} className="email-item">
                  <div className="email-header">
                    <div className="email-recipient">
                      <strong>
                        {candidate?.candidate?.firstName} {candidate?.candidate?.lastName}
                      </strong>
                      <span className="email-address">({candidate?.candidate?.email})</span>
                    </div>
                    <div className={`email-status status-${getDeliveryStatusColor(email.deliveryStatus)}`}>
                      {email.deliveryStatus}
                    </div>
                  </div>
                  
                  <div className="email-details">
                    <div className="email-subject">
                      <strong>Subject:</strong> {email.subject}
                    </div>
                    <div className="email-type">
                      <strong>Type:</strong> {email.emailType.replace('_', ' ')}
                    </div>
                    {email.sentAt && (
                      <div className="email-sent-at">
                        <strong>Sent:</strong> {new Date(email.sentAt).toLocaleString()}
                      </div>
                    )}
                    {email.errorMessage && (
                      <div className="email-error">
                        <strong>Error:</strong> {email.errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};