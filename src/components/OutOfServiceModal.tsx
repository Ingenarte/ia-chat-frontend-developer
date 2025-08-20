'use client';
import styles from '@/styles/OutOfServiceModal.module.css';

export default function OutOfServiceModal({
  open,
  onClose,
  checkUrl,
}: {
  open: boolean;
  onClose: () => void;
  checkUrl?: string;
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.modal}>
        <h2 className={styles.title}>Backend is out of service</h2>
        <p className={styles.body}>
          Please contact the webmaster at{' '}
          <a className={styles.link} href="mailto:contacto.ingenarte@gmail.com">
            contacto.ingenarte@gmail.com
          </a>
          .
        </p>
        {checkUrl ? (
          <p className={styles.small}>
            Sending the URL to check:{' '}
            <span className={styles.code}>{checkUrl}</span>
          </p>
        ) : null}
        <div className={styles.actions}>
          <button className={styles.btn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
