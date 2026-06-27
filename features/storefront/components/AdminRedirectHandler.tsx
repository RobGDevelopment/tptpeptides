'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../auth/providers/AuthProvider';
import { useCartStore } from '../stores/useCartStore';

/** Handles ?redirect=admin from proxy / AdminGuard — opens sign-in or sends admins to /admin. */
export function AdminRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const openAuth = useCartStore((state) => state.openAuth);
  const handled = useRef(false);

  useEffect(() => {
    if (loading || handled.current) return;
    if (searchParams.get('redirect') !== 'admin') return;

    if (user && isAdmin) {
      handled.current = true;
      router.replace('/admin');
      return;
    }

    if (!user) {
      openAuth();
    }
  }, [loading, user, isAdmin, searchParams, router, openAuth]);

  useEffect(() => {
    if (loading || !user || !isAdmin) return;
    if (searchParams.get('redirect') !== 'admin') return;
    if (handled.current) return;

    handled.current = true;
    router.replace('/admin');
  }, [loading, user, isAdmin, searchParams, router]);

  return null;
}
