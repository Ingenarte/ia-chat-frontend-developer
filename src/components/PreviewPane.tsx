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
      <div className={styles.wrapper}>
        {html ? (
          <iframe
            className={`${styles.frame} ${styles.bump}`}
            srcDoc={html}
            title="Preview"
          />
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.topBar}>
              <div className={styles.author}>
                <a
                  href="https://linkedin.com/in/fmrodrigo"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src="https://media.licdn.com/dms/image/v2/D4D03AQEYc9k1jZzbTQ/profile-displayphoto-shrink_200_200/B4DZZrKfvDGwAY-/0/1745554636460?e=2147483647&v=beta&t=gaHnut11c7w_ahVocDOXCATM52PM-8M7SImA4JFJBoU"
                    alt="Franco Mariano Rodrigo LinkedIn"
                    className={styles.authorImage}
                  />
                </a>
                <a
                  href="https://linkedin.com/in/fmrodrigo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.authorName}
                >
                  Franco Mariano Rodrigo
                </a>
              </div>
              <a
                href="https://ingenarte.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="/IngenarteDevLogo.png"
                  alt="Ingenarte Dev Logo"
                  className={styles.logo}
                />
              </a>
            </div>

            <div className={styles.centerText}>
              <h3>HTML preview will appear here</h3>
              <p>Submit a prompt from the chat to render</p>
            </div>
          </div>
        )}
      </div>

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
