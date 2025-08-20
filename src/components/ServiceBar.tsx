'use client';
import { useEffect, useState, useRef } from 'react';
import styles from '@/styles/ServiceBar.module.css';

type Props = {
  onOpenStats: () => void;
  onOutOfService: () => void;
};

export default function ServiceBar({ onOpenStats, onOutOfService }: Props) {
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const alreadyNotified = useRef(false); // <-- guard

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_AI_API_BASE}/health`
        );
        const data = await res.json();
        if (data.status !== 'ok') {
          if (!alreadyNotified.current) {
            onOutOfService();
            alreadyNotified.current = true;
          }
          setHealthy(false);
        } else {
          setHealthy(true);
        }
      } catch {
        if (!alreadyNotified.current) {
          onOutOfService();
          alreadyNotified.current = true;
        }
        setHealthy(false);
      }
    };

    const timer = setTimeout(check, 1000); // run once
    return () => clearTimeout(timer);
  }, [onOutOfService]);

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.label}>Service</span>
        <span
          className={`${styles.light} ${
            healthy === null ? styles.gray : healthy ? styles.green : styles.red
          }`}
        />
      </div>
      <button className={styles.statsButton} onClick={onOpenStats}>
        Stats
      </button>
    </div>
  );
}
