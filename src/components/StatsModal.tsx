'use client';
import { useEffect, useRef, useState } from 'react';
import styles from '@/styles/StatsModal.module.css';

type JobRow = {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  created_at?: string;
  finished_at?: string | null;
  prompt_size?: number;
  output_bytes?: number;
  model?: string;
};

type StatsPayload = {
  live: {
    received: number;
    processing: number;
    finished: number;
    failed: number;
  };
  total: {
    received: number;
    processing: number;
    finished: number;
    failed: number;
    created: number;
  };
};

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
      const [s, r1, r2] = await Promise.all([
        fetch(`${apiBase}/jobs/stats`, { cache: 'no-store' }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`${apiBase}/jobs?status=processing&limit=20`, {
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : [])),
        fetch(`${apiBase}/jobs?status=done&limit=20`, {
          cache: 'no-store',
        }).then((r) => (r.ok ? r.json() : [])),
      ]);
      setStats(s ?? null);
      setRunning(Array.isArray(r1) ? r1 : r1?.items ?? []);
      setRecent(Array.isArray(r2) ? r2 : r2?.items ?? []);
    } catch {
      // Keep previous data; modal must not crash
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

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <h3 className={styles.title}>Service Stats</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>

        {/* Row 1: Live */}
        <section className={styles.metrics}>
          <Metric label="Live received" value={stats?.live.received ?? '—'} />
          <Metric
            label="Live processing"
            value={stats?.live.processing ?? '—'}
          />
          <Metric label="Live finished" value={stats?.live.finished ?? '—'} />
          <Metric label="Live failed" value={stats?.live.failed ?? '—'} />
        </section>

        {/* Row 2: Totals */}
        <section className={styles.metrics}>
          <Metric label="Total received" value={stats?.total.received ?? '—'} />
          <Metric
            label="Total processing"
            value={stats?.total.processing ?? '—'}
          />
          <Metric label="Total finished" value={stats?.total.finished ?? '—'} />
          <Metric label="Total failed" value={stats?.total.failed ?? '—'} />
          <Metric label="Total created" value={stats?.total.created ?? '—'} />
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
            rows.map((r) => (
              <tr key={r.id}>
                <td className={styles.mono}>{r.id.slice(0, 8)}</td>
                <td>
                  <span
                    className={`${styles.badge} ${styles[`st_${r.status}`]}`}
                  >
                    {r.status}
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
            ))
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
