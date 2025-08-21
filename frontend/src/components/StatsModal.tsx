'use client';
import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/StatsModal.module.css';

type JobRowRaw = {
  id?: string;
  job_id?: string;
  status?: 'received' | 'processing' | 'finished' | 'failed' | string;
  created_at?: string;
  finished_at?: string | null;
  prompt_size?: number;
  output_bytes?: number;
  model?: string;
};

type JobRow = {
  id: string;
  status: 'received' | 'processing' | 'finished' | 'failed' | 'unknown';
  created_at?: string;
  finished_at?: string | null;
  prompt_size?: number;
  output_bytes?: number;
  model?: string;
};

type StatsPayload = {
  // Old shape fallback
  uptime_sec?: number;
  total_jobs?: number;
  running_jobs?: number;
  finished_jobs?: number;
  failed_jobs?: number;
  avg_latency_ms?: number;

  // New shape from /jobs/stats
  live?: {
    received?: number;
    processing?: number;
    finished?: number;
    failed?: number;
  };
  total?: {
    received?: number;
    processing?: number;
    finished?: number;
    failed?: number;
    created?: number;
  };
};

function normalizeRow(r: JobRowRaw, fallbackKey: string): JobRow {
  const id = (r.id ?? r.job_id ?? '').toString();
  return {
    id: id || fallbackKey,
    status: (r.status as any) ?? 'unknown',
    created_at: r.created_at,
    finished_at: r.finished_at,
    prompt_size: r.prompt_size,
    output_bytes: r.output_bytes,
    model: r.model,
  };
}

export default function StatsModal({
  open,
  onClose,
  apiBase,
}: {
  open: boolean;
  onClose: () => void;
  apiBase: string;
}) {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [running, setRunning] = useState<JobRow[]>([]);
  const [recent, setRecent] = useState<JobRow[]>([]);
  const timerRef = useRef<number | null>(null);

  async function fetchAll() {
    try {
      // Prefer new endpoints/shapes but be tolerant
      const [s, r1, r2] = await Promise.all([
        fetch(`${apiBase}/jobs/stats`, { cache: 'no-store' }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`${apiBase}/jobs?status=processing&limit=20`, {
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${apiBase}/jobs?status=finished&limit=20`, {
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : [])),
      ]);

      // Stats can be either the new {live,total} or old flat counters
      setStats(s ?? null);

      const itemsProcessing: JobRowRaw[] = Array.isArray(r1)
        ? r1
        : Array.isArray(r1?.items)
        ? r1.items
        : [];
      const itemsFinished: JobRowRaw[] = Array.isArray(r2)
        ? r2
        : Array.isArray(r2?.items)
        ? r2.items
        : [];

      setRunning(
        itemsProcessing.map((row, i) => normalizeRow(row, `proc-${i}`))
      );
      setRecent(itemsFinished.map((row, i) => normalizeRow(row, `done-${i}`)));
    } catch {
      // Keep previous data; do not crash the modal
    }
  }

  useEffect(() => {
    if (!open) return;
    fetchAll();
    timerRef.current = window.setInterval(fetchAll, 5000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  // Helpers for display with graceful fallbacks
  const live = stats?.live ?? {};
  const total = stats?.total ?? {};

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            Service Stats (from last server Start)
          </h3>
          <button className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Metrics */}
        <section className={styles.metrics}>
          {/* Live line */}
          <Metric label="Live received" value={live.received ?? 0} />
          <Metric label="Live processing" value={live.processing ?? 0} />
          <Metric label="Live finished" value={live.finished ?? 0} />
          <Metric label="Live failed" value={live.failed ?? 0} />
          {/* Totals line */}
          <Metric
            label="Total received"
            value={total.received ?? stats?.total_jobs ?? 0}
          />
          <Metric
            label="Total processing"
            value={total.processing ?? stats?.running_jobs ?? 0}
          />
          <Metric
            label="Total finished"
            value={total.finished ?? stats?.finished_jobs ?? 0}
          />
          <Metric
            label="Total failed"
            value={total.failed ?? stats?.failed_jobs ?? 0}
          />
          <Metric label="Total created" value={total.created ?? 0} />
        </section>

        <div className={styles.columns}>
          <div className={styles.col}>
            <div className={styles.colTitle}>Live jobs</div>
            <JobTable rows={running} empty="No jobs running." />
          </div>
          <div className={styles.col}>
            <div className={styles.colTitle}>Recent finished</div>
            <JobTable rows={recent} empty="No recent jobs." />
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.metric}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue}>{value}</div>
    </div>
  );
}

function JobTable({ rows, empty }: { rows: JobRow[]; empty: string }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Status</th>
            <th>Model</th>
            <th>Created</th>
            <th>Finished</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className={styles.empty}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((r, i) => {
              const idShort = (r.id ?? '').toString().slice(0, 8) || '—';
              const st = r.status ?? 'unknown';
              return (
                <tr key={`${r.id}-${i}`}>
                  <td className={styles.mono}>{idShort}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${styles[`st_${st}`] || ''}`}
                    >
                      {st}
                    </span>
                  </td>
                  <td className={styles.mono}>{r.model ?? '—'}</td>
                  <td className={styles.mono}>
                    {r.created_at ? fmtDate(r.created_at) : '—'}
                  </td>
                  <td className={styles.mono}>
                    {r.finished_at ? fmtDate(r.finished_at) : '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}
