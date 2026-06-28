'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../../auth/providers/AuthProvider';
import { useCartStore } from '../stores/useCartStore';

const DEBOUNCE_MS = 5000;

export function CartSnapshotTracker() {
  const items = useCartStore((state) => state.items);
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayloadRef = useRef('');

  useEffect(() => {
    if (items.length === 0) return;

    const payload = JSON.stringify({
      items: items.map(({ id, slug, name, tag, price, quantity }) => ({
        id,
        slug,
        name,
        tag,
        price,
        quantity,
      })),
      email: user?.email,
    });

    if (payload === lastPayloadRef.current) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lastPayloadRef.current = payload;
      void fetch('/api/cart/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [items, user?.email]);

  return null;
}
