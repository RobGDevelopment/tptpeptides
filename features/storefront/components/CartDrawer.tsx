'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icons } from '../../../components/icons';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import { TerminalButton } from '../../../components/ui/TerminalButton';
import { estimateShipping } from '../../../lib/shipping/estimate';
import {
  selectCartCount,
  selectCartSubtotal,
  useCartStore,
} from '../stores/useCartStore';

export function CartDrawer() {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const isOpen = useCartStore((state) => state.isOpen);
  const closeCart = useCartStore((state) => state.closeCart);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const subtotal = useCartStore(selectCartSubtotal);
  const itemCount = useCartStore(selectCartCount);
  const shipping = estimateShipping(items.length);
  const total = subtotal + shipping;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={closeCart} />
      <div className="relative w-full max-w-md bg-surface/95 backdrop-blur-md border-l border-white/[0.04] h-full flex flex-col">
        <MetallicBeam variant="top" className="absolute top-0 left-0 right-0" />

        <div className="p-8 flex justify-between items-start">
          <div>
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium">Research Cart</h2>
            <p className="text-[10px] text-muted mt-2 tracking-caps uppercase">
              {itemCount} unit{itemCount === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            className="text-muted hover:text-gold transition-colors"
            aria-label="Close cart"
          >
            <Icons.X />
          </button>
        </div>

        <MetallicBeam variant="horizontal" />

        <div className="flex-1 overflow-y-auto px-8">
          {items.length === 0 ? (
            <div className="text-center mt-24 space-y-6">
              <p className="text-muted text-xs tracking-caps uppercase">Cart empty</p>
              <Link href="/catalog" onClick={closeCart} className="terminal-link text-[10px]">
                Browse Catalog
              </Link>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={item.id}>
                {index > 0 ? <MetallicBeam variant="horizontal" className="my-6" animated={false} /> : null}
                <div className="py-2 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/catalog/${item.slug}`}
                        onClick={closeCart}
                        className="text-sm text-primary hover:text-gold-light transition-colors font-light"
                      >
                        {item.name}
                      </Link>
                      <p className="text-[10px] tracking-caps uppercase text-muted mt-1">{item.tag}</p>
                      <p className="text-sm metallic-gold mt-2">${item.price.toFixed(2)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="text-muted hover:text-gold w-6 h-6 flex items-center justify-center"
                    >
                      −
                    </button>
                    <span className="text-sm font-mono text-secondary w-6 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-muted hover:text-gold w-6 h-6 flex items-center justify-center"
                    >
                      +
                    </button>
                    <span className="ml-auto text-sm text-secondary font-light">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-8 space-y-4">
            <MetallicBeam variant="horizontal" />
            <div className="flex justify-between text-[10px] tracking-caps uppercase text-muted pt-4">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px] tracking-caps uppercase text-muted">
              <span>Shipping + cold chain</span>
              <span>${shipping.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-primary pt-4">
              <span className="tracking-caps uppercase text-[10px]">Estimated total</span>
              <span className="metallic-gold font-medium">${total.toFixed(2)}</span>
            </div>
            <TerminalButton
              onClick={() => {
                closeCart();
                router.push('/checkout');
              }}
              className="mt-4 text-sm"
            >
              Authorize Requisition
            </TerminalButton>
          </div>
        )}
      </div>
    </div>
  );
}
