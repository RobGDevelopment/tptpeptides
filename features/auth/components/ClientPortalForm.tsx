'use client';

import React, { useState } from 'react';
import { loginUser, registerUser } from '../../../lib/firebase/auth';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';

type AuthMode = 'signin' | 'register';

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
    } catch {
      setError(
        mode === 'register'
          ? 'Registration failed. Email may already be in use.'
          : 'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="researcher@lab.com"
        required
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        minLength={6}
        required
      />
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
