'use client';
import PreviewModal, { ModalPhase } from '@/components/PreviewModal';
import styles from '@/styles/PreviewPane.module.css';
import { useState, useCallback, useEffect } from 'react';

// Markdown + security + diagrams
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import hljs from 'highlight.js';

type FinishedArgs = { success: boolean; html?: string; error?: string };

// ---- marked configuration (GFM + highlight) ----
marked.setOptions({
  gfm: true,
  breaks: false,
  // do NOT set headerIds/mangle: they are not part of current MarkedOptions
  highlight(code: string, lang?: string): string {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value;
      }
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  },
});

// ---- Mermaid dynamic loader (client-only) ----
let mermaidLib: any | null = null;
let mermaidReady = false;

async function ensureMermaid(): Promise<void> {
  if (mermaidReady && mermaidLib) return;
  const m = (await import('mermaid')).default;
  m.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'strict',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
  });
  mermaidLib = m;
  mermaidReady = true;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

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

  // Markdown state for About modal
  const [aboutHtml, setAboutHtml] = useState<string>('');
  const [aboutLoading, setAboutLoading] = useState<boolean>(false);
  const [aboutError, setAboutError] = useState<string | null>(null);

  const closeModal = useCallback(() => {
    setOpenModal(null);
    setAboutHtml(''); // reset to force re-render next time
  }, []);

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

  // Fetch README and render as sanitized HTML when opening About modal
  useEffect(() => {
    if (openModal !== 'about') return;

    const RAW_URL =
      'https://raw.githubusercontent.com/Ingenarte/ia-chat-frontend-developer/main/README.md';

    let cancelled = false;
    setAboutLoading(true);
    setAboutError(null);

    (async () => {
      try {
        const res = await fetch(RAW_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const md = await res.text();

        // Convert fenced mermaid blocks to a <div class="mermaid"> for client-side rendering
        const mdWithMermaid = md.replace(
          /```mermaid\s+([\s\S]*?)```/g,
          (_m, p1) => {
            return `\n<div class="mermaid">\n${p1}\n</div>\n`;
          }
        );

        // Parse Markdown to HTML (sync, to get a string)
        const rawHtml = marked.parse(mdWithMermaid, { async: false }) as string;
        // Sanitize HTML
        const safeHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['div'],
          ADD_ATTR: ['class', 'style'],
        });

        if (!cancelled) setAboutHtml(safeHtml);
      } catch (err) {
        if (!cancelled) setAboutError(`Failed to load README. ${String(err)}`);
      } finally {
        if (!cancelled) setAboutLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [openModal]);

  // Render Mermaid after the HTML is in the DOM
  // Render Mermaid after the HTML is in the DOM (robust: decode HTML entities and use render())
  useEffect(() => {
    if (!aboutHtml) return;

    let cancelled = false;

    (async () => {
      await ensureMermaid();
      if (cancelled) return;

      // Defer to next frame so the HTML is painted
      requestAnimationFrame(async () => {
        try {
          const nodes = Array.from(
            document.querySelectorAll('.mermaid')
          ) as HTMLElement[];

          for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            // Normalize diagram source: textContent only, then decode HTML entities
            const src = decodeHtml((el.textContent || '').trim());

            if (!src) continue;

            try {
              // mermaid.render signature: v10/v11 may return string or { svg }
              const out = await (mermaidLib as any).render(
                `m-${i}-${Date.now()}`,
                src
              );
              const svg = typeof out === 'string' ? out : out?.svg;
              if (svg && !cancelled) {
                el.innerHTML = svg;
              }
            } catch (err) {
              // Leave error visible for debugging but do not break the rest
              // You will also see Mermaid's error bubble inside the container
              // if the syntax is actually invalid
              // eslint-disable-next-line no-console
              console.error('Mermaid render error:', err);
            }
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Mermaid global render error:', err);
        }
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [aboutHtml]);

  // Neutralize links and buttons inside previewed HTML
  const neutralizerScript = `
<script>
(function () {
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

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (b) {
      e.preventDefault();
      e.stopPropagation();
      console.log('Button clicked inside preview, ignoring default.');
    }
  }, true);

  try {
    var buttons = document.querySelectorAll('button');
    buttons.forEach(function(b) {
      b.setAttribute('type', 'button');
      b.style.cursor = 'pointer';
    });
  } catch (_) {}
})();
</script>
`;

  let safeHtml = html;
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
            <Modal
              onOverlayClick={onOverlayClick}
              onClose={closeModal}
              panelClassName={
                openModal === 'about' ? styles.modalPanelLarge : undefined
              }
            >
              {openModal === 'about' && (
                <div className={styles.modalContentFill}>
                  <div className={styles.modalHeaderRow}>
                    <h2 className={styles.modalTitle}>About this website</h2>
                    <a
                      href="https://github.com/Ingenarte/ia-chat-frontend-developer"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.modalSubtle}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          d="M12 .297c-6.63 0-12 5.373-12 
      12 0 5.303 3.438 9.8 8.205 
      11.385.6.113.82-.258.82-.577 
      0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.089-.744.083-.729.083-.729 
      1.205.084 1.84 1.236 1.84 1.236 
      1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.305-5.466-1.334-5.466-5.93 
      0-1.31.468-2.381 1.235-3.221-.123-.303-.535-1.527.117-3.176 
      0 0 1.008-.322 3.3 1.23a11.52 
      11.52 0 0 1 3.003-.404c1.02.005 
      2.047.138 3.003.404 2.291-1.552 
      3.297-1.23 3.297-1.23.653 1.649.241 
      2.873.118 3.176.77.84 1.233 1.911 
      1.233 3.221 0 4.609-2.803 
      5.624-5.475 5.921.43.371.823 1.102.823 
      2.222 0 1.606-.014 2.898-.014 
      3.293 0 .322.218.694.825.576C20.565 
      22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                        />
                      </svg>
                      View on GitHub
                    </a>
                  </div>

                  {aboutLoading && (
                    <div className={styles.loading}>Loading README...</div>
                  )}
                  {aboutError && (
                    <div className={styles.errorBox}>{aboutError}</div>
                  )}

                  {!aboutLoading && !aboutError && (
                    <div
                      className={styles.markdownDark}
                      // Inject sanitized HTML (includes <div class="mermaid"> blocks)
                      dangerouslySetInnerHTML={{ __html: aboutHtml }}
                    />
                  )}

                  <div className={styles.modalActionsRight}>
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
  panelClassName,
}: {
  children: React.ReactNode;
  onOverlayClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onClose: () => void;
  panelClassName?: string;
}) {
  return (
    <div
      className={styles.modalOverlay}
      onClick={onOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className={`${styles.modalPanel} ${panelClassName ?? ''}`}>
        <button className={styles.closeX} aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
