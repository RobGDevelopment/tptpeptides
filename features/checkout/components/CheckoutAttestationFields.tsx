'use client';

import { B2B_ATTESTATION_PHRASE, RESEARCH_INTENT_OPTIONS } from '../../../lib/schemas/attestation';
import type { FieldErrors, UseFormRegister } from 'react-hook-form';
import type { CheckoutTypedAttestationFormValues } from '../../../lib/schemas/checkout';

interface CheckoutAttestationFieldsProps {
  register: UseFormRegister<CheckoutTypedAttestationFormValues>;
  errors: FieldErrors<CheckoutTypedAttestationFormValues>;
}

export function CheckoutAttestationFields({ register, errors }: CheckoutAttestationFieldsProps) {
  return (
    <div className="space-y-6 border-b border-white/[0.06] pb-6">
      <div>
        <p className="text-[10px] tracking-caps uppercase text-muted mb-2">Research intent</p>
        <select
          {...register('researchIntent')}
          className="w-full bg-transparent border border-white/[0.12] text-sm text-primary font-light px-4 py-3 focus:outline-none focus:border-gold/40"
          defaultValue=""
        >
          <option value="" disabled>
            Select your institution type
          </option>
          {RESEARCH_INTENT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.researchIntent && (
          <p className="text-red-400/90 text-sm mt-2">{errors.researchIntent.message}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] tracking-caps uppercase text-muted mb-2">
          Typed legal attestation (exact phrase)
        </p>
        <p className="text-xs text-secondary font-light leading-relaxed mb-3 border border-white/[0.08] px-4 py-3">
          {B2B_ATTESTATION_PHRASE}
        </p>
        <textarea
          {...register('typedSignature')}
          rows={3}
          placeholder="Type the phrase above exactly"
          className="w-full bg-transparent border border-white/[0.12] text-sm text-primary font-light px-4 py-3 focus:outline-none focus:border-gold/40 resize-y min-h-[96px]"
        />
        {errors.typedSignature && (
          <p className="text-red-400/90 text-sm mt-2">{errors.typedSignature.message}</p>
        )}
      </div>
    </div>
  );
}
