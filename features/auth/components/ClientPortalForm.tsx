'use client';

import React, { useState } from 'react';
import { loginUser, registerUser, sendPasswordReset } from '../../../lib/firebase/auth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

type AuthMode = 'signin' | 'register';

function formatAuthError(error: unknown, mode: AuthMode): string {
  const code =
    typeof error === 'object' && error != null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'That email is already registered. Sign in instead.';
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
    return 'Firebase API key is invalid. Check NEXT_PUBLIC_FIREBASE_API_KEY in .env.local.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/password sign-in is disabled in Firebase. Enable it under Authentication → Sign-in method.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }

  if (process.env.NODE_ENV === 'development' && code) {
    return mode === 'register' ? `Registration failed (${code}).` : `Sign-in failed (${code}).`;
  }

  return mode === 'register'
    ? 'Registration failed. Email may already be in use.'
    : 'Invalid email or password.';
}

interface ClientPortalFormProps {
  onSuccess?: () => void;
}

export function ClientPortalForm({ onSuccess }: ClientPortalFormProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'register') {
        await registerUser(email, password);
        setMessage('Account created. Check your email to verify your address.');
      } else {
        await loginUser(email, password);
        onSuccess?.();
      }
    } catch (error) {
      setError(formatAuthError(error, mode));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then click Forgot password.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await sendPasswordReset(email);
      setMessage(`Password reset email sent to ${email.trim()}. Check your inbox.`);
    } catch {
      setError('Unable to send reset email. Confirm the address is registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onInput={(e) => setEmail(e.currentTarget.value)}
        placeholder="researcher@lab.com"
        required
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onInput={(e) => setPassword(e.currentTarget.value)}
        placeholder="••••••••"
        minLength={6}
        required
      />
      {mode === 'signin' ? (
        <button
          type="button"
          onClick={() => void handleForgotPassword()}
          disabled={loading}
          className="terminal-link text-[10px]"
        >
          Forgot password?
        </button>
      ) : null}
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {message && <p className="text-green-400 text-sm">{message}</p>}
      <Button type="submit" disabled={loading} className="w-full py-3 mt-2">
        {loading
          ? mode === 'register'
            ? 'Creating account...'
            : 'Authenticating...'
          : mode === 'register'
            ? 'Create Research Account'
            : 'Authenticate'}
      </Button>
      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'register' : 'signin');
          setError('');
          setMessage('');
        }}
        className="w-full terminal-link text-[10px] justify-center"
      >
        {mode === 'signin'
          ? 'Need an account? Register for lab access'
          : 'Already registered? Sign in'}
      </button>
    </form>
  );
}
