import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from '../ProtectedRoute';
import { AuthContext } from '../../../contexts/AuthContext';
import { AuthContextType, User } from '../../../types/auth';
import { vi } from 'vitest';

const createMockAuthContext = (overrides: Partial<AuthContextType> = {}): AuthContextType => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
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

const TestComponent = () => <div>Protected Content</div>;

describe('ProtectedRoute', () => {
  it('shows loading spinner when authentication is loading', () => {
    render(
      <MemoryRouter>
        <MockAuthProvider contextValue={{ isLoading: true }}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MockAuthProvider contextValue={{ isAuthenticated: false, isLoading: false }}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders protected content when user is authenticated', () => {
    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'recruiter',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <MemoryRouter>
        <MockAuthProvider contextValue={{ 
          isAuthenticated: true, 
          isLoading: false,
          user: mockUser 
        }}>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </MockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('shows access denied when user lacks required role', () => {
    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <MemoryRouter>
        <MockAuthProvider contextValue={{ 
          isAuthenticated: true, 
          isLoading: false,
          user: mockUser 
        }}>
          <ProtectedRoute requiredRole={['admin', 'recruiter']}>
            <TestComponent />
          </ProtectedRoute>
        </MockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText('Required role: admin or recruiter')).toBeInTheDocument();
    expect(screen.getByText('Your role: user')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders protected content when user has required role', () => {
    const mockUser: User = {
      id: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'recruiter',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <MemoryRouter>
        <MockAuthProvider contextValue={{ 
          isAuthenticated: true, 
          isLoading: false,
          user: mockUser 
        }}>
          <ProtectedRoute requiredRole={['admin', 'recruiter']}>
            <TestComponent />
          </ProtectedRoute>
        </MockAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});