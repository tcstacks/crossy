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
