'use client';
import { useEffect, useRef } from 'react';
import styles from '@/styles/PreviewPane.module.css';
import PreviewModal, { ModalPhase } from '@/components/PreviewModal';

export default function PreviewPane({
  html,
  modalOpen,
  modalPhase,
  modalText,
  onModalClose,
}: {
  html: string;
  modalOpen: boolean;
  modalPhase: ModalPhase;
  modalText?: string;
  onModalClose?: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);

  // bump animation on html update
  useEffect(() => {
    if (!frameRef.current) return;
    const el = frameRef.current;
    el.classList.remove(styles.bump);
    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    el.classList.add(styles.bump);
  }, [html]);

  return (
    <div className={styles.wrapper}>
      {html?.trim() ? (
        <iframe
          ref={frameRef}
          title="Live Preview"
          className={styles.frame}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={html}
        />
      ) : (
        <div className={styles.placeholder}>
          <div>HTML preview will appear here</div>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 6 }}>
            Submit a prompt from the chat to render
          </div>
        </div>
      )}

      <PreviewModal
        open={modalOpen}
        phase={modalPhase}
        statusText={modalText}
        onClose={onModalClose}
      />
    </div>
  );
}
