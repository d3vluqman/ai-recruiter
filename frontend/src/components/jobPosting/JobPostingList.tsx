import React, { useState, useEffect } from 'react';
import type { JobPosting, JobPostingFilters } from '../../types/jobPosting';

interface JobPostingListProps {
  jobPostings: JobPosting[];
  onEdit: (jobPosting: JobPosting) => void;
  onDelete: (id: string) => void;
  onView: (jobPosting: JobPosting) => void;
  isLoading?: boolean;
}

export const JobPostingList: React.FC<JobPostingListProps> = ({
  jobPostings,
  onEdit,
  onDelete,
  onView,
  isLoading = false,
}) => {
  const [filters, setFilters] = useState<JobPostingFilters>({});
  const [filteredJobs, setFilteredJobs] = useState<JobPosting[]>(jobPostings);

  useEffect(() => {
    let filtered = [...jobPostings];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        job =>
          job.title.toLowerCase().includes(searchLower) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.department?.toLowerCase().includes(searchLower) ||
          job.location?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(job => job.status === filters.status);
    }

    // Apply department filter
    if (filters.department) {
      filtered = filtered.filter(job => job.department === filters.department);
    }

    // Apply location filter
    if (filters.location) {
      filtered = filtered.filter(job => job.location === filters.location);
    }

    setFilteredJobs(filtered);
  }, [jobPostings, filters]);

  const handleFilterChange = (key: keyof JobPostingFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const getUniqueValues = (key: 'department' | 'location') => {
    const values = jobPostings
      .map(job => job[key])
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
    return values.sort();
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-badge status-active';
      case 'inactive':
        return 'status-badge status-inactive';
      case 'draft':
        return 'status-badge status-draft';
      case 'closed':
        return 'status-badge status-closed';
      default:
        return 'status-badge';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this job posting?')) {
      onDelete(id);
    }
  };

  if (isLoading) {
    return (
      <div className="job-posting-list">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading job postings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="job-posting-list">
      <div className="list-header">
        <div className="header-title">
          <h2>Job Postings</h2>
          <span className="job-count">
            {filteredJobs.length} of {jobPostings.length} jobs
          </span>
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search jobs..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-group">
            <select
              value={filters.status || ''}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.department || ''}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {getUniqueValues('department').map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select
              value={filters.location || ''}
              onChange={(e) => handleFilterChange('location', e.target.value)}
              className="filter-select"
            >
              <option value="">All Locations</option>
              {getUniqueValues('location').map(loc => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {(filters.search || filters.status || filters.department || filters.location) && (
            <button onClick={clearFilters} className="btn-clear-filters">
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <div className="jobs-grid">
        {filteredJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No job postings found</h3>
            <p>
              {jobPostings.length === 0
                ? "You haven't created any job postings yet."
                : 'Try adjusting your filters to see more results.'}
            </p>
          </div>
        ) : (
          filteredJobs.map(job => (
            <div
              key={job.id}
              className="job-card"
              onClick={() => onView(job)}
            >
              <div className="job-card-header">
                <div className="job-title-section">
                  <h3 className="job-title">{job.title}</h3>
                  <span className={getStatusBadgeClass(job.status)}>
                    {job.status}
                  </span>
                </div>
                <div className="job-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(job);
                    }}
                    className="btn-action btn-edit"
                    title="Edit job posting"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(e, job.id)}
                    className="btn-action btn-delete"
                    title="Delete job posting"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="job-meta">
                {job.department && (
                  <span className="job-meta-item">
                    🏢 {job.department}
                  </span>
                )}
                {job.location && (
                  <span className="job-meta-item">
                    📍 {job.location}
                  </span>
                )}
                <span className="job-meta-item">
                  📅 {formatDate(job.createdAt)}
                </span>
              </div>

              <div className="job-description">
                <p>{job.description.substring(0, 150)}...</p>
              </div>

              <div className="job-requirements">
                <div className="requirements-header">
                  <span>Requirements ({job.requirements.length})</span>
                </div>
                <div className="requirements-preview">
                  {job.requirements.slice(0, 3).map((req, index) => (
                    <span key={index} className="requirement-tag">
                      {req.length > 30 ? `${req.substring(0, 30)}...` : req}
                    </span>
                  ))}
                  {job.requirements.length > 3 && (
                    <span className="requirement-tag more">
                      +{job.requirements.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {job.parsedRequirements?.skills && job.parsedRequirements.skills.length > 0 && (
                <div className="job-skills">
                  <div className="skills-header">
                    <span>Skills ({job.parsedRequirements.skills.length})</span>
                  </div>
                  <div className="skills-preview">
                    {job.parsedRequirements.skills.slice(0, 5).map((skill, index) => (
                      <span key={index} className="skill-tag">
                        {skill}
                      </span>
                    ))}
                    {job.parsedRequirements.skills.length > 5 && (
                      <span className="skill-tag more">
                        +{job.parsedRequirements.skills.length - 5}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};