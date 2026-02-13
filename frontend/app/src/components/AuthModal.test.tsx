import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthModal } from './AuthModal';
import { AuthProvider } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import type { ApiError } from '@/types/api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    guestLogin: vi.fn(),
    logout: vi.fn(),
  },
  userApi: {
    getMe: vi.fn(),
  },
  getToken: vi.fn(() => null),
  setToken: vi.fn(),
  removeToken: vi.fn(),
}));

// Helper to create wrapper with providers
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
};

describe('AuthModal - Registration Validation Errors (AUTH-02)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays error message when registration fails with duplicate email', async () => {
    const user = userEvent.setup();

    // Mock the register API to return a duplicate email error
    const duplicateEmailError: ApiError = {
      message: 'email already registered',
      statusCode: 409,
    };
    (authApi.register as Mock).mockRejectedValue(duplicateEmailError);

    const onOpenChange = vi.fn();

    render(
      <AuthModal open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Verify modal is open
    expect(screen.getByText('Welcome to Crossy!')).toBeInTheDocument();

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in the registration form with an existing email
    const displayNameInput = screen.getByLabelText(/display name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(displayNameInput, 'TestUser');
    await user.type(emailInput, 'existing@example.com');
    await user.type(passwordInput, 'password123');

    // Submit the form
    const registerButton = screen.getByRole('button', { name: /register/i });
    await user.click(registerButton);

    // Wait for error message to appear (loading state may be too fast to catch)
    await waitFor(() => {
      expect(screen.getByText('email already registered')).toBeInTheDocument();
    });

    // Verify the error message is in a styled alert box with proper classes
    const errorAlert = screen.getByText('email already registered');
    expect(errorAlert).toBeInTheDocument();
    // The error div should have these classes from AuthModal.tsx line 265
    expect(errorAlert.className).toContain('text-sm');
    expect(errorAlert.className).toContain('text-destructive');
    expect(errorAlert.className).toContain('bg-destructive/10');

    // Verify the API was called with correct data
    expect(authApi.register).toHaveBeenCalledWith({
      displayName: 'TestUser',
      email: 'existing@example.com',
      password: 'password123',
    });

    // Verify modal stays open after error
    expect(screen.getByText('Welcome to Crossy!')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Verify form fields are still populated
    expect(displayNameInput).toHaveValue('TestUser');
    expect(emailInput).toHaveValue('existing@example.com');
    expect(passwordInput).toHaveValue('password123');

    // Verify the register button is enabled again
    expect(registerButton).not.toBeDisabled();
  });

  it('displays generic error message when registration fails without specific message', async () => {
    const user = userEvent.setup();

    // Mock the register API to return an error without a message
    (authApi.register as Mock).mockRejectedValue(new Error(''));

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in the form
    await user.type(screen.getByLabelText(/display name/i), 'TestUser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    const registerButton = screen.getByRole('button', { name: /register/i });
    await user.click(registerButton);

    // Wait for generic error message
    await waitFor(() => {
      expect(screen.getByText('Registration failed')).toBeInTheDocument();
    });
  });

  it('clears error message when switching tabs', async () => {
    const user = userEvent.setup();

    // Mock the register API to return an error
    const error: ApiError = {
      message: 'email already registered',
      statusCode: 409,
    };
    (authApi.register as Mock).mockRejectedValue(error);

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in and submit the form to trigger error
    await user.type(screen.getByLabelText(/display name/i), 'TestUser');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('email already registered')).toBeInTheDocument();
    });

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Verify error message is cleared
    expect(screen.queryByText('email already registered')).not.toBeInTheDocument();
  });

  it('allows user to retry registration after fixing the error', async () => {
    const user = userEvent.setup();

    // First call fails, second succeeds
    const error: ApiError = {
      message: 'email already registered',
      statusCode: 409,
    };
    (authApi.register as Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        token: 'new-token',
        user: {
          id: 'user-123',
          displayName: 'TestUser',
          email: 'newemail@example.com',
          isGuest: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      });

    const onOpenChange = vi.fn();

    render(
      <AuthModal open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // First attempt with existing email
    await user.type(screen.getByLabelText(/display name/i), 'TestUser');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText('email already registered')).toBeInTheDocument();
    });

    // Correct the email and retry
    const emailInput = screen.getByLabelText(/email/i);
    await user.clear(emailInput);
    await user.type(emailInput, 'newemail@example.com');
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Wait for successful registration (modal closes)
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Verify both API calls were made
    expect(authApi.register).toHaveBeenCalledTimes(2);
    expect(authApi.register).toHaveBeenLastCalledWith({
      displayName: 'TestUser',
      email: 'newemail@example.com',
      password: 'password123',
    });
  });

  it('displays error for other validation failures', async () => {
    const user = userEvent.setup();

    // Mock validation error (e.g., password too short)
    const validationError: ApiError = {
      message: 'password must be at least 6 characters',
      statusCode: 400,
    };
    (authApi.register as Mock).mockRejectedValue(validationError);

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Fill in with invalid password
    await user.type(screen.getByLabelText(/display name/i), 'TestUser');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), '123');
    await user.click(screen.getByRole('button', { name: /register/i }));

    // Wait for validation error message
    await waitFor(() => {
      expect(screen.getByText('password must be at least 6 characters')).toBeInTheDocument();
    });
  });
});

describe('AuthModal - User Login with Credentials (AUTH-03)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully logs in a user with valid credentials', async () => {
    const user = userEvent.setup();

    // Mock successful login response
    (authApi.login as Mock).mockResolvedValue({
      token: 'login-token-123',
      user: {
        id: 'user-456',
        displayName: 'John Doe',
        email: 'john@example.com',
        isGuest: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    });

    const onOpenChange = vi.fn();

    render(
      <AuthModal open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Verify modal is open
    expect(screen.getByText('Welcome to Crossy!')).toBeInTheDocument();

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Verify login form fields are present
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();

    // Fill in the login form with valid credentials
    await user.type(emailInput, 'john@example.com');
    await user.type(passwordInput, 'password123');

    // Submit the form
    const loginButton = screen.getByRole('button', { name: /^login$/i });
    await user.click(loginButton);

    // Verify the API was called with correct data
    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
      });
    });

    // Verify modal closes after successful login
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('displays error message when login fails with invalid credentials', async () => {
    const user = userEvent.setup();

    // Mock the login API to return an invalid credentials error
    const invalidCredentialsError: ApiError = {
      message: 'invalid credentials',
      statusCode: 401,
    };
    (authApi.login as Mock).mockRejectedValue(invalidCredentialsError);

    const onOpenChange = vi.fn();

    render(
      <AuthModal open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Fill in the login form with invalid credentials
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(emailInput, 'wrong@example.com');
    await user.type(passwordInput, 'wrongpassword');

    // Submit the form
    const loginButton = screen.getByRole('button', { name: /^login$/i });
    await user.click(loginButton);

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('invalid credentials')).toBeInTheDocument();
    });

    // Verify the error message is in a styled alert box with proper classes
    const errorAlert = screen.getByText('invalid credentials');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert.className).toContain('text-sm');
    expect(errorAlert.className).toContain('text-destructive');
    expect(errorAlert.className).toContain('bg-destructive/10');

    // Verify the API was called with provided data
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'wrong@example.com',
      password: 'wrongpassword',
    });

    // Verify modal stays open after error
    expect(screen.getByText('Welcome to Crossy!')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Verify form fields are still populated
    expect(emailInput).toHaveValue('wrong@example.com');
    expect(passwordInput).toHaveValue('wrongpassword');

    // Verify the login button is enabled again
    expect(loginButton).not.toBeDisabled();
  });

  it('displays generic error message when login fails without specific message', async () => {
    const user = userEvent.setup();

    // Mock the login API to return an error without a message
    (authApi.login as Mock).mockRejectedValue(new Error(''));

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    const loginButton = screen.getByRole('button', { name: /^login$/i });
    await user.click(loginButton);

    // Wait for generic error message
    await waitFor(() => {
      expect(screen.getByText('Login failed')).toBeInTheDocument();
    });
  });

  it('shows loading state while login is in progress', async () => {
    const user = userEvent.setup();

    // Mock the login API with a delayed response
    (authApi.login as Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        token: 'token',
        user: {
          id: 'user-123',
          displayName: 'Test User',
          email: 'test@example.com',
          isGuest: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      }), 100))
    );

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Fill in the form
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    // Submit the form
    const loginButton = screen.getByRole('button', { name: /^login$/i });
    await user.click(loginButton);

    // Verify loading state appears
    await waitFor(() => {
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
    });

    // Verify button is disabled during loading
    expect(loginButton).toBeDisabled();
  });

  it('allows user to retry login after error', async () => {
    const user = userEvent.setup();

    // First call fails, second succeeds
    const error: ApiError = {
      message: 'invalid credentials',
      statusCode: 401,
    };
    (authApi.login as Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        token: 'correct-token',
        user: {
          id: 'user-789',
          displayName: 'Jane Smith',
          email: 'jane@example.com',
          isGuest: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      });

    const onOpenChange = vi.fn();

    render(
      <AuthModal open={true} onOpenChange={onOpenChange} />,
      { wrapper: createWrapper() }
    );

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // First attempt with wrong password
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Wait for error
    await waitFor(() => {
      expect(screen.getByText('invalid credentials')).toBeInTheDocument();
    });

    // Correct the password and retry
    const passwordInput = screen.getByLabelText(/password/i);
    await user.clear(passwordInput);
    await user.type(passwordInput, 'correctpass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Wait for successful login (modal closes)
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    // Verify both API calls were made
    expect(authApi.login).toHaveBeenCalledTimes(2);
    expect(authApi.login).toHaveBeenLastCalledWith({
      email: 'jane@example.com',
      password: 'correctpass',
    });
  });

  it('clears error message when switching from login to another tab', async () => {
    const user = userEvent.setup();

    // Mock the login API to return an error
    const error: ApiError = {
      message: 'invalid credentials',
      statusCode: 401,
    };
    (authApi.login as Mock).mockRejectedValue(error);

    render(
      <AuthModal open={true} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    // Switch to Login tab
    const loginTab = screen.getByRole('tab', { name: /login/i });
    await user.click(loginTab);

    // Fill in and submit the form to trigger error
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^login$/i }));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('invalid credentials')).toBeInTheDocument();
    });

    // Switch to Register tab
    const registerTab = screen.getByRole('tab', { name: /register/i });
    await user.click(registerTab);

    // Verify error message is cleared
    expect(screen.queryByText('invalid credentials')).not.toBeInTheDocument();
  });
});
