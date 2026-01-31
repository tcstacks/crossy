import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { authApi, userApi, getToken, removeToken } from '../lib/api';
import type { User, RegisterRequest, LoginRequest, GuestLoginRequest, ApiError } from '../types/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  guestLogin: (data?: GuestLoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from token on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();

      if (!token) {
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      try {
        // Fetch user profile using existing token
        const user = await userApi.getMe();
        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        // Token is invalid or expired
        removeToken();
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  // Token refresh logic
  const refreshUser = useCallback(async () => {
    const token = getToken();

    if (!token) {
      throw new Error('No token available');
    }

    try {
      const user = await userApi.getMe();
      setAuthState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
      }));
    } catch (error) {
      // Token expired or invalid
      removeToken();
      setAuthState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      throw error;
    }
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    try {
      const response = await authApi.login(credentials);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Login failed');
    }
  }, []);

  const register = useCallback(async (credentials: RegisterRequest) => {
    try {
      const response = await authApi.register(credentials);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Registration failed');
    }
  }, []);

  const guestLogin = useCallback(async (data?: GuestLoginRequest) => {
    try {
      const response = await authApi.guestLogin(data);
      setAuthState({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      const apiError = error as ApiError;
      throw new Error(apiError.message || 'Guest login failed');
    }
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const value: AuthContextValue = {
    ...authState,
    login,
    register,
    guestLogin,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
