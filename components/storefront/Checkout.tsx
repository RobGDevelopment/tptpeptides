'use client';

import React, { useState } from 'react';
import { createOrder, updateProductStock } from '../../lib/firebase/firestore';
import { auth } from '../../lib/firebase/auth';
import type { CartItem } from '../../lib/types';
import { Button } from '../ui/Button';

export const Checkout = ({
  cart,
  onComplete,
  onCancel,
}: {
  cart: CartItem[];
  onComplete: (orderId: string) => void;
  onCancel: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const orderData = {
        userId: auth.currentUser?.uid || 'guest',
        items: cart,
        total,
        timestamp: new Date(),
      };

      const orderId = await createOrder(orderData);

      for (const item of cart) {
        await updateProductStock(item.id, item.stock - item.quantity);
      }

      onComplete(orderId);
    } catch (err) {
      console.error('Checkout failed:', err);
      setError('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between text-sm font-light">
            <span className="text-secondary">
              {item.name} x{item.quantity}
            </span>
            <span className="text-primary">${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-4 border-t border-white/[0.06]">
        <span className="text-[10px] tracking-caps uppercase text-muted">Total</span>
        <span className="metallic-gold font-medium">${total.toFixed(2)}</span>
      </div>

      {error && <p className="text-red-400/90 text-sm">{error}</p>}

      <Button onClick={handleCheckout} disabled={loading} className="w-full justify-center text-sm">
        {loading ? 'Processing...' : 'Complete Purchase'}
      </Button>
      <button type="button" onClick={onCancel} className="terminal-link text-[10px] w-full text-center">
        Back to Cart
      </button>
    </div>
  );
};
