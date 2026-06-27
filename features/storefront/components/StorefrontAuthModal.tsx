'use client';

import { AuthModal } from './AuthModal';
import { useCartStore } from '../stores/useCartStore';

export function StorefrontAuthModal() {
  const isAuthOpen = useCartStore((state) => state.isAuthOpen);
  const closeAuth = useCartStore((state) => state.closeAuth);

  return <AuthModal isOpen={isAuthOpen} onClose={closeAuth} />;
}
