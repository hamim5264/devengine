import styles from "./AdminStatusChip.module.css";

export function normalizeAdminStatus(status: string): string {
  return (status || "pending").trim().replace(/([a-z\d])([A-Z])/g, "$1_$2").toLowerCase().replace(/[\s-]+/g, "_");
}
export function adminStatusTone(status: string): string {
  const value = normalizeAdminStatus(status);
  if (["paid", "approved", "completed", "verified", "accepted", "active", "published", "live", "signed", "executed", "delivered", "present", "success", "resolved"].includes(value)) return "success";
  if (["rejected", "declined", "cancelled", "canceled", "terminated", "failed", "error", "expired", "overdue", "suspended", "blocked", "absent"].includes(value)) return "danger";
  if (["in_review", "under_review", "review", "pending_signatures", "partially_signed"].includes(value)) return "review";
  if (["pending", "pending_verification", "awaiting_payment", "awaiting_approval", "unpaid", "due", "partially_paid", "late", "half_day"].includes(value)) return "warning";
  if (["processing", "in_progress", "in_development", "sent", "scheduled", "open", "alpha", "beta"].includes(value)) return "info";
  if (/^(pending|awaiting)_/.test(value)) return "warning";
  if (/(^|_)(failed|rejected|cancelled|canceled|overdue|expired)($|_)/.test(value)) return "danger";
  if (/(^|_)review($|_)/.test(value)) return "review";
  return "neutral";
}
export default function AdminStatusChip({ status, label, className = "" }: { status: string; label?: string; className?: string }) {
  return <span className={`${styles.chip} ${className}`} data-admin-status data-tone={adminStatusTone(status)}>{label || normalizeAdminStatus(status).replace(/_/g, " ")}</span>;
}
