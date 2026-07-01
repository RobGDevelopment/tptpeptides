'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPageHeader } from '../../../components/ui/AdminPageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import type {
  ClinicEncounter,
  ClinicEncounterStatus,
  ClinicEncounterTranscript,
} from '../../../lib/schemas/clinicEncounters';
import {
  createEncounterDraft,
  getEncounterDetail,
  type EncounterDetail,
} from '../actions/encounterActions';
import { EncounterRecorder } from './EncounterRecorder';
import { SoapNoteEditor } from './SoapNoteEditor';

type EncounterCommandCenterProps = {
  providerUid: string;
  providerDisplayName: string;
  encounterId?: string;
  patientId?: string;
  medicalIntakeId?: string | null;
  patientLabel?: string;
};

export function EncounterCommandCenter({
  providerUid,
  providerDisplayName,
  encounterId,
  patientId,
  medicalIntakeId,
  patientLabel,
}: EncounterCommandCenterProps) {
  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(encounterId));
  const [creating, setCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshDetail = useCallback(async (targetEncounterId: string) => {
    setLoading(true);
    setErrorMessage(null);

    const result = await getEncounterDetail(targetEncounterId);
    setLoading(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setDetail(result.data);
  }, []);

  useEffect(() => {
    if (!encounterId) return;
    void refreshDetail(encounterId);
  }, [encounterId, refreshDetail]);

  const handleCreateEncounter = async () => {
    if (!patientId) return;

    setCreating(true);
    setErrorMessage(null);

    const result = await createEncounterDraft({
      patientId,
      medicalIntakeId: medicalIntakeId ?? null,
      providerUid,
      title: patientLabel ? `Telehealth — ${patientLabel}` : 'Telehealth encounter',
      audioExpiresInHours: 24,
    });

    setCreating(false);

    if (!result.ok) {
      setErrorMessage(result.error);
      return;
    }

    setDetail({ encounter: result.data.encounter, transcript: null });
  };

  const handleStatusChange = (status: ClinicEncounterStatus) => {
    setDetail((current) =>
      current ? { ...current, encounter: { ...current.encounter, status } } : current
    );
  };

  const handleTranscriptionReady = () => {
    if (detail?.encounter.id) {
      void refreshDetail(detail.encounter.id);
    }
  };

  const encounter: ClinicEncounter | null = detail?.encounter ?? null;
  const transcript: ClinicEncounterTranscript | null = detail?.transcript ?? null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Provider Encounter Command Center"
        subtitle="Ambient AI capture, SOAP review, and HIPAA-conscious sign-off workflow."
      />

      {patientLabel ? (
        <p className="text-sm text-secondary font-light">
          Patient: <span className="text-primary">{patientLabel}</span>
        </p>
      ) : null}

      {loading ? (
        <Spinner label="Loading encounter…" className="py-16" />
      ) : null}

      {errorMessage ? (
        <div className="rounded-sm border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
          {errorMessage}
        </div>
      ) : null}

      {!encounter && !loading && patientId ? (
        <section className="rounded-sm border border-white/[0.06] bg-surface/20 p-5 space-y-4">
          <p className="text-sm text-secondary font-light">
            Start a new ambient encounter for this patient. Audio uploads are encrypted and purged
            after transcription completes.
          </p>
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateEncounter()}
            className="terminal-link text-sm disabled:opacity-40"
          >
            {creating ? 'Creating encounter…' : 'Begin New Encounter →'}
          </button>
        </section>
      ) : null}

      {encounter ? (
        <>
          <EncounterRecorder
            encounter={encounter}
            providerUid={providerUid}
            onStatusChange={handleStatusChange}
            onTranscriptionReady={handleTranscriptionReady}
          />

          {transcript && (encounter.status === 'review' || encounter.status === 'finalized') ? (
            <SoapNoteEditor
              encounter={encounter}
              transcript={transcript}
              providerDisplayName={providerDisplayName}
              onFinalized={() => void refreshDetail(encounter.id)}
              onDraftSaved={() => void refreshDetail(encounter.id)}
            />
          ) : null}

          {encounter.status === 'processing' && !transcript ? (
            <div className="rounded-sm border border-white/[0.06] bg-surface/20 p-5 text-sm text-secondary font-light">
              Transcription is running. SOAP note editor unlocks when AI processing completes and
              raw audio has been purged.
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
