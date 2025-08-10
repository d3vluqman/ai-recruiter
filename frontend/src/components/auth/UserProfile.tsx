import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Organization } from '../../types/auth';
import { ErrorHandler } from '../../utils/errorHandler';
import { authService } from '../../services/authService';

export const UserProfile: React.FC = () => {
  const { user, updateProfile, token, logout } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    organizationId: user?.organizationId || '',
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Load organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!token) return;
      
      try {
        setLoadingOrgs(true);
        const orgs = await authService.getOrganizations(token);
        setOrganizations(orgs);
      } catch (err) {
        ErrorHandler.logError(err, 'Load organizations for user profile');
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrganizations();
  }, [token]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First name and last name are required');
      return;
    }

    try {
      setIsLoading(true);
      const updates = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        organizationId: formData.organizationId || undefined,
      };
      
      await updateProfile(updates);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        organizationId: user.organizationId || '',
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
  };

  const getCurrentOrganization = () => {
    if (!user?.organizationId) return null;
    return organizations.find(org => org.id === user.organizationId);
  };

  if (!user) {
    return <div>Loading user profile...</div>;
  }

  return (
    <div className="user-profile">
      <div className="profile-card">
        <div className="profile-header">
          <h2>User Profile</h2>
          {!isEditing && (
            <button
              className="edit-button"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSubmit} className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="organizationId">Organization</label>
              <select
                id="organizationId"
                name="organizationId"
                value={formData.organizationId}
                onChange={handleChange}
                disabled={isLoading || loadingOrgs}
              >
                <option value="">No organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="save-button"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="cancel-button"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-info">
            <div className="info-group">
              <label>Name</label>
              <p>{user.firstName} {user.lastName}</p>
            </div>

            <div className="info-group">
              <label>Email</label>
              <p>{user.email}</p>
            </div>

            <div className="info-group">
              <label>Role</label>
              <p className="role-badge">{user.role}</p>
            </div>

            <div className="info-group">
              <label>Organization</label>
              <p>{getCurrentOrganization()?.name || 'No organization'}</p>
            </div>

            <div className="info-group">
              <label>Member Since</label>
              <p>{new Date(user.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        <div className="profile-actions">
          <button
            className="logout-button"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};