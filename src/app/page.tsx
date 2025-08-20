'use client';
import { useCallback, useRef, useState } from 'react';
import ChatPanel from '@/components/ChatPanel';
import PreviewPane from '@/components/PreviewPane';
import type { ModalPhase } from '@/components/PreviewModal';
import '@/app/globals.css';
import styles from './page.module.css';
import ServiceBar from '@/components/ServiceBar';
import StatsModal from '@/components/StatsModal';
import OutOfServiceModal from '@/components/OutOfServiceModal';

export default function Page() {
  const [html, setHtml] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPhase, setModalPhase] = useState<ModalPhase>('pairing');
  const [modalText, setModalText] = useState<string | undefined>(undefined);

  const [statsOpen, setStatsOpen] = useState(false);
  const [outOfServiceOpen, setOutOfServiceOpen] = useState(false);

  const closeTimeoutRef = useRef<number | null>(null);

  const handleRequestStart = useCallback(() => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setModalText(undefined);
    setModalPhase('pairing');
    setModalOpen(true);
  }, []);

  const handleRequestFinished = useCallback(
    ({ success }: { success: boolean }) => {
      if (success) {
        setModalPhase('success');
        setModalText('Your request has been successfully performed');
        closeTimeoutRef.current = window.setTimeout(
          () => setModalOpen(false),
          1100
        );
      } else {
        setModalOpen(false);
      }
    },
    []
  );

  return (
    <main className="main">
      {/* Left column: single panel with ServiceBar (10%) + Chat (90%) */}
      <section className={`panel ${styles.leftCol}`}>
        <div className={styles.serviceSlot}>
          <ServiceBar
            onOpenStats={() => setStatsOpen(true)}
            onOutOfService={() =>
              setOutOfServiceOpen((prev) => (prev ? prev : true))
            }
          />
        </div>
        <div className={styles.chatSlot}>
          <ChatPanel
            onHtml={setHtml}
            currentHtml={html}
            onRequestStart={handleRequestStart}
            onRequestFinished={handleRequestFinished}
          />
        </div>
      </section>

      {/* Right column: preview panel */}
      <section className={`panel ${styles.rightCol}`}>
        <PreviewPane
          html={html}
          modalOpen={modalOpen}
          modalPhase={modalPhase}
          modalText={modalText}
          onModalClose={() => setModalOpen(false)}
        />
      </section>

      {/* Stats modal */}
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        apiBase={process.env.NEXT_PUBLIC_AI_API_BASE ?? '/api/ai'}
      />

      {/* Out-of-service modal */}
      <OutOfServiceModal
        open={outOfServiceOpen}
        onClose={() => setOutOfServiceOpen(false)}
      />
    </main>
  );
}
