'use client';

import { useState } from 'react';
import type {
  PatientPortalProfile,
  PatientPortalShippingAddress,
} from '../../../lib/schemas/clinicPatientPortal';
import { PatientProfileForm } from './PatientProfileForm';

function formatPatientName(firstName: string | null, lastName: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

function formatDob(value: string | null): string {
  if (!value) return '—';
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    dateStyle: 'medium',
  });
}

function formatShippingAddress(address: PatientPortalShippingAddress | null): string {
  if (!address) return '—';

  const lines = [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', '),
    address.postal_code,
    address.country,
  ].filter((line) => line && line.trim().length > 0);

  return lines.length > 0 ? lines.join('\n') : '—';
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-caps uppercase text-muted mb-1">{label}</dt>
      <dd className="text-sm text-primary whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

export function PatientProfileSection({ profile }: { profile: PatientPortalProfile }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-start justify-end gap-4 -mt-1 mb-1">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="text-[10px] tracking-caps uppercase text-secondary hover:text-primary transition-colors"
        >
          Edit Info
        </button>
      </div>

      <dl className="space-y-4">
        <DataField
          label="Name"
          value={formatPatientName(profile.firstName, profile.lastName)}
        />
        <DataField label="Date of Birth" value={formatDob(profile.dateOfBirth)} />
        <DataField label="Phone" value={profile.phone?.trim() || '—'} />
        <DataField
          label="Shipping Address"
          value={formatShippingAddress(profile.shippingAddress)}
        />
      </dl>

      <PatientProfileForm
        profile={profile}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
