'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../auth/providers/AuthProvider';
import { useCartStore } from '../stores/useCartStore';
import { navigateToAdmin } from '../../../lib/firebase/adminNav';

/** Handles ?redirect=admin from AdminGuard — opens sign-in or sends admins to /admin. */
export function AdminRedirectHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAdmin, loading } = useAuth();
  const openAuth = useCartStore((state) => state.openAuth);
  const handled = useRef(false);

  useEffect(() => {
    if (loading || handled.current) return;
    if (searchParams.get('redirect') !== 'admin') return;

    if (!user) {
      openAuth();
      return;
    }

    if (isAdmin) {
      handled.current = true;
      void navigateToAdmin();
      return;
    }

    handled.current = true;
    router.replace('/');
  }, [loading, user, isAdmin, searchParams, router, openAuth]);

  return null;
}
