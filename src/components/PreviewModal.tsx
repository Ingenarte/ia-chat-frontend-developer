'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/PreviewModal.module.css';

export type ModalPhase = 'pairing' | 'success' | 'error';

type JobStatus = 'received' | 'processing' | 'finished' | 'failed';

type FinishedArgs = { success: boolean; html?: string; error?: string };

type Props = {
  open: boolean;
  phase: ModalPhase;
  statusText?: string;
  rotatingPhrases?: string[];
  onClose?: () => void;
  persistent?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  jobId?: string;
  apiBase?: string;
  onFinished?: (args: FinishedArgs) => void;
};

export default function PreviewModal({
  open,
  phase,
  statusText,
  rotatingPhrases,
  onClose,
  persistent = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  jobId,
  apiBase,
  onFinished,
}: Props) {
  // Internal phase mirrors the external one and resets on new open/job
  const [internalPhase, setInternalPhase] = useState<ModalPhase>(phase);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  useEffect(() => {
    setInternalPhase(phase);
    setErrorMsg(undefined);
  }, [phase, jobId, open]);

  // Phrases rotation
  const phrases = useMemo(
    () =>
      rotatingPhrases?.length
        ? rotatingPhrases
        : [
            'Establishing secure channel...',
            'Encoding prompt for transmission...',
            'Encrypting context state...',
            'Synchronizing rendering clocks...',
            'Resolving layout dependencies...',
            'Validating semantic structure...',
            'Negotiating syntax contracts...',
            'Mapping lexical constellations...',
            'Sanitizing and normalizing HTML...',
            'Aligning semantic embeddings...',
            'Reconstructing latent manifolds...',
            'Synthesizing multi-modal streams...',
            'Filtering noise in probability space...',
            'Optimizing gradient descent pathways...',
            'Resolving causal inference layers...',
            'Recalibrating uncertainty metrics...',
            'Scoring quality and retrying if needed...',
            'Finalizing coherence alignment...',
            'Preparing confirmation sequence...',
            'Awaiting successful verification...',
          ],
    [rotatingPhrases]
  );

  // Close on Escape when allowed
  useEffect(() => {
    if (!open || persistent || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, persistent, closeOnEscape, onClose]);

  // Poll job status every 5s while pairing
  const intervalRef = useRef<number | null>(null);
  const base = apiBase ?? process.env.NEXT_PUBLIC_AI_API_BASE ?? '/api/ai';

  useEffect(() => {
    if (!open || !jobId || internalPhase !== 'pairing') return;

    let cancelled = false;

    const stop = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const checkOnce = async () => {
      try {
        const res = await fetch(`${base}/result/${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return; // transient issue; try next tick

        const data: any = await res.json();
        const status: JobStatus | undefined = data?.status;
        if (!status) return;

        if (status === 'finished') {
          const html: string | undefined = data?.result?.html;
          if (!cancelled) {
            setInternalPhase('success');
            onFinished?.({ success: true, html });
            stop();
            window.setTimeout(() => onClose?.(), 2000); // auto-close after success
          }
        } else if (status === 'failed') {
          const err = data?.error ?? 'Job failed';
          if (!cancelled) {
            setErrorMsg(err);
            setInternalPhase('error');
            onFinished?.({ success: false, error: err });
            stop();
            window.setTimeout(() => onClose?.(), 6000); // auto-close after error
          }
        }
        // received/processing → keep polling
      } catch {
        // ignore transient network errors
      }
    };

    void checkOnce();
    intervalRef.current = window.setInterval(checkOnce, 5000);

    return () => {
      cancelled = true;
      stop();
    };
  }, [open, jobId, internalPhase, base, onFinished, onClose]);

  if (!open) return null;

  return (
    <div
      className={`${styles.overlay} ${open ? styles.open : styles.closed}`}
      aria-hidden={!open}
    >
      <div
        className={styles.backdrop}
        onClick={() => {
          if (!persistent && closeOnBackdrop) onClose?.();
        }}
      />

      {/* Job header */}
      {jobId ? (
        <div className={styles.jobHeader}>
          <span className={styles.jobLabel}>
            {internalPhase === 'pairing' ? 'Working on job id:' : 'Job id:'}
          </span>
          <span className={styles.jobValue}>{jobId}</span>
        </div>
      ) : null}

      <div className={styles.modal} role="dialog" aria-modal="true">
        {internalPhase === 'pairing' ? (
          <PairingAnimation />
        ) : internalPhase === 'success' ? (
          <SuccessAnimation />
        ) : (
          <ErrorAnimation />
        )}

        <div className={styles.statusArea}>
          {internalPhase === 'pairing' ? (
            <AnimatedStatusText phrases={phrases} />
          ) : internalPhase === 'success' ? (
            <div className={`${styles.statusText} ${styles['fade-in']}`}>
              {statusText || 'Your request has been successfully performed'}
            </div>
          ) : (
            <div
              className={`${styles.statusText} ${styles.errorText} ${styles['fade-in']}`}
            >
              {errorMsg || 'The job failed. Please try again.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Rotating status phrases with soft fade transitions */
function AnimatedStatusText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    const id = window.setInterval(() => {
      setFade('fade-out');
      const t = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        setFade('fade-in');
      }, 800);
      return () => window.clearTimeout(t);
    }, 3000);

    return () => window.clearInterval(id);
  }, [phrases.length]);

  return (
    <div className={`${styles.statusText} ${styles[fade]}`}>
      {phrases[index]}
    </div>
  );
}

/** CSS-only particle Earth pairing animation */
function PairingAnimation() {
  const LAT_RINGS = 24;
  const DOTS_PER_RING = 60;

  return (
    <div
      className={styles.earthWrap}
      aria-label="Particle Earth pairing animation"
    >
      <div className={styles.earthGlow} />
      <div className={styles.earthCoreShadow} />
      <div className={styles.earthRings}>
        {Array.from({ length: LAT_RINGS }).map((_, latIndex) => {
          const lat = (latIndex / (LAT_RINGS - 1)) * 2 - 1;
          const dir = latIndex < LAT_RINGS / 2 ? 1 : -1;
          const phase = (latIndex * 7) % 360;
          return (
            <div
              key={`ring-${latIndex}`}
              className={styles.ringLat}
              style={
                {
                  ['--lat' as any]: lat,
                  ['--dir' as any]: dir,
                  ['--phase' as any]: phase,
                } as React.CSSProperties
              }
            >
              {Array.from({ length: DOTS_PER_RING }).map((_, dot) => (
                <span
                  key={`dot-${latIndex}-${dot}`}
                  className={styles.dot3d}
                  style={
                    {
                      ['--a' as any]: (dot / DOTS_PER_RING) * 360,
                      ['--delay' as any]: `${(dot % 12) * 40}ms`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Success animation with circle + checkmark */
function SuccessAnimation() {
  return (
    <div className={styles.successWrap} aria-label="Success animation">
      <svg className={styles.successSvg} viewBox="0 0 120 120">
        <circle
          className={styles.circle}
          cx="60"
          cy="60"
          r="50"
          fill="none"
          strokeWidth="6"
        />
        <path
          className={styles.check}
          d="M38 62 L54 78 L84 44"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Error animation with circle + cross */
function ErrorAnimation() {
  return (
    <div className={styles.errorWrap} aria-label="Error animation">
      <svg className={styles.errorSvg} viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="50"
          fill="none"
          strokeWidth="6"
          className={styles.errorCircle}
        />
        <path
          d="M42 42 L78 78 M78 42 L42 78"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          className={styles.errorCross}
        />
      </svg>
    </div>
  );
}
