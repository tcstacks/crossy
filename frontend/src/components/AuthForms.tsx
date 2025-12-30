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

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

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

    try {
      const response = await api.guest(guestDisplayName || 'Guest');
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
      <div className="flex border-b mb-6">
        <button
          className={`flex-1 py-3 font-medium transition-colors ${
            activeTab === 'login'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('login')}
        >
          Sign In
        </button>
        <button
          className={`flex-1 py-3 font-medium transition-colors ${
            activeTab === 'register'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('register')}
        >
          Sign Up
        </button>
        <button
          className={`flex-1 py-3 font-medium transition-colors ${
            activeTab === 'guest'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('guest')}
        >
          Guest
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Login Form */}
      {activeTab === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5" />
                Signing in...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      )}

      {/* Register Form */}
      {activeTab === 'register' && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="register-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name
            </label>
            <input
              id="register-name"
              type="text"
              value={registerDisplayName}
              onChange={(e) => setRegisterDisplayName(e.target.value)}
              className="input"
              required
              minLength={2}
              maxLength={50}
            />
          </div>
          <div>
            <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div>
            <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              className="input"
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-gray-500">
              At least 6 characters
            </p>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5" />
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
      )}

      {/* Guest Form */}
      {activeTab === 'guest' && (
        <form onSubmit={handleGuest} className="space-y-4">
          <div>
            <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name (optional)
            </label>
            <input
              id="guest-name"
              type="text"
              value={guestDisplayName}
              onChange={(e) => setGuestDisplayName(e.target.value)}
              className="input"
              placeholder="Guest"
              maxLength={50}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="spinner w-5 h-5" />
                Starting...
              </span>
            ) : (
              'Play as Guest'
            )}
          </button>
          <p className="text-center text-sm text-gray-500">
            Guest accounts don&apos;t save progress. Sign up to track your stats!
          </p>
        </form>
      )}
    </div>
  );
}
