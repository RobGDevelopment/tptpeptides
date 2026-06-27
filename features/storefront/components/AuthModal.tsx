import React from 'react';
import { Icons } from '../../../components/icons';
import { MetallicBeam } from '../../../components/ui/MetallicBeam';
import { Modal } from '../../../components/ui/Modal';
import { ClientPortalForm } from '../../auth/components/ClientPortalForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute top-6 right-6 text-muted hover:text-gold transition-colors"
        aria-label="Close"
      >
        <Icons.X />
      </button>
      <p className="text-[10px] tracking-caps uppercase metallic-gold font-medium">TPT Peptides</p>
      <h2 className="text-lg font-light text-primary tracking-title uppercase mt-3 mb-2">Client Portal</h2>
      <MetallicBeam variant="horizontal" className="mb-6 max-w-24" animated={false} />
      <p className="text-sm text-secondary font-light mb-8">
        Access your lab results, orders, and active protocols.
      </p>
      <ClientPortalForm onSuccess={onClose} />
    </Modal>
  );
}
