'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import type { ClinicEncounter, ClinicEncounterStatus } from '../../../lib/schemas/clinicEncounters';
import { startEncounterTranscription } from '../actions/encounterActions';

type EncounterRecorderProps = {
  encounter: ClinicEncounter;
  providerUid: string;
  onStatusChange?: (status: ClinicEncounterStatus) => void;
  onTranscriptionReady?: () => void;
};

type RecorderPhase = 'idle' | 'recording' | 'uploading' | 'transcribing' | 'complete' | 'error';

function statusBadgeVariant(
  status: ClinicEncounterStatus
): 'success' | 'danger' | 'neutral' {
  if (status === 'review' || status === 'finalized') return 'success';
  if (status === 'failed') return 'danger';
  return 'neutral';
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function EncounterRecorder({
  encounter,
  providerUid,
  onStatusChange,
  onTranscriptionReady,
}: EncounterRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunkIndexRef = useRef(0);

  const [phase, setPhase] = useState<RecorderPhase>(() => {
    if (encounter.status === 'review' || encounter.status === 'finalized') return 'complete';
    if (encounter.status === 'processing') return 'transcribing';
    if (encounter.status === 'failed') return 'error';
    return 'idle';
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(encounter.failureReason);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const canRecord = encounter.status === 'draft' || encounter.status === 'failed';
  const isRecording = phase === 'recording';

  const aiStatusLabel = useMemo(() => {
    if (phase === 'recording') return 'Capturing audio locally';
    if (phase === 'uploading') return 'Secure upload in progress';
    if (phase === 'transcribing' || encounter.status === 'processing') {
      return 'AWS HealthScribe processing';
    }
    if (encounter.status === 'review') return 'AI transcript ready for review';
    if (encounter.status === 'finalized') return 'Encounter finalized — audio purged';
    if (encounter.status === 'failed') return 'Transcription failed';
    return 'Ready to record';
  }, [encounter.status, phase]);

  useEffect(() => {
    if (!isRecording) return undefined;

    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const uploadChunk = useCallback(
    async (blob: Blob, chunkIndex: number, isFinal: boolean) => {
      const formData = new FormData();
      formData.append('encounterId', encounter.id);
      formData.append('patientId', encounter.patientId);
      formData.append('chunkIndex', String(chunkIndex));
      formData.append('isFinal', String(isFinal));
      formData.append('mimeType', blob.type || 'audio/webm');
      if (blob.size > 0 || !isFinal) {
        formData.append('chunk', blob, `chunk-${chunkIndex}.webm`);
      }

      const response = await fetch('/api/clinic/ambient/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Audio upload failed.');
      }

      return response.json() as Promise<{ finalized?: boolean }>;
    },
    [encounter.id, encounter.patientId]
  );

  const runTranscription = useCallback(async () => {
    setPhase('transcribing');
    onStatusChange?.('processing');

    const result = await startEncounterTranscription({
      encounterId: encounter.id,
      actorUid: providerUid,
    });

    if (!result.ok) {
      setPhase('error');
      setErrorMessage(result.error);
      onStatusChange?.('failed');
      return;
    }

    setPhase('complete');
    onStatusChange?.(result.data.status);
    onTranscriptionReady?.();
  }, [encounter.id, onStatusChange, onTranscriptionReady, providerUid]);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;

    setPhase('uploading');

    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
      recorder.stop();
    });

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;

    try {
      const finalIndex = chunkIndexRef.current;
      await uploadChunk(new Blob([], { type: recorder.mimeType || 'audio/webm' }), finalIndex, true);
      setUploadProgress(100);
      await runTranscription();
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Unable to finalize recording upload.';
      setPhase('error');
      setErrorMessage(message);
    }
  }, [runTranscription, uploadChunk]);

  const startRecording = useCallback(async () => {
    if (!canRecord) return;

    setErrorMessage(null);
    setElapsedSeconds(0);
    setUploadProgress(0);
    chunkIndexRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });

      mediaStreamRef.current = stream;

      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType =
        preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 });
      mediaRecorderRef.current = recorder;

      recorder.addEventListener('dataavailable', (event) => {
        if (!event.data || event.data.size === 0) return;

        const currentIndex = chunkIndexRef.current;
        chunkIndexRef.current += 1;

        void uploadChunk(event.data, currentIndex, false)
          .then(() => {
            setUploadProgress(Math.min(95, Math.round((currentIndex + 1) * 8)));
          })
          .catch((caught) => {
            const message =
              caught instanceof Error ? caught.message : 'Chunk upload failed during recording.';
            setPhase('error');
            setErrorMessage(message);
            recorder.stop();
          });
      });

      recorder.addEventListener('error', () => {
        setPhase('error');
        setErrorMessage('MediaRecorder encountered an error.');
      });

      recorder.start(3000);
      setPhase('recording');
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Microphone access is required to record.';
      setPhase('error');
      setErrorMessage(message);
    }
  }, [canRecord, uploadChunk]);

  return (
    <section className="rounded-sm border border-white/[0.06] bg-surface/20 overflow-hidden">
      <div className="border-b border-white/[0.06] px-5 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[10px] tracking-caps uppercase text-muted">Ambient Encounter Recorder</h2>
          <p className="mt-1 text-xs text-secondary font-light">
            One-tap capture with encrypted chunk upload. Raw audio is purged after transcription.
          </p>
        </div>
        <Badge variant={statusBadgeVariant(encounter.status)}>
          {formatStatusLabel(encounter.status)}
        </Badge>
      </div>

      <div className="p-5 space-y-5">
        <div className="rounded-sm border border-white/[0.08] bg-void/20 px-4 py-3">
          <p className="text-[10px] tracking-caps uppercase text-muted">AI Transcription Status</p>
          <p className="mt-2 text-sm text-primary font-light">{aiStatusLabel}</p>
          {encounter.audioDeletedAt ? (
            <p className="mt-2 text-xs text-green-400/90 font-light">
              HIPAA purge confirmed at{' '}
              {new Date(encounter.audioDeletedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          ) : null}
        </div>

        {phase === 'uploading' || phase === 'transcribing' ? (
          <div className="flex items-center gap-3 text-sm text-secondary font-light">
            <div className="h-4 w-4 border-2 border-gold/20 border-t-gold-light rounded-full animate-spin" />
            {phase === 'uploading'
              ? `Uploading encrypted audio (${uploadProgress}%)…`
              : 'Running HealthScribe transcription pipeline…'}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="rounded-sm border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          {!isRecording && canRecord && phase !== 'uploading' && phase !== 'transcribing' ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="inline-flex items-center justify-center rounded-full h-16 w-16 border border-gold-light/40 bg-gold-light/10 text-gold-light hover:bg-gold-light/20 transition-colors"
              aria-label="Start recording"
            >
              <span className="h-5 w-5 rounded-full bg-gold-light" />
            </button>
          ) : null}

          {isRecording ? (
            <button
              type="button"
              onClick={() => void stopRecording()}
              className="inline-flex items-center justify-center rounded-full h-16 w-16 border border-red-400/50 bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-colors animate-pulse"
              aria-label="Stop recording"
            >
              <span className="h-5 w-5 rounded-sm bg-red-300" />
            </button>
          ) : null}

          <div className="space-y-1">
            <p className="text-[10px] tracking-caps uppercase text-muted">
              {isRecording ? 'Recording' : 'Session Timer'}
            </p>
            <p className="text-2xl font-light tabular-nums text-primary">
              {formatElapsed(elapsedSeconds)}
            </p>
            <p className="text-xs text-secondary font-light">
              {isRecording
                ? 'Audio chunks stream to secure storage every 3 seconds.'
                : canRecord
                  ? 'Tap once to begin the encounter recording.'
                  : 'Recording is locked for this encounter state.'}
            </p>
          </div>
        </div>

        {encounter.status === 'failed' && canRecord ? (
          <Button type="button" variant="secondary" onClick={() => void startRecording()}>
            Retry Recording
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function formatStatusLabel(status: ClinicEncounterStatus): string {
  return status.replace(/_/g, ' ');
}
