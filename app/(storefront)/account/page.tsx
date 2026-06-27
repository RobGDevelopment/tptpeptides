'use client';

import { useState } from 'react';
import { ClientPortalForm } from '../../../features/auth/components/ClientPortalForm';
import { UserProfile } from '../../../components/storefront/UserProfile';
import { Card } from '../../../components/ui/Card';
import { Spinner } from '../../../components/ui/Spinner';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { PageHeader } from '../../../components/ui/PageHeader';
import { useAuth } from '../../../features/auth/providers/AuthProvider';
import { SITE_WORDMARK } from '../../../lib/brand';

export default function AccountPage() {
  const { user, loading } = useAuth();
  const [guestEmail, setGuestEmail] = useState('');
  const [guestOrderId, setGuestOrderId] = useState('');
  const [guestOrders, setGuestOrders] = useState<unknown[] | null>(null);
  const [guestError, setGuestError] = useState('');

  const lookupGuestOrder = async () => {
    setGuestError('');
    setGuestOrders(null);
    const params = new URLSearchParams({ email: guestEmail, orderId: guestOrderId });
    const response = await fetch(`/api/account/orders?${params.toString()}`);
    if (!response.ok) {
      setGuestError('Order not found for that email and order ID.');
      return;
    }
    const data = (await response.json()) as { orders: unknown[] };
    setGuestOrders(data.orders);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-16">
      <PageHeader
        wordmark={SITE_WORDMARK}
        title="Client Portal"
        subtitle="Account · Orders · COA Access"
        align="left"
      />

      {loading && <Spinner label="Loading..." className="py-8 mt-8" />}

      {!loading && !user && (
        <div className="space-y-12 mt-12">
          <Card className="p-8">
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">Sign In</h2>
            <p className="text-sm text-secondary font-light mb-8">
              Access order history, loyalty points, saved institution addresses, and COA requests.
            </p>
            <ClientPortalForm />
          </Card>

          <Card className="p-8">
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">Guest Order Lookup</h2>
            <p className="text-sm text-secondary font-light mb-8">
              Look up a guest checkout using the email and order ID from your confirmation.
            </p>
            <div className="space-y-6">
              <Input
                label="Email"
                type="email"
                value={guestEmail}
                onChange={(event) => setGuestEmail(event.target.value)}
              />
              <Input
                label="Order ID"
                value={guestOrderId}
                onChange={(event) => setGuestOrderId(event.target.value)}
              />
              {guestError && <p className="text-red-400/90 text-sm">{guestError}</p>}
              <Button type="button" onClick={lookupGuestOrder}>
                Look Up Order
              </Button>
              {guestOrders && (
                <pre className="text-xs bg-void/80 p-4 overflow-auto text-secondary font-mono border-t border-white/[0.06]">
                  {JSON.stringify(guestOrders, null, 2)}
                </pre>
              )}
            </div>
          </Card>
        </div>
      )}

      {!loading && user && (
        <div className="mt-12">
          <UserProfile />
        </div>
      )}
    </div>
  );
}
