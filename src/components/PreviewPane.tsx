'use client';
import PreviewModal, { ModalPhase } from '@/components/PreviewModal';
import styles from '@/styles/PreviewPane.module.css';
import { useState, useCallback, useEffect } from 'react';

type FinishedArgs = { success: boolean; html?: string; error?: string };

export default function PreviewPane({
  html,
  modalOpen,
  modalPhase,
  modalText,
  onModalClose,
  jobId,
  onFinished,
}: {
  html: string;
  modalOpen: boolean;
  modalPhase: ModalPhase;
  modalText?: string;
  onModalClose: () => void;
  jobId?: string;
  onFinished?: (args: FinishedArgs) => void;
}) {
  const [openModal, setOpenModal] = useState<
    null | 'about' | 'ex1' | 'ex2' | 'ex3'
  >(null);

  const closeModal = useCallback(() => setOpenModal(null), []);
  const onOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) closeModal();
    },
    [closeModal]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeModal]);

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
          <div className={styles.topBar}>
            <div className={styles.author}>
              <a
                href="https://linkedin.com/in/fmrodrigo"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.authorLinkBlock}
              >
                <img
                  src="https://media.licdn.com/dms/image/v2/D4D03AQEYc9k1jZzbTQ/profile-displayphoto-shrink_200_200/B4DZZrKfvDGwAY-/0/1745554636460?e=2147483647&v=beta&t=gaHnut11c7w_ahVocDOXCATM52PM-8M7SImA4JFJBoU"
                  alt="Franco Mariano Rodrigo LinkedIn"
                  className={styles.authorImage}
                />
                <span className={styles.authorName}>
                  Franco Mariano Rodrigo
                </span>
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

          {/* <div className={styles.centerText}>
            <h3>HTML preview will appear here</h3>
            <p>Submit a prompt from the chat to render</p>
          </div> */}

          <div className={styles.buttonsWrapper}>
            <div className={styles.singleButton}>
              <button
                className={styles.actionButton}
                onClick={() => setOpenModal('about')}
              >
                Learn about this website
              </button>
            </div>

            <div className={styles.cardsGrid}>
              <button
                className={styles.secondaryActionButton}
                onClick={() => setOpenModal('ex1')}
              >
                Example 1
              </button>

              <button
                className={styles.secondaryActionButton}
                onClick={() => setOpenModal('ex2')}
              >
                Example 2
              </button>

              <button
                className={styles.secondaryActionButton}
                onClick={() => setOpenModal('ex3')}
              >
                Example 3
              </button>
            </div>
          </div>

          {openModal && (
            <Modal onOverlayClick={onOverlayClick} onClose={closeModal}>
              {openModal === 'about' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>About this website</h2>
                  <p className={styles.modalText}>
                    This interface connects to a local AI generation service.
                    When you submit a prompt, the frontend creates a job, polls
                    or streams its status, and renders the produced HTML into
                    the preview panel. Streaming can show partial output while
                    the final document is validated and committed when the job
                    completes. The example buttons can later prefill prompts and
                    trigger the same flow.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.primaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {openModal === 'ex1' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Example 1</h2>
                  <p className={styles.modalText}>
                    Prompt idea: Create a responsive landing page for a
                    photography portfolio with a hero, three feature cards, and
                    a contact section.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button className={styles.primaryButton} onClick={() => {}}>
                      Try Example 1 Now
                    </button>
                  </div>
                </div>
              )}

              {openModal === 'ex2' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Example 2</h2>
                  <p className={styles.modalText}>
                    Prompt idea: Build a product grid with eight items, each
                    with image, name, price, and an “Add to cart” button, plus a
                    sticky header.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button className={styles.primaryButton} onClick={() => {}}>
                      Try Example 2 Now
                    </button>
                  </div>
                </div>
              )}

              {openModal === 'ex3' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Example 3</h2>
                  <p className={styles.modalText}>
                    Prompt idea: Generate a blog homepage with a featured post,
                    a list of six posts, and a footer with social links using
                    semantic HTML.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button className={styles.primaryButton} onClick={() => {}}>
                      Try Example 3 Now
                    </button>
                  </div>
                </div>
              )}
            </Modal>
          )}
        </div>
      )}

      <PreviewModal
        open={modalOpen}
        phase={modalPhase}
        statusText={modalText}
        onClose={onModalClose}
        jobId={jobId}
        onFinished={onFinished}
      />
    </div>
  );
}

function Modal({
  children,
  onOverlayClick,
  onClose,
}: {
  children: React.ReactNode;
  onOverlayClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
}) {
  return (
    <div
      className={styles.modalOverlay}
      onClick={onOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={styles.modalPanel}>
        <button className={styles.closeX} aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
