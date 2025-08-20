'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '@/styles/PreviewModal.module.css';

export type ModalPhase = 'pairing' | 'success';

type Props = {
  open: boolean;
  phase: ModalPhase;                      // external phase (kept for compatibility)
  statusText?: string;
  rotatingPhrases?: string[];
  onClose?: () => void;
  persistent?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  jobId?: string;                          // NEW: job identifier
  apiBase?: string;                        // NEW: base URL for API (defaults to env)
  onResolved?: (args: {                   // NEW: notify parent when finished/failed
    success: boolean;
    html?: string;
    error?: string;
  }) => void;
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
  onResolved,
}: Props) {
  // internal phase mirrors prop but can switch to 'success' when polling resolves
  const [internalPhase, setInternalPhase] = useState<ModalPhase>(phase);
  useEffect(() => {
    // keep in sync with external phase unless we already flipped to success locally
    if (phase !== internalPhase && internalPhase !== 'success') {
      setInternalPhase(phase);
    }
  }, [phase, internalPhase]);

  // phrases (unchanged)
  const phrases = useMemo(
    () =>
      rotatingPhrases?.length
        ? rotatingPhrases
        : [
            'Establishing secure channel...',
            'Synchronizing rendering clocks...',
            'Resolving layout dependencies...',
            'Validating semantic structure...',
            'Sanitizing and normalizing HTML...',
            'Scoring quality and retrying if needed...',
            'Encoding prompt for transmission...',
            'Projecting particle coordinates...',
            'Balancing orbital vectors...',
            'Stabilizing temporal harmonics...',
            'Aligning semantic embeddings...',
            'Reconstructing latent manifolds...',
            'Filtering noise in probability space...',
            'Optimizing gradient descent pathways...',
            'Negotiating syntax contracts...',
            'Mapping lexical constellations...',
            'Resolving causal inference layers...',
            'Recalibrating uncertainty metrics...',
            'Synthesizing multi-modal streams...',
            'Encrypting context state...',
            'Rendering planetary particle field...',
            'Finalizing coherence alignment...',
            'Generating quantum-safe signature...',
            'Preparing confirmation sequence...',
            'Awaiting successful verification...',
          ],
    [rotatingPhrases]
  );

  // close on Escape (unchanged)
  useEffect(() => {
    if (!open || persistent || !closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, persistent, closeOnEscape, onClose]);

  // ===== Polling loop for job status (every 5s) =====
  const pollRef = useRef<number | null>(null);
  const base = apiBase ?? process.env.NEXT_PUBLIC_AI_API_BASE ?? '/api/ai';

  useEffect(() => {
    // start polling only when: modal open, we have a jobId, and we are in pairing
    if (!open || !jobId || internalPhase !== 'pairing') return;

    async function checkOnce() {
      try {
        const res = await fetch(`${base}/result/${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) return; // tolerate transient errors; next tick will retry
        const data = await res.json() as
          | { job_id: string; status: 'received'|'processing'; }
          | { job_id: string; status: 'finished'; result?: { error?: boolean; html?: string; detail?: string | null } }
          | { job_id: string; status: 'failed'; error?: string }
          | { detail?: any };

        // handle common shapes
        if ('status' in data) {
          if (data.status === 'finished') {
            const html = (data as any).result?.html ?? '';
            setInternalPhase('success');                       // flip to success (shows check)
            onResolved?.({ success: true, html });             // tell parent to render
            // do NOT auto-close here; parent already controls closing after success
            stop();
          } else if (data.status === 'failed') {
            onResolved?.({
              success: false,
              error: (data as any).error ?? 'Job failed',
            });
            stop();
          }
          // received/processing → keep polling
        } else if ('detail' in data) {
          // treat 404/expired as failure
          onResolved?.({
            success: false,
            error: 'Job not found or expired',
          });
          stop();
        }
      } catch {
        // ignore network errors; try again next tick
      }
    }

    function tick() {
      void checkOnce();
    }

    function start() {
      stop();
      // run immediately, then every 5s
      tick();
      pollRef.current = window.setInterval(tick, 5000);
    }

    function stop() {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    start();
    return stop;
  }, [open, jobId, internalPhase, base, onResolved]);

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

      {/* Header line with job id */}
      {jobId ? (
        <div className={styles.jobHeader}>
          <span className={styles.jobLabel}>
            {internalPhase === 'pairing' ? 'Working on job id:' : 'Job id:'}
          </span>
          <span className={styles.jobValue}>{jobId}</span>
        </div>
      ) : null}

      <div className={styles.modal} role="dialog" aria-modal="true">
        {internalPhase === 'pairing' ? <PairingAnimation /> : <SuccessAnimation />}

        <div className={styles.statusArea}>
          {internalPhase === 'pairing' ? (
            <AnimatedStatusText phrases={phrases} />
          ) : (
            <div className={`${styles.statusText} ${styles['fade-in']}`}>
              {statusText || 'Your request has been successfully performed'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* Smooth rotating status phrases */
function AnimatedStatusText({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState<'fade-in' | 'fade-out'>('fade-in');

  useEffect(() => {
    const interval = setInterval(() => {
      setFade('fade-out');
      const timeout = setTimeout(() => {
        setIndex((prev) => (prev + 1) % phrases.length);
        setFade('fade-in');
      }, 800);
      return () => clearTimeout(timeout);
    }, 3000);

    return () => clearInterval(interval);
  }, [phrases.length]);

  return (
    <div className={`${styles.statusText} ${styles[fade]}`}>
      {phrases[index]}
    </div>
  );
}

/* CSS-only particle Earth pairing animation */
function PairingAnimation() {
  const LAT_RINGS = 24;
  const DOTS_PER_RING = 60;

  return (
    <div className={styles.earthWrap} aria-label="Particle Earth pairing animation">
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

/* Success animation with drawn circle and checkmark */
function SuccessAnimation() {
  return (
    <div className={styles.successWrap} aria-label="Success animation">
      <svg className={styles.successSvg} viewBox="0 0 120 120">
        <circle className={styles.circle} cx="60" cy="60" r="50" fill="none" strokeWidth="6" />
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