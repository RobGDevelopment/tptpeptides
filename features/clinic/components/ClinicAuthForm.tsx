'use client';

import { useState } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Spinner } from '../../../components/ui/Spinner';

type AuthMode = 'signin' | 'signup';

function formatAuthError(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password.';
  }
  if (message.includes('User already registered')) {
    return 'That email is already registered. Sign in instead.';
  }
  return message;
}

export function ClinicAuthForm({
  title = 'Clinic Portal Access',
  subtitle = 'Sign in or create an account to begin your secure medical intake.',
}: {
  title?: string;
  subtitle?: string;
}) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (signUpError) throw signUpError;
        setMessage('Account created. If email confirmation is enabled, check your inbox before continuing.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      const msg = caught instanceof Error ? caught.message : 'Authentication failed.';
      setError(formatAuthError(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8 pt-28 pb-20 px-4">
      <div className="text-center space-y-2">
        <h1 className="admin-heading text-2xl">{title}</h1>
        <p className="text-sm text-secondary font-light">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-sm border border-black/[0.08] bg-surface/60 p-6">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-secondary">{message}</p> : null}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Button>
          <button
            type="button"
            className="text-xs tracking-caps uppercase text-muted hover:text-secondary transition-colors"
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ClinicAuthLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pt-28">
      <Spinner label="Loading secure session…" />
    </div>
  );
}
