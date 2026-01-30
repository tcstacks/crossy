'use client';

import { useState, FormEvent } from 'react';
import { CrossyButton, CrossyInput } from '@/components/crossy';
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
    <div className="w-full max-w-md mx-auto p-6">
      {/* Tabs */}
      <div className="flex bg-crossy-light-purple rounded-full p-1 mb-6 border-2 border-crossy-dark-purple">
        <button
          className={`flex-1 py-2 px-4 rounded-full font-display font-semibold transition-all duration-200 ${
            activeTab === 'login'
              ? 'bg-crossy-purple text-white shadow-md'
              : 'text-crossy-dark-purple hover:text-crossy-purple'
          }`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-full font-display font-semibold transition-all duration-200 ${
            activeTab === 'register'
              ? 'bg-crossy-purple text-white shadow-md'
              : 'text-crossy-dark-purple hover:text-crossy-purple'
          }`}
          onClick={() => setActiveTab('register')}
        >
          Sign Up
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-full font-display font-semibold transition-all duration-200 ${
            activeTab === 'guest'
              ? 'bg-crossy-purple text-white shadow-md'
              : 'text-crossy-dark-purple hover:text-crossy-purple'
          }`}
          onClick={() => setActiveTab('guest')}
        >
          Guest
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-crossy-red/10 border-2 border-crossy-red text-crossy-red rounded-xl flex items-center gap-2 font-display font-semibold">
          <span>⚠️</span>
          {error}
        </div>
      )}

      {/* Login Form */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Email
            </label>
            <CrossyInput
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className={validationErrors.loginEmail ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              required
            />
            {validationErrors.loginEmail && (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.loginEmail}</p>
            )}
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Password
            </label>
            <CrossyInput
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className={validationErrors.loginPassword ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              required
            />
            {validationErrors.loginPassword && (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.loginPassword}</p>
            )}
          </div>
          <CrossyButton
            type="submit"
            disabled={isLoading}
            variant="primary"
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In ✨
              </span>
            )}
          </CrossyButton>
        </form>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Display Name
            </label>
            <CrossyInput
              id="register-name"
              type="text"
              value={registerDisplayName}
              onChange={(e) => setRegisterDisplayName(e.target.value)}
              className={validationErrors.registerDisplayName ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              required
              minLength={2}
              maxLength={50}
            />
            {validationErrors.registerDisplayName && (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.registerDisplayName}</p>
            )}
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Email
            </label>
            <CrossyInput
              id="register-email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className={validationErrors.registerEmail ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              required
            />
            {validationErrors.registerEmail && (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.registerEmail}</p>
            )}
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Password
            </label>
            <CrossyInput
              id="register-password"
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className={validationErrors.registerPassword ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              required
              minLength={6}
            />
            {validationErrors.registerPassword ? (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.registerPassword}</p>
            ) : (
              <p className="mt-1 text-xs font-display text-crossy-dark-purple">
                At least 6 characters
              </p>
            )}
          </div>
          <CrossyButton
            type="submit"
            disabled={isLoading}
            variant="primary"
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white" />
                Creating account...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Account 🎉
              </span>
            )}
          </CrossyButton>
        </form>
      )}

      {/* Guest Form */}
      {activeTab === 'guest' && (
        <form onSubmit={handleGuest} className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="block text-sm font-display font-semibold text-crossy-dark-purple mb-2">
              Display Name
            </label>
            <CrossyInput
              id="guest-name"
              type="text"
              value={guestDisplayName}
              onChange={(e) => setGuestDisplayName(e.target.value)}
              className={validationErrors.guestDisplayName ? 'border-crossy-red focus:border-crossy-red focus:ring-crossy-red' : ''}
              placeholder="Enter your name"
              required
              minLength={2}
              maxLength={50}
            />
            {validationErrors.guestDisplayName ? (
              <p className="mt-1 text-xs font-display text-crossy-red">{validationErrors.guestDisplayName}</p>
            ) : (
              <p className="mt-1 text-xs font-display text-crossy-dark-purple">
                2-50 characters
              </p>
            )}
          </div>
          <CrossyButton
            type="submit"
            disabled={isLoading}
            variant="primary"
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5 border-white" />
                Starting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Play as Guest 🎮
              </span>
            )}
          </CrossyButton>
          <p className="text-center text-sm font-display text-crossy-dark-purple bg-crossy-light-purple p-3 rounded-xl border border-crossy-purple">
            💡 Guest accounts don&apos;t save progress. Sign up to track your stats!
          </p>
        </form>
      )}
    </div>
  );
}
