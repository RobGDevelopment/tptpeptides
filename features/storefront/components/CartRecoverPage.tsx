'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spinner } from '../../../components/ui/Spinner';
import { useCartStore } from '../../storefront/stores/useCartStore';

export function CartRecoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const clearCart = useCartStore((state) => state.clearCart);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Recovery link is missing a token.');
      return;
    }

    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/cart/recover/${encodeURIComponent(token)}`);
      const data = (await response.json()) as {
        items?: Array<{
          id: string;
          slug: string;
          name: string;
          tag: string;
          price: number;
          quantity: number;
        }>;
        error?: string;
      };

      if (cancelled) return;

      if (!response.ok || !data.items?.length) {
        setError(data.error ?? 'Unable to restore your cart.');
        return;
      }

      clearCart();
      for (const item of data.items) {
        addItem({
          id: item.id,
          slug: item.slug,
          name: item.name,
          tag: item.tag,
          price: item.price,
          stock: 99,
          desc: '',
          purity: '',
        });
        if (item.quantity > 1) {
          updateQuantity(item.id, item.quantity);
        }
      }

      router.replace('/checkout');
    })();

    return () => {
      cancelled = true;
    };
  }, [addItem, clearCart, router, token, updateQuantity]);

  if (error) {
    return (
      <main className="min-h-screen bg-void pt-28 pb-20 flex items-center justify-center px-4">
        <p className="text-sm text-red-400/90 font-light">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void pt-28 pb-20 flex items-center justify-center">
      <Spinner label="Restoring your cart..." />
    </main>
  );
}
