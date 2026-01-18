'use client';

import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';
import { useGameStore } from '@/store/gameStore';

interface AuthFormsProps {
  onSuccess?: () => void;
  defaultTab?: 'login' | 'register' | 'guest';
}

export function AuthForms({ onSuccess, defaultTab = 'login' }: AuthFormsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUser = useGameStore((state) => state.setUser);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerDisplayName, setRegisterDisplayName] = useState('');

  // Guest form state
  const [guestDisplayName, setGuestDisplayName] = useState('');

  // Validation errors
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!loginEmail.trim()) {
      errors.loginEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      errors.loginEmail = 'Please enter a valid email';
    }
    if (!loginPassword) {
      errors.loginPassword = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.login(loginEmail, loginPassword);
      api.setToken(response.token);
      setUser(response.user, response.token);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!registerDisplayName.trim()) {
      errors.registerDisplayName = 'Display name is required';
    } else if (registerDisplayName.trim().length < 2) {
      errors.registerDisplayName = 'Display name must be at least 2 characters';
    } else if (registerDisplayName.trim().length > 50) {
      errors.registerDisplayName = 'Display name must be 50 characters or less';
    }
    if (!registerEmail.trim()) {
      errors.registerEmail = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      errors.registerEmail = 'Please enter a valid email';
    }
    if (!registerPassword) {
      errors.registerPassword = 'Password is required';
    } else if (registerPassword.length < 6) {
      errors.registerPassword = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.register(
        registerEmail,
        registerPassword,
        registerDisplayName
      );
      api.setToken(response.token);
      setUser(response.user, response.token);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuest = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setValidationErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (!guestDisplayName.trim()) {
      errors.guestDisplayName = 'Display name is required';
    } else if (guestDisplayName.trim().length < 2) {
      errors.guestDisplayName = 'Display name must be at least 2 characters';
    } else if (guestDisplayName.trim().length > 50) {
      errors.guestDisplayName = 'Display name must be 50 characters or less';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.guest(guestDisplayName);
      api.setToken(response.token);
      setUser(response.user, response.token);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Tabs */}
      <div className="flex bg-purple-50 rounded-full p-1 mb-6">
        <button
          className={`flex-1 py-2 px-4 rounded-full font-medium transition-all duration-200 ${
            activeTab === 'login'
              ? 'bg-white text-purple-700 shadow-md'
              : 'text-purple-500 hover:text-purple-700'
          }`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-full font-medium transition-all duration-200 ${
            activeTab === 'register'
              ? 'bg-white text-purple-700 shadow-md'
              : 'text-purple-500 hover:text-purple-700'
          }`}
          onClick={() => setActiveTab('register')}
        >
          Sign Up
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-full font-medium transition-all duration-200 ${
            activeTab === 'guest'
              ? 'bg-white text-purple-700 shadow-md'
              : 'text-purple-500 hover:text-purple-700'
          }`}
          onClick={() => setActiveTab('guest')}
        >
          Guest
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2">
          <span>😅</span>
          {error}
        </div>
      )}

      {/* Login Form */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-purple-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className={`input ${validationErrors.loginEmail ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
            />
            {validationErrors.loginEmail && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.loginEmail}</p>
            )}
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-purple-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={`input ${validationErrors.loginPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
            />
            {validationErrors.loginPassword && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.loginPassword}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white/30 border-t-white" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In
                <span>✨</span>
              </span>
            )}
          </button>
        </form>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium text-purple-700 mb-1">
              Display Name
            </label>
            <input
              id="register-name"
              type="text"
              value={registerDisplayName}
              onChange={(e) => setRegisterDisplayName(e.target.value)}
              className={`input ${validationErrors.registerDisplayName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
              minLength={2}
              maxLength={50}
            />
            {validationErrors.registerDisplayName && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.registerDisplayName}</p>
            )}
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-purple-700 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className={`input ${validationErrors.registerEmail ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
            />
            {validationErrors.registerEmail && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.registerEmail}</p>
            )}
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-purple-700 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className={`input ${validationErrors.registerPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              required
              minLength={6}
            />
            {validationErrors.registerPassword ? (
              <p className="mt-1 text-xs text-red-600">{validationErrors.registerPassword}</p>
            ) : (
              <p className="mt-1 text-xs text-purple-500">
                At least 6 characters
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white/30 border-t-white" />
                Creating account...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Account
                <span>🎉</span>
              </span>
            )}
          </button>
        </form>
      )}

      {/* Guest Form */}
      {activeTab === 'guest' && (
        <form onSubmit={handleGuest} className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="block text-sm font-medium text-purple-700 mb-1">
              Display Name
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestDisplayName}
              onChange={(e) => setGuestDisplayName(e.target.value)}
              className={`input ${validationErrors.guestDisplayName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Enter your name"
              required
              minLength={2}
              maxLength={50}
            />
            {validationErrors.guestDisplayName ? (
              <p className="mt-1 text-xs text-red-600">{validationErrors.guestDisplayName}</p>
            ) : (
              <p className="mt-1 text-xs text-purple-500">
                2-50 characters
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white/30 border-t-white" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Play as Guest
                <span>🎮</span>
              </span>
            )}
          </button>
          <p className="text-center text-sm text-purple-500 bg-purple-50 p-3 rounded-2xl">
            💡 Guest accounts don&apos;t save progress. Sign up to track your stats!
          </p>
        </form>
      )}
    </div>
  );
}
