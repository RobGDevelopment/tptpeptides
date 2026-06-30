'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { HeaderDividerBeam } from '../../../components/ui/HeaderDividerBeam';
import { Spinner } from '../../../components/ui/Spinner';
import {
  CLINIC_CONSENT_VERSION,
  clinicClinicalQuestionnaireSchema,
  clinicConsentSchema,
  clinicDemographicsSchema,
  clinicIntakeSubmissionSchema,
  toClinicalQuestionnairePayload,
  toPatientProfileRow,
  type ClinicClinicalQuestionnaire,
  type ClinicDemographics,
} from '../../../lib/schemas/clinicIntake';

const CONSENT_BODY =
  'I consent to receive telehealth services from licensed providers affiliated with the OpenLoop MSO network. I understand that telehealth involves the communication of medical information electronically, that I may withdraw consent at any time, and that my information will be handled in accordance with applicable privacy laws.';

const STEPS = ['Demographics', 'Clinical History', 'Informed Consent'] as const;

type StepIndex = 0 | 1 | 2;

const EMPTY_DEMOGRAPHICS: ClinicDemographics = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  phone: '',
  shippingAddress: {
    line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'US',
  },
};

const EMPTY_QUESTIONNAIRE: ClinicClinicalQuestionnaire = {
  medicalHistory: '',
  allergies: '',
  currentMedications: '',
  additionalNotes: '',
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-600">{message}</p>;
}

function parseZodFieldErrors(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  const flat = error.flatten().fieldErrors;
  const out: Record<string, string> = {};
  for (const [key, messages] of Object.entries(flat)) {
    if (messages?.[0]) out[key] = messages[0];
  }
  return out;
}

interface MedicalIntakeWizardProps {
  userId: string;
}

export function MedicalIntakeWizard({ userId }: MedicalIntakeWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<StepIndex>(0);
  const [demographics, setDemographics] = useState<ClinicDemographics>(EMPTY_DEMOGRAPHICS);
  const [questionnaire, setQuestionnaire] = useState<ClinicClinicalQuestionnaire>(EMPTY_QUESTIONNAIRE);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const updateAddress = (field: keyof ClinicDemographics['shippingAddress'], value: string) => {
    setDemographics((prev) => ({
      ...prev,
      shippingAddress: { ...prev.shippingAddress, [field]: value },
    }));
  };

  const validateStep = (index: StepIndex): boolean => {
    setFieldErrors({});

    if (index === 0) {
      const result = clinicDemographicsSchema.safeParse(demographics);
      if (!result.success) {
        setFieldErrors(parseZodFieldErrors(result.error));
        return false;
      }
      return true;
    }

    if (index === 1) {
      const result = clinicClinicalQuestionnaireSchema.safeParse(questionnaire);
      if (!result.success) {
        setFieldErrors(parseZodFieldErrors(result.error));
        return false;
      }
      return true;
    }

    const result = clinicConsentSchema.safeParse({ telehealthConsentAccepted: consentAccepted ? true : undefined });
    if (!result.success) {
      setFieldErrors({ telehealthConsentAccepted: 'You must accept the informed consent to continue' });
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, 2) as StepIndex);
  };

  const goBack = () => {
    setFieldErrors({});
    setStep((current) => Math.max(current - 1, 0) as StepIndex);
  };

  const handleSubmit = async () => {
    setSubmitError('');

    const payload = {
      demographics,
      clinicalQuestionnaire: questionnaire,
      consent: { telehealthConsentAccepted: consentAccepted as true },
    };

    const validated = clinicIntakeSubmissionSchema.safeParse(payload);
    if (!validated.success) {
      setFieldErrors(parseZodFieldErrors(validated.error));
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      const submittedAt = new Date().toISOString();
      const profileRow = toPatientProfileRow(userId, validated.data.demographics);
      const questionnairePayload = toClinicalQuestionnairePayload(validated.data.clinicalQuestionnaire);

      const { error: profileError } = await supabase.from('patient_profiles').upsert(profileRow, {
        onConflict: 'id',
      });
      if (profileError) throw profileError;

      const { error: consentError } = await supabase.from('telehealth_consents').insert({
        patient_id: userId,
        consent_version: CLINIC_CONSENT_VERSION,
        agreed_at: submittedAt,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 2048) : null,
      });
      if (consentError) throw consentError;

      const { error: intakeError } = await supabase.from('medical_intakes').insert({
        patient_id: userId,
        status: 'submitted',
        clinical_questionnaire: questionnairePayload,
        submitted_at: submittedAt,
      });
      if (intakeError) throw intakeError;

      setCompleted(true);
      router.refresh();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unable to submit intake. Please try again.';
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="mx-auto max-w-2xl pt-28 pb-20 px-4 text-center space-y-4">
        <h1 className="admin-heading text-2xl">Intake Submitted</h1>
        <p className="text-secondary font-light">
          Your medical intake has been securely recorded. A licensed provider will review your information shortly.
        </p>
        <Button type="button" onClick={() => router.push('/')}>
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pt-28 pb-20 px-4 sm:px-6">
      <div className="space-y-2 text-center mb-8">
        <p className="text-[10px] tracking-caps uppercase text-muted">
          Step {step + 1} of {STEPS.length} — {STEPS[step]}
        </p>
        <h1 className="admin-heading text-2xl">Medical Intake</h1>
        <p className="text-sm text-secondary font-light">
          Complete all steps to submit your information for provider review.
        </p>
      </div>

      <HeaderDividerBeam delay={1} className="mb-8" />

      <div className="space-y-6 rounded-sm border border-black/[0.08] bg-surface/60 p-6 sm:p-8">
        {step === 0 ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="First Name"
                  value={demographics.firstName}
                  onChange={(event) =>
                    setDemographics((prev) => ({ ...prev, firstName: event.target.value }))
                  }
                  autoComplete="given-name"
                  required
                />
                <FieldError message={fieldErrors.firstName} />
              </div>
              <div>
                <Input
                  label="Last Name"
                  value={demographics.lastName}
                  onChange={(event) =>
                    setDemographics((prev) => ({ ...prev, lastName: event.target.value }))
                  }
                  autoComplete="family-name"
                  required
                />
                <FieldError message={fieldErrors.lastName} />
              </div>
            </div>
            <div>
              <Input
                label="Date of Birth"
                type="date"
                value={demographics.dateOfBirth}
                onChange={(event) =>
                  setDemographics((prev) => ({ ...prev, dateOfBirth: event.target.value }))
                }
                required
              />
              <FieldError message={fieldErrors.dateOfBirth} />
            </div>
            <div>
              <Input
                label="Phone"
                type="tel"
                value={demographics.phone}
                onChange={(event) => setDemographics((prev) => ({ ...prev, phone: event.target.value }))}
                autoComplete="tel"
                required
              />
              <FieldError message={fieldErrors.phone} />
            </div>
            <div className="pt-2 space-y-4 border-t border-black/[0.06]">
              <p className="text-[10px] tracking-caps uppercase text-muted">Shipping Address</p>
              <Input
                label="Address Line 1"
                value={demographics.shippingAddress.line1}
                onChange={(event) => updateAddress('line1', event.target.value)}
                autoComplete="address-line1"
                required
              />
              <Input
                label="Address Line 2 (optional)"
                value={demographics.shippingAddress.line2 ?? ''}
                onChange={(event) => updateAddress('line2', event.target.value)}
                autoComplete="address-line2"
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="City"
                  value={demographics.shippingAddress.city}
                  onChange={(event) => updateAddress('city', event.target.value)}
                  autoComplete="address-level2"
                  required
                />
                <Input
                  label="State"
                  value={demographics.shippingAddress.state}
                  onChange={(event) => updateAddress('state', event.target.value.toUpperCase())}
                  maxLength={2}
                  autoComplete="address-level1"
                  required
                />
                <Input
                  label="Postal Code"
                  value={demographics.shippingAddress.postal_code}
                  onChange={(event) => updateAddress('postal_code', event.target.value)}
                  autoComplete="postal-code"
                  required
                />
              </div>
              <FieldError message={fieldErrors.shippingAddress} />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            {(
              [
                ['medicalHistory', 'Medical History', 'Summarize relevant conditions, surgeries, or diagnoses.'],
                ['allergies', 'Allergies', 'List known allergies or enter "None".'],
                ['currentMedications', 'Current Medications', 'List medications and supplements or enter "None".'],
                ['additionalNotes', 'Additional Notes (optional)', 'Anything else your provider should know.'],
              ] as const
            ).map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="text-[10px] tracking-caps uppercase text-muted block mb-2">{label}</label>
                <textarea
                  className="terminal-input min-h-[96px] w-full resize-y"
                  placeholder={placeholder}
                  value={questionnaire[key]}
                  onChange={(event) =>
                    setQuestionnaire((prev) => ({ ...prev, [key]: event.target.value }))
                  }
                  required={key !== 'additionalNotes'}
                />
                <FieldError message={fieldErrors[key]} />
              </div>
            ))}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-4">
            <p className="text-sm text-secondary font-light leading-relaxed">{CONSENT_BODY}</p>
            <p className="text-[10px] tracking-caps uppercase text-muted">
              Consent version: {CLINIC_CONSENT_VERSION}
            </p>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={consentAccepted}
                onChange={(event) => setConsentAccepted(event.target.checked)}
              />
              <span className="text-sm text-primary">
                I have read and agree to the informed consent for telehealth services.
              </span>
            </label>
            <FieldError message={fieldErrors.telehealthConsentAccepted} />
          </div>
        ) : null}

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-black/[0.06]">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={goBack} disabled={submitting}>
              Back
            </Button>
          ) : null}
          {step < 2 ? (
            <Button type="button" onClick={goNext}>
              Continue
            </Button>
          ) : (
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Intake'}
            </Button>
          )}
          {submitting ? <Spinner label="Saving secure intake…" /> : null}
        </div>
      </div>
    </div>
  );
}
