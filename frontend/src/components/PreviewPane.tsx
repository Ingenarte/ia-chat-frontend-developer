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
  onTryExample,
}: {
  html: string;
  modalOpen: boolean;
  modalPhase: ModalPhase;
  modalText?: string;
  onModalClose: () => void;
  jobId?: string;
  onFinished?: (args: FinishedArgs) => void;
  onTryExample?: (prompt: string) => void | Promise<void>;
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

  // Neutralize all <a> links inside the generated document
  const neutralizerScript = `
<script>
(function () {
  // Neutralize <a>
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (a) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  try {
    var links = document.querySelectorAll('a');
    links.forEach(function(a) {
      a.setAttribute('href', 'javascript:void(0)');
      a.setAttribute('tabindex', '0');
      a.setAttribute('role', 'link');
      a.style.cursor = 'default';
    });
  } catch (_) {}

  // Neutralize <button>
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b) {
      e.preventDefault();
      e.stopPropagation();
      // optional: log to console or send postMessage to parent for modal control
      console.log('Button clicked inside preview, ignoring default.');
    }
  }, true);

  try {
    var buttons = document.querySelectorAll('button');
    buttons.forEach(function(b) {
      b.setAttribute('type', 'button'); // avoid accidental form submission
      b.style.cursor = 'pointer';
    });
  } catch (_) {}
})();
</script>
`;

  let safeHtml = html;
  // ensure script is appended before </body> if present, otherwise at the end
  if (safeHtml && /<\/body>/i.test(safeHtml)) {
    safeHtml = safeHtml.replace(/<\/body>/i, neutralizerScript + '</body>');
  } else {
    safeHtml = (safeHtml || '') + neutralizerScript;
  }

  return (
    <div className={styles.wrapper}>
      {html ? (
        <iframe
          className={`${styles.frame} ${styles.bump}`}
          srcDoc={safeHtml}
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
                    Prompt idea: Create a responsive portfolio page for a
                    developer with projects, skills, and contact.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={() => {
                        closeModal();
                        onTryExample?.(
                          `Build a complete responsive HTML5 Developer Portfolio page.  
Requirements:  
- Language: English.  
- Sticky navbar with name/logo and links (Home, About, Skills, Projects, Blog, Contact).  
- Hero section with name, professional title, call-to-action button, and animated background.  
- About section with portrait image and detailed biography.  
- Skills section with progress bars or skill cards.  
- Projects grid with at least 9 projects (each showing image, title, stack, description, and buttons for “Live Demo” + “Source”).  
- Experience & Education timeline with animated transitions.  
- Testimonials section with quotes from colleagues or clients.  
- Blog Highlights section showing 5 posts.  
- Contact form with name, email, message, and validation.  
- Footer with copyright and social media links.  
- Use only inline CSS or <style> tag inside the file.  
- Include CSS animations: fade-ins, hover scaling, keyframe hero animation.  
- Page should include at least 1200 words of meaningful content (no lorem ipsum).  
- Return the result as a single self-contained HTML file.`
                        );
                      }}
                    >
                      Try Portfolio Page
                    </button>
                  </div>
                </div>
              )}

              {openModal === 'ex2' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Example 2</h2>
                  <p className={styles.modalText}>
                    Prompt idea: Create a fun fan page for the TV show Friends
                    with characters, quotes, and interactive sections.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={() => {
                        closeModal();
                        onTryExample?.(
                          `Create a full HTML5 page themed around the TV show Friends.  
Requirements:  
- Language: English.  
- Sticky navbar with logo “Friends Fan Page” and links: Home, Characters, Quotes, Gallery, Contact.  
- A rotating hero section that cycles every 5 seconds through 3 famous quotes (from Chandler, Joey, and Ross) with fade-in/out animation.  
- A colorful grid of at least 6 main characters (Monica, Rachel, Phoebe, Ross, Chandler, Joey), each with image, name, and a 2–3 sentence description.  
- A “Best Quotes” section with at least 8 random Friends quotes styled in a fun way.  
- A timeline of show milestones (years, events, awards).  
- A photo gallery with hover animations.  
- A contact form with validation (name, email, message).  
- Footer with copyright and a link to “Watch Friends”.  
- Use only inline CSS styles or <style> tag inside the same HTML file.  
- Design must be colorful, fun, with CSS animations (keyframes, transitions, hover effects).  
- Page should have at least 1200 words of original content (no lorem ipsum).  
- Return the result as a single self-contained HTML file.`
                        );
                      }}
                    >
                      Try Example 2 Now
                    </button>
                  </div>
                </div>
              )}

              {openModal === 'ex3' && (
                <div className={styles.modalContent}>
                  <h2 className={styles.modalTitle}>Example 3</h2>
                  <p className={styles.modalText}>
                    Prompt idea: Create a responsive blog home page with posts,
                    sidebar, and animations.
                  </p>
                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={closeModal}
                    >
                      Close
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={() => {
                        closeModal();
                        onTryExample?.(
                          `Generate a complete responsive HTML5 Blog Home Page.  
Requirements:  
- Language: English.  
- Sticky navbar with site logo, nav links (Home, About, Categories, Contact), and a search box.  
- An animated hero section with a rotating headline/subheadline every 5 seconds.  
- A posts grid with at least 9 blog cards (each with image, title, author, date, tags, reading time, and a 2–3 sentence excerpt).  
- Sidebar with an About widget, Categories list, Popular Posts (with thumbnails), Tag cloud, and a Newsletter signup form.  
- A “Latest from the Blog” list with 6 items.  
- Pagination controls at the bottom.  
- Footer with social links, site navigation, and copyright.  
- Use only inline CSS or <style> tag inside the file.  
- Add subtle CSS animations: hero rotation, hover effects on cards, fade-in sections.  
- Fill the page with at least 1500 words of rich, realistic blog content (no lorem ipsum).  
- Return the result as a single self-contained HTML file.`
                        );
                      }}
                    >
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
