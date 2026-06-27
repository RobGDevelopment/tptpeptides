'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      void import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error);
      });
    }
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-void text-primary flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-2xl font-light tracking-title uppercase">System Interruption</h1>
          <p className="text-secondary font-light text-sm">
            {error.message || 'An unexpected error occurred in the research terminal.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button type="button" onClick={reset} className="terminal-link text-[10px]">
              Retry
            </button>
            <Link href="/" className="terminal-link text-[10px]">
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
