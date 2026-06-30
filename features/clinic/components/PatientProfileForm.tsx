'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updatePatientProfile } from '../actions/patientPortalActions';
import type {
  PatientPortalProfile,
  PatientPortalShippingAddress,
} from '../../../lib/schemas/clinicPatientPortal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';

type ToastState = { type: 'success' | 'error'; message: string };

const EMPTY_ADDRESS: PatientPortalShippingAddress = {
  line1: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US',
};

function profileToFormState(profile: PatientPortalProfile) {
  return {
    phone: profile.phone ?? '',
    shippingAddress: {
      line1: profile.shippingAddress?.line1 ?? '',
      line2: profile.shippingAddress?.line2 ?? '',
      city: profile.shippingAddress?.city ?? '',
      state: profile.shippingAddress?.state ?? '',
      postal_code: profile.shippingAddress?.postal_code ?? '',
      country: profile.shippingAddress?.country ?? 'US',
    },
  };
}

export function PatientProfileForm({
  profile,
  open,
  onClose,
}: {
  profile: PatientPortalProfile;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [shippingAddress, setShippingAddress] = useState<PatientPortalShippingAddress>(
    profile.shippingAddress ?? EMPTY_ADDRESS
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const formState = profileToFormState(profile);
    setPhone(formState.phone);
    setShippingAddress(formState.shippingAddress);
    setToast(null);
  }, [open, profile]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateAddress = (field: keyof PatientPortalShippingAddress, value: string) => {
    setShippingAddress((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setToast(null);

    startTransition(async () => {
      const result = await updatePatientProfile({
        phone,
        shippingAddress: {
          line1: shippingAddress.line1 ?? '',
          city: shippingAddress.city ?? '',
          state: shippingAddress.state ?? '',
          postal_code: shippingAddress.postal_code ?? '',
          country: shippingAddress.country ?? 'US',
          ...(shippingAddress.line2?.trim() ? { line2: shippingAddress.line2.trim() } : {}),
        },
      });

      if (!result.ok) {
        setToast({ type: 'error', message: result.error });
        return;
      }

      setToast({ type: 'success', message: 'Profile updated successfully.' });
      onClose();
      router.refresh();
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="bg-[#fcfcfc] border-black/[0.08] max-w-lg w-[calc(100%-2rem)] p-6 sm:p-8"
    >
      <div className="space-y-6">
        <div>
          <h2 className="admin-heading text-xl">Edit Contact Info</h2>
          <p className="text-sm text-secondary font-light mt-1">
            Legal name and date of birth are locked for medical record integrity. Contact support
            to request changes.
          </p>
        </div>

        {toast ? (
          <div
            role="status"
            className={`rounded-sm border px-4 py-3 text-sm ${
              toast.type === 'success'
                ? 'border-gold-light/30 bg-gold-light/5 text-gold-light'
                : 'border-red-500/30 bg-red-500/5 text-red-600'
            }`}
          >
            {toast.message}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="First Name"
            value={profile.firstName ?? ''}
            disabled
            readOnly
            className="opacity-60 cursor-not-allowed"
          />
          <Input
            label="Last Name"
            value={profile.lastName ?? ''}
            disabled
            readOnly
            className="opacity-60 cursor-not-allowed"
          />
          <Input
            label="Date of Birth"
            value={profile.dateOfBirth ?? ''}
            disabled
            readOnly
            className="opacity-60 cursor-not-allowed"
          />
          <Input
            label="Phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            required
          />

          <div className="space-y-4 border-t border-black/[0.06] pt-4">
            <p className="text-[10px] tracking-caps uppercase text-muted">Shipping Address</p>
            <Input
              label="Address Line 1"
              value={shippingAddress.line1 ?? ''}
              onChange={(event) => updateAddress('line1', event.target.value)}
              autoComplete="address-line1"
              required
            />
            <Input
              label="Address Line 2 (optional)"
              value={shippingAddress.line2 ?? ''}
              onChange={(event) => updateAddress('line2', event.target.value)}
              autoComplete="address-line2"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="City"
                value={shippingAddress.city ?? ''}
                onChange={(event) => updateAddress('city', event.target.value)}
                autoComplete="address-level2"
                required
              />
              <Input
                label="State"
                value={shippingAddress.state ?? ''}
                onChange={(event) => updateAddress('state', event.target.value.toUpperCase())}
                maxLength={2}
                autoComplete="address-level1"
                required
              />
              <Input
                label="Postal Code"
                value={shippingAddress.postal_code ?? ''}
                onChange={(event) => updateAddress('postal_code', event.target.value)}
                autoComplete="postal-code"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save Changes'}
            </Button>
            <button
              type="button"
              className="text-xs tracking-caps uppercase text-muted hover:text-secondary transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
