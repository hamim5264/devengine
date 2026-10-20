import React from "react";
import { EmployeeDialog, EmployeeIcon } from "@/components/staff/EmployeeUI";
import styles from "@/components/admin/AdminWidgets.module.css";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  itemRef?: string;
  itemTitle?: string;
  itemSubtitle?: string;
  isPermanent?: boolean;
  loading?: boolean;
  confirmText?: string;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, title, itemRef, itemTitle, itemSubtitle, isPermanent = false, loading = false, confirmText }: DeleteConfirmModalProps) {
  if (!isOpen) return null;
  return <EmployeeDialog
    title={title || (isPermanent ? "Delete permanently?" : "Move to Recycle Bin?")}
    description={isPermanent ? "This permanently deletes the record. This action cannot be undone." : "You can restore this record from the Recycle Bin later."}
    icon={isPermanent ? "delete_forever" : "inventory_2"}
    onClose={() => { if (!loading) onClose(); }}>
    {(itemRef || itemTitle) && <div className={styles.confirmationRecord}>{itemRef && <span>{itemRef}</span>}{itemTitle && <strong>{itemTitle}</strong>}{itemSubtitle && <p>{itemSubtitle}</p>}</div>}
    {isPermanent && <p className={styles.warning}><EmployeeIcon>warning</EmployeeIcon><span>Linked revision history and metadata will also be removed.</span></p>}
    <div className={styles.dialogActions}>
      <button type="button" className={styles.button} disabled={loading} onClick={onClose}>Cancel</button>
      <button type="button" className={isPermanent ? styles.dangerButton : styles.primaryButton} disabled={loading} onClick={onConfirm}>
        <EmployeeIcon>{loading ? "hourglass_top" : isPermanent ? "delete_forever" : "inventory_2"}</EmployeeIcon>
        {loading ? "Processing…" : confirmText || (isPermanent ? "Delete permanently" : "Move to Recycle Bin")}
      </button>
    </div>
  </EmployeeDialog>;
}
