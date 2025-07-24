import React, { useState, useRef } from 'react';
import type { CreateJobPostingData, UpdateJobPostingData, JobPosting } from '../../types/jobPosting';

interface JobPostingFormProps {
  initialData?: JobPosting;
  onSubmit: (data: CreateJobPostingData | UpdateJobPostingData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const JobPostingForm: React.FC<JobPostingFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    department: initialData?.department || '',
    location: initialData?.location || '',
    status: initialData?.status || 'draft' as const,
  });

  const [requirements, setRequirements] = useState<string[]>(
    initialData?.requirements || ['']
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRequirementChange = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const addRequirement = () => {
    setRequirements([...requirements, '']);
  };

  const removeRequirement = (index: number) => {
    if (requirements.length > 1) {
      setRequirements(requirements.filter((_, i) => i !== index));
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PDF, DOC, DOCX, or TXT file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      alert('File size must be less than 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    const filteredRequirements = requirements.filter(req => req.trim() !== '');

    const submitData = {
      ...formData,
      requirements: filteredRequirements,
      jobDescriptionFile: selectedFile || undefined,
    };

    try {
      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting job posting:', error);
      alert('Failed to save job posting. Please try again.');
    }
  };

  return (
    <div className="job-posting-form">
      <form onSubmit={handleSubmit} className="form">
        <div className="form-header">
          <h2>{initialData ? 'Edit Job Posting' : 'Create New Job Posting'}</h2>
        </div>

        <div className="form-group">
          <label htmlFor="title" className="form-label required">
            Job Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="form-input"
            placeholder="e.g., Senior Software Engineer"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description" className="form-label required">
            Job Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="form-textarea"
            rows={6}
            placeholder="Describe the role, responsibilities, and what you're looking for..."
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="department" className="form-label">
              Department
            </label>
            <input
              type="text"
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g., Engineering"
            />
          </div>

          <div className="form-group">
            <label htmlFor="location" className="form-label">
              Location
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="form-input"
              placeholder="e.g., San Francisco, CA"
            />
          </div>
        </div>

        {initialData && (
          <div className="form-group">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-select"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Requirements</label>
          <div className="requirements-list">
            {requirements.map((requirement, index) => (
              <div key={index} className="requirement-item">
                <input
                  type="text"
                  value={requirement}
                  onChange={(e) => handleRequirementChange(index, e.target.value)}
                  className="form-input"
                  placeholder="Enter a requirement..."
                />
                {requirements.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRequirement(index)}
                    className="btn-remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRequirement}
              className="btn-add-requirement"
            >
              + Add Requirement
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Job Description File (Optional)</label>
          <div
            className={`file-upload-area ${dragActive ? 'drag-active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileInputChange}
              accept=".pdf,.doc,.docx,.txt"
              style={{ display: 'none' }}
            />
            
            {selectedFile ? (
              <div className="file-selected">
                <div className="file-info">
                  <span className="file-name">{selectedFile.name}</span>
                  <span className="file-size">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="btn-remove-file"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="file-upload-prompt">
                <div className="upload-icon">📄</div>
                <p>
                  <strong>Click to upload</strong> or drag and drop
                </p>
                <p className="file-types">PDF, DOC, DOCX, or TXT (max 10MB)</p>
              </div>
            )}
          </div>
          <p className="form-help">
            Upload a job description file to automatically extract requirements and skills.
          </p>
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : (initialData ? 'Update Job Posting' : 'Create Job Posting')}
          </button>
        </div>
      </form>
    </div>
  );
};