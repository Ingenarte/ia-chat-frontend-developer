'use client';
import PreviewModal, { ModalPhase } from '@/components/PreviewModal';
import styles from '@/styles/PreviewPane.module.css';

type FinishedArgs = { success: boolean; html?: string; error?: string };

export default function PreviewPane({
  html,
  modalOpen,
  modalPhase,
  modalText,
  onModalClose,
  jobId,
  onFinished, // NEW: bubble completion up to page.tsx
}: {
  html: string;
  modalOpen: boolean;
  modalPhase: ModalPhase;
  modalText?: string;
  onModalClose: () => void;
  jobId?: string;
  onFinished?: (args: FinishedArgs) => void;
}) {
  return (
    <div className={styles.wrapper}>
      {html ? (
        <iframe
          className={`${styles.frame} ${styles.bump}`}
          srcDoc={html}
          title="Preview"
        />
      ) : (
        <div className={styles.placeholder}>
          <div>
            <h3>HTML preview will appear here</h3>
            <p>Submit a prompt from the chat to render</p>
          </div>
        </div>
      )}

      <PreviewModal
        open={modalOpen}
        phase={modalPhase}
        statusText={modalText}
        onClose={onModalClose}
        jobId={jobId}
        // Forward completion to the parent (page.tsx) so it can call setHtml(...)
        onFinished={onFinished}
      />
    </div>
  );
}
