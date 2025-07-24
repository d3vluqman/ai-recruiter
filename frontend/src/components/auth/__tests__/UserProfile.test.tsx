import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '../UserProfile';
import { AuthContext } from '../../../contexts/AuthContext';
import { AuthContextType, User, Organization } from '../../../types/auth';
import { vi } from 'vitest';

// Mock the auth service
vi.mock('../../../services/authService', () => ({
  authService: {
    getOrganizations: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test Organization', createdAt: new Date() },
      { id: '2', name: 'Another Org', createdAt: new Date() }
    ]),
  },
}));

const mockUser: User = {
  id: '123',
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'recruiter',
  organizationId: '1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: mockUser,
  token: 'mock-token',
  isLoading: false,
  isAuthenticated: true,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
  ...overrides,
});

const MockAuthProvider = ({ 
  children, 
  contextValue 
}: { 
  children: React.ReactNode;
  contextValue?: Partial<AuthContextType>;
}) => {
  const mockContext = createMockAuthContext(contextValue);
  return (
    <AuthContext.Provider value={mockContext}>
      {children}
    </AuthContext.Provider>
  );
};

describe('UserProfile', () => {
  const mockUpdateProfile = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user profile information correctly', async () => {
    render(
      <MockAuthProvider>
        <UserProfile />
      </MockAuthProvider>
    );

    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('recruiter')).toBeInTheDocument();
    expect(screen.getByText('1/1/2024')).toBeInTheDocument();
  });

  it('shows edit form when edit button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <UserProfile />
      </MockAuthProvider>
    );

    const editButton = screen.getByText('Edit Profile');
    await user.click(editButton);

    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Doe')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('updates profile when form is submitted', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider contextValue={{ updateProfile: mockUpdateProfile }}>
        <UserProfile />
      </MockAuthProvider>
    );

    // Click edit button
    await user.click(screen.getByText('Edit Profile'));

    // Update form fields
    const firstNameInput = screen.getByDisplayValue('John');
    const lastNameInput = screen.getByDisplayValue('Doe');
    
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Jane');
    await user.clear(lastNameInput);
    await user.type(lastNameInput, 'Smith');

    // Submit form
    await user.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        organizationId: '1',
      });
    });
  });

  it('cancels editing when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider>
        <UserProfile />
      </MockAuthProvider>
    );

    // Click edit button
    await user.click(screen.getByText('Edit Profile'));
    
    // Modify a field
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Modified');

    // Click cancel
    await user.click(screen.getByText('Cancel'));

    // Should be back to view mode with original values
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('prevents submission when required fields are empty', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider contextValue={{ updateProfile: mockUpdateProfile }}>
        <UserProfile />
      </MockAuthProvider>
    );

    // Click edit button
    await user.click(screen.getByText('Edit Profile'));

    // Clear required fields
    const firstNameInput = screen.getByDisplayValue('John');
    await user.clear(firstNameInput);

    // Submit form
    await user.click(screen.getByText('Save Changes'));

    // The form should show an error and not call updateProfile
    await waitFor(() => {
      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });
  });

  it('calls logout when sign out button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MockAuthProvider contextValue={{ logout: mockLogout }}>
        <UserProfile />
      </MockAuthProvider>
    );

    await user.click(screen.getByText('Sign Out'));

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('shows loading message when user is null', () => {
    render(
      <MockAuthProvider contextValue={{ user: null }}>
        <UserProfile />
      </MockAuthProvider>
    );

    expect(screen.getByText('Loading user profile...')).toBeInTheDocument();
  });
});