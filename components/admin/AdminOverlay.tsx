import { useEffect, useRef, type ReactNode } from "react";

/** Native top layer keeps sheets above the floating navigation and traps focus. */
export default function AdminOverlay({ children, className = "", onClose, label = "Dialog", ...props }: {
  children: ReactNode; className?: string; onClose: () => void; label?: string;
  "data-agreement-preview"?: string; "data-document-mode"?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }); };
  }, []);
  return <dialog {...props} ref={ref} aria-label={label} className={`admin-overlay ${className}`} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
