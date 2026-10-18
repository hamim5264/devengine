import { useEffect, useId, useRef, useState } from "react";
import styles from "@/components/landing/Landing.module.css";

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
  senderName?: string;
  durationMs?: number;
}

export default function ThankYouModal({ isOpen, onClose, senderName, durationMs = 5000 }: ThankYouModalProps) {
  const [progress, setProgress] = useState(100);
  const closeCallback = useRef(onClose);
  const dismissRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => { closeCallback.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) { setProgress(100); return; }
    const startedAt = Date.now();
    const duration = Math.max(1, durationMs);
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.max(0, 100 - elapsed / duration * 100));
      if (elapsed >= duration) { clearInterval(timer); closeCallback.current(); }
    }, 50);
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dismissRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCallback.current();
      if (event.key === "Tab") { event.preventDefault(); dismissRef.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearInterval(timer); document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previousFocus?.focus({ preventScroll: true }); };
  }, [isOpen, durationMs]);

  if (!isOpen) return null;
  return <div className={styles.modalBackdrop} onClick={onClose}>
    <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.thankYou} onClick={(event) => event.stopPropagation()}>
      <div className={styles.iconTile} aria-hidden="true"><span className="material-symbols-outlined">check_circle</span></div>
      <p className={styles.stageNumber}>Transmission confirmed</p>
      <h2 id={titleId} className={styles.heading}>Thank You{senderName ? `, ${senderName}` : ""}!</h2>
      <p className={styles.body}>Your message has been delivered to Hamim and the DevEngine engineering team. We will review your parameters and respond to your email shortly.</p>
      <div className={styles.countdown} aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      <div className={styles.modalActions}><span>Auto-closing in {Math.ceil(Math.max(1, durationMs) / 1000)} seconds</span><button ref={dismissRef} type="button" onClick={onClose} className={styles.dismiss}>Dismiss now ×</button></div>
    </div>
  </div>;
}
