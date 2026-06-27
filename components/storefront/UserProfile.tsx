'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../features/auth/providers/AuthProvider';
import { calculateUserTier } from '../../lib/business/loyalty';
import { shippingAddressSchema, type ShippingAddress } from '../../lib/schemas/user';
import { Spinner } from '../ui/Spinner';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { HeaderDividerBeam } from '../ui/HeaderDividerBeam';
import { CoaViewer } from '../../features/compliance/components/CoaViewer';

interface OrderRow {
  id: string;
  total: number;
  status: string;
  poNumber: string | null;
  createdAt: string | null;
  items: { name: string; tag: string; quantity: number; price: number }[];
  loyaltyPointsAwarded: number;
}

interface AccountProfile {
  email: string | null;
  loyaltyPoints: number;
  totalPointsEarned: number;
  shippingAddress: ShippingAddress | null;
  institutionVerified: boolean;
  institutionTier?: string | null;
  modules?: {
    institutionVerification: boolean;
  };
}

export function UserProfile() {
  const { user, loading, signOut, isAdmin } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShippingAddress>({
    resolver: zodResolver(shippingAddressSchema) as never,
    defaultValues: { country: 'US' },
  });

  useEffect(() => {
    if (!user) return;

    void (async () => {
      try {
        const response = await fetch('/api/account/orders');
        if (!response.ok) return;
        const data = (await response.json()) as { orders: OrderRow[]; profile: AccountProfile };
        setOrders(data.orders);
        setProfile(data.profile);
        if (data.profile.shippingAddress) {
          reset(data.profile.shippingAddress);
        }
      } finally {
        setFetching(false);
      }
    })();
  }, [user, reset]);

  const onSaveAddress = async (values: ShippingAddress) => {
    setSaveMessage('');
    const response = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: values }),
    });

    if (response.ok) {
      setSaveMessage('Shipping address saved.');
    } else {
      setSaveMessage('Unable to save address.');
    }
  };

  if (loading || fetching) {
    return <Spinner label="Loading account..." className="py-8" />;
  }

  if (!user || !profile) return null;

  const tier = calculateUserTier(profile.totalPointsEarned);

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-sm tracking-caps uppercase text-primary font-medium mb-2">Client Portal</h2>
            <p className="text-secondary font-light text-sm">{profile.email}</p>
            <p className="text-[10px] tracking-caps uppercase text-gold-light mt-3">
              {tier} Tier · {profile.loyaltyPoints.toLocaleString()} points available
            </p>
            {profile.institutionVerified ? (
              <p className="text-[10px] tracking-caps uppercase text-muted mt-2">
                Institution verified · {profile.institutionTier ?? 'Bronze'} pricing tier
              </p>
            ) : profile.modules?.institutionVerification ? (
              <Link href="/account/verify" className="terminal-link text-[10px] inline-block mt-4">
                Verify Institution for B2B Access
              </Link>
            ) : null}
            {isAdmin ? (
              <Link href="/admin" className="terminal-link text-[10px] inline-block mt-4">
                Open Back-Office Admin
              </Link>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-[10px] tracking-caps uppercase text-muted hover:text-secondary transition-colors"
          >
            Sign Out
          </button>
        </div>
      </Card>

      <Card className="p-8">
        <h3 className="text-sm tracking-caps uppercase text-primary font-medium mb-6">
          Institution Shipping Address
        </h3>
        <form onSubmit={handleSubmit(onSaveAddress)} className="space-y-6">
          <Input label="Institution" {...register('institution')} />
          {errors.institution && <p className="text-red-400/90 text-sm">{errors.institution.message}</p>}
          <Input label="Lab / Department" {...register('labName')} />
          <Input label="Address line 1" {...register('line1')} />
          <Input label="Address line 2" {...register('line2')} />
          <div className="grid sm:grid-cols-3 gap-6">
            <Input label="City" {...register('city')} />
            <Input label="State" {...register('state')} />
            <Input label="Postal code" {...register('postalCode')} />
          </div>
          {saveMessage && <p className="text-sm text-secondary font-light">{saveMessage}</p>}
          <Button type="submit" disabled={isSubmitting}>
            Save Address
          </Button>
        </form>
      </Card>

      <Card className="p-8">
        <h3 className="text-sm tracking-caps uppercase text-primary font-medium mb-6">Order History</h3>
        {orders.length === 0 && (
          <p className="text-secondary font-light text-sm">No orders yet.</p>
        )}
        <div>
          {orders.map((order, index) => (
            <div key={order.id}>
              {index > 0 ? <HeaderDividerBeam contained animated={false} className="my-6" /> : null}
              <div className="py-2 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm text-primary font-light font-mono">
                      Order #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-[10px] tracking-caps uppercase text-muted mt-1 capitalize">
                      {order.status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <p className="metallic-gold font-medium">${order.total.toFixed(2)}</p>
                </div>
                {order.poNumber && (
                  <p className="text-[10px] tracking-caps uppercase text-muted">PO: {order.poNumber}</p>
                )}
                <ul className="text-sm text-secondary font-light space-y-1">
                  {order.items.map((item, itemIndex) => (
                    <li key={`${order.id}-${itemIndex}`}>
                      {item.name} ({item.tag}) ×{item.quantity}
                    </li>
                  ))}
                </ul>
                {(order.status === 'paid' || order.status === 'fulfilled') && (
                  <CoaViewer orderId={order.id} productNames={order.items.map((i) => i.name)} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
