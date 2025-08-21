'use client';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  title: string;
  content: string;
};

export default function Tooltip({ title, content }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const btnRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);
  const myId = useId();

  // Mount flag (for portals)
  useEffect(() => setMounted(true), []);

  // Reposition near the button
  const recompute = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const maxWidth = 320;
    const left = Math.min(
      Math.max(8, r.left),
      window.innerWidth - maxWidth - 8
    );
    const top = Math.min(r.bottom + 10, window.innerHeight - 160);
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    return () => document.removeEventListener('mousedown', onDown, true);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Single-open behavior via a tiny event bus
  useEffect(() => {
    const EVENT = 'app-tooltip-open';
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>;
      if (ce.detail?.id && ce.detail.id !== myId) setOpen(false);
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, [myId]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      window.dispatchEvent(
        new CustomEvent('app-tooltip-open', { detail: { id: myId } })
      );
    }
  }

  const portal =
    open && mounted
      ? createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label={title}
            aria-modal="false"
            style={{
              position: 'fixed',
              zIndex: 1000,
              top: pos.top,
              left: pos.left,
              width: 300,
              padding: 12,
              borderRadius: 10,
              background: '#0b1220',
              border: '1px solid #334155',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              color: '#d1d5db',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: '#9aa4af', lineHeight: 1.4 }}>
              {content}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={btnRef}
        type="button"
        aria-expanded={open}
        aria-label={title}
        onClick={toggleOpen}
        style={{
          width: 22,
          height: 22,
          borderRadius: '50%',
          border: '1px solid #334155',
          background: '#0b1220',
          color: '#d1d5db',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        i
      </button>
      {portal}
    </div>
  );
}
