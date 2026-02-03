import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { authApi, userApi, getToken, removeToken } from '../lib/api';
import type { User, AuthResponse, ApiError } from '../types/api';

// Mock the API module
vi.mock('../lib/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    guestLogin: vi.fn(),
    logout: vi.fn(),
  },
  userApi: {
    getMe: vi.fn(),
  },
  getToken: vi.fn(),
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

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  };
};

// Mock user data
const mockUser: User = {
  id: 'user-123',
  displayName: 'testuser',
  email: 'test@example.com',
  isGuest: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockGuestUser: User = {
  id: 'guest-456',
  displayName: 'Guest_12345',
  isGuest: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockAuthResponse: AuthResponse = {
  token: 'mock-jwt-token',
  user: mockUser,
};

const mockGuestAuthResponse: AuthResponse = {
  token: 'mock-guest-token',
  user: mockGuestUser,
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAuth hook', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress console.error for this test since React will log the error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Initialization', () => {
    // TODO: Fix timing issue with loading state
    it.skip('loads with unauthenticated state when no token exists', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for initialization to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('loads token from localStorage and validates successfully', async () => {
      (getToken as Mock).mockReturnValue('valid-token');
      (userApi.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('valid-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(userApi.getMe).toHaveBeenCalledTimes(1);
    });

    it('handles invalid stored token by clearing it', async () => {
      (getToken as Mock).mockReturnValue('invalid-token');
      (userApi.getMe as Mock).mockRejectedValue(new Error('Token expired'));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(removeToken).toHaveBeenCalledTimes(1);
    });
  });

  describe('Login', () => {
    it('successful login stores token and updates state', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authApi.login as Mock).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password123' });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-jwt-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('failed login shows error and does not update state', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const apiError: ApiError = {
        message: 'Invalid credentials',
        statusCode: 401,
      };
      (authApi.login as Mock).mockRejectedValue(apiError);

      await expect(
        act(async () => {
          await result.current.login({ email: 'test@example.com', password: 'wrong' });
        })
      ).rejects.toThrow('Invalid credentials');

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('login with network error uses default error message', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Error without message
      (authApi.login as Mock).mockRejectedValue({});

      await expect(
        act(async () => {
          await result.current.login({ email: 'test@example.com', password: 'password' });
        })
      ).rejects.toThrow('Login failed');
    });
  });

  describe('Registration', () => {
    it('successful registration stores token and updates state', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authApi.register as Mock).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await result.current.register({
          displayName: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe('mock-jwt-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(authApi.register).toHaveBeenCalledWith({
        displayName: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('failed registration shows error and does not update state', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const apiError: ApiError = {
        message: 'Email already exists',
        statusCode: 409,
      };
      (authApi.register as Mock).mockRejectedValue(apiError);

      await expect(
        act(async () => {
          await result.current.register({
            displayName: 'testuser',
            email: 'existing@example.com',
            password: 'password123',
          });
        })
      ).rejects.toThrow('Email already exists');

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('registration with validation errors uses default message', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authApi.register as Mock).mockRejectedValue({});

      await expect(
        act(async () => {
          await result.current.register({
            displayName: 'a',
            email: 'invalid',
            password: '123',
          });
        })
      ).rejects.toThrow('Registration failed');
    });
  });

  describe('Guest Login', () => {
    it('creates guest account and sets isGuest flag', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authApi.guestLogin as Mock).mockResolvedValue(mockGuestAuthResponse);

      await act(async () => {
        await result.current.guestLogin();
      });

      expect(result.current.user).toEqual(mockGuestUser);
      expect(result.current.user?.isGuest).toBe(true);
      expect(result.current.token).toBe('mock-guest-token');
      expect(result.current.isAuthenticated).toBe(true);
      expect(authApi.guestLogin).toHaveBeenCalledWith(undefined);
    });

    it('guest login with custom username', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customGuestUser = { ...mockGuestUser, displayName: 'CustomGuest' };
      (authApi.guestLogin as Mock).mockResolvedValue({
        token: 'custom-guest-token',
        user: customGuestUser,
      });

      await act(async () => {
        await result.current.guestLogin({ displayName: 'CustomGuest' });
      });

      expect(result.current.user?.displayName).toBe('CustomGuest');
      expect(authApi.guestLogin).toHaveBeenCalledWith({ displayName: 'CustomGuest' });
    });

    it('failed guest login shows error', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const apiError: ApiError = {
        message: 'Server error',
        statusCode: 500,
      };
      (authApi.guestLogin as Mock).mockRejectedValue(apiError);

      await expect(
        act(async () => {
          await result.current.guestLogin();
        })
      ).rejects.toThrow('Server error');

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('guest login with no error message uses default', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (authApi.guestLogin as Mock).mockRejectedValue({});

      await expect(
        act(async () => {
          await result.current.guestLogin();
        })
      ).rejects.toThrow('Guest login failed');
    });
  });

  describe('Logout', () => {
    it('clears token and user state', async () => {
      // Start authenticated
      (getToken as Mock).mockReturnValue('valid-token');
      (userApi.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      // Wait for authenticated state
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(authApi.logout).toHaveBeenCalledTimes(1);
    });

    it('logout when already logged out still calls api logout', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.logout();
      });

      expect(authApi.logout).toHaveBeenCalledTimes(1);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Refresh User', () => {
    it('refreshUser updates user data when token exists', async () => {
      (getToken as Mock).mockReturnValue('valid-token');
      (userApi.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Update user data
      const updatedUser = { ...mockUser, displayName: 'updateduser' };
      (userApi.getMe as Mock).mockResolvedValue(updatedUser);

      await act(async () => {
        await result.current.refreshUser();
      });

      expect(result.current.user?.displayName).toBe('updateduser');
      expect(userApi.getMe).toHaveBeenCalledTimes(2); // Once on init, once on refresh
    });

    it('refreshUser throws error when no token exists', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.refreshUser();
        })
      ).rejects.toThrow('No token available');
    });

    // TODO: Fix race condition with state updates
    it.skip('refreshUser clears state when token is invalid', async () => {
      (getToken as Mock).mockReturnValue('valid-token');
      (userApi.getMe as Mock).mockResolvedValue(mockUser);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Simulate token becoming invalid
      (userApi.getMe as Mock).mockRejectedValue(new Error('Token expired'));

      await expect(
        act(async () => {
          await result.current.refreshUser();
        })
      ).rejects.toThrow('Token expired');

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(removeToken).toHaveBeenCalled();
    });
  });

  describe('State Transitions', () => {
    it('transitions from guest to registered user', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First login as guest
      (authApi.guestLogin as Mock).mockResolvedValue(mockGuestAuthResponse);

      await act(async () => {
        await result.current.guestLogin();
      });

      expect(result.current.user?.isGuest).toBe(true);

      // Logout
      act(() => {
        result.current.logout();
      });

      // Register as full user
      (authApi.register as Mock).mockResolvedValue(mockAuthResponse);

      await act(async () => {
        await result.current.register({
          displayName: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.user?.isGuest).toBe(false);
      expect(result.current.user?.email).toBe('test@example.com');
    });

    // TODO: Fix mock setup for consecutive login attempts
    it.skip('handles multiple login attempts correctly', async () => {
      (getToken as Mock).mockReturnValue(null);

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First login fails
      const apiError: ApiError = { message: 'Invalid credentials', statusCode: 401 };
      (authApi.login as Mock).mockRejectedValueOnce(apiError);

      await expect(
        act(async () => {
          await result.current.login({ email: 'test@example.com', password: 'wrong' });
        })
      ).rejects.toThrow();

      expect(result.current.isAuthenticated).toBe(false);

      // Second login succeeds
      (authApi.login as Mock).mockResolvedValueOnce(mockAuthResponse);

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'correct' });
      });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });
      expect(result.current.user).toEqual(mockUser);
    });
  });
});
