import { useEffect, useId, useRef, type ReactNode } from "react";
import HelixLoader from "@/components/HelixLoader";
import styles from "./EmployeeExperience.module.css";

export function EmployeeIcon({ children }: { children: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{children}</span>;
}

export function EmployeeHeading({ eyebrow, title, description, icon, actions }: {
  eyebrow: string; title: string; description: string; icon: string; actions?: ReactNode;
}) {
  return <div className={styles.pageHeading}>
    <div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <div className={styles.headingTitle}><span className={styles.iconTile}><EmployeeIcon>{icon}</EmployeeIcon></span><h1>{title}</h1></div>
      <p className={styles.description}>{description}</p>
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>;
}

export function EmployeeMetric({ label, value, icon, warning = false }: {
  label: string; value: ReactNode; icon: string; warning?: boolean;
}) {
  return <div className={styles.metric} data-warning={warning || undefined}>
    <div><span>{label}</span><EmployeeIcon>{icon}</EmployeeIcon></div><strong>{value}</strong>
  </div>;
}

export function EmployeeBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) {
  return <span className={styles.badge} data-tone={tone}>{children}</span>;
}

export function EmployeeProgress({ value, label = "Progress" }: { value: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, value || 0));
  return <div className={styles.progress}>
    <div><span>{label}</span><strong>{percent}%</strong></div>
    <div className={styles.progressTrack} role="progressbar" aria-label={label} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${percent}%` }} />
    </div>
  </div>;
}

export function EmployeeSearch({ value, onChange, placeholder, label }: {
  value: string; onChange: (value: string) => void; placeholder: string; label: string;
}) {
  return <label className={styles.search}><EmployeeIcon>search</EmployeeIcon>
    <span className={styles.srOnly}>{label}</span>
    <input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
  </label>;
}

export function EmployeeEmpty({ icon, title, description, children }: {
  icon: string; title: string; description: string; children?: ReactNode;
}) {
  return <div className={styles.empty}>
    <span className={styles.emptyIcon}><EmployeeIcon>{icon}</EmployeeIcon></span>
    <h2>{title}</h2><p>{description}</p>{children}
  </div>;
}

export function EmployeeLoading() {
  return <div className={styles.loading} role="status" aria-label="Loading employee workspace"><HelixLoader size={44} color="#2cecf7" /></div>;
}

export function EmployeeDialog({ title, description, icon, onClose, children, wide = false }: {
  title: string; description?: string; icon: string; onClose: () => void; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return <dialog ref={ref} className={styles.dialog} data-wide={wide || undefined} aria-labelledby={`${id}-title`}
    aria-describedby={description ? `${id}-description` : undefined}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className={styles.dialogHeading}>
      <div className={styles.headingTitle}><span className={styles.iconTile}><EmployeeIcon>{icon}</EmployeeIcon></span><h2 id={`${id}-title`}>{title}</h2></div>
      <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close dialog"><EmployeeIcon>close</EmployeeIcon></button>
    </div>
    {description && <p id={`${id}-description`} className={styles.dialogDescription}>{description}</p>}
    <div className={styles.dialogBody}>{children}</div>
  </dialog>;
}
