// components/contract-center/DeleteConfirmModal.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center & Project Agreements Confirmation Modal
// Soft Delete (Recycle Bin) and Permanent Delete Support
// ─────────────────────────────────────────────────────────────

import React from "react";

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

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemRef,
  itemTitle,
  itemSubtitle,
  isPermanent = false,
  loading = false,
  confirmText,
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  const defaultTitle = isPermanent
    ? "Permanently Delete Document"
    : "Move Document to Recycle Bin";
  const defaultConfirmText = isPermanent
    ? "Delete Permanently"
    : "Move to Recycle Bin";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl shadow-black/80 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isPermanent
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
                : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {isPermanent ? "delete_forever" : "delete"}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {title || defaultTitle}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isPermanent
                ? "This action is irreversible and permanently removes the record from Firestore."
                : "The document will be moved to the Recycle Bin. You can restore it anytime or permanently delete it later."}
            </p>
          </div>
        </div>

        {/* Target Item Details Card */}
        {(itemRef || itemTitle) && (
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
            {itemRef && (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-pink-400">
                  {itemRef}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    isPermanent
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {isPermanent ? "Permanent Removal" : "Recycle Bin Target"}
                </span>
              </div>
            )}
            {itemTitle && (
              <div className="text-xs font-semibold text-slate-200 truncate">
                {itemTitle}
              </div>
            )}
            {itemSubtitle && (
              <div className="text-[11px] text-slate-400 truncate">
                {itemSubtitle}
              </div>
            )}
          </div>
        )}

        {/* Warning Badge for Permanent */}
        {isPermanent && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <span className="material-symbols-outlined text-rose-400 text-lg shrink-0">
              warning
            </span>
            <span>
              All linked revision history and metadata will be permanently deleted.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700/80 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 ${
              isPermanent
                ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-rose-900/30"
                : "bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-900/30"
            }`}
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">
                  {isPermanent ? "delete_forever" : "delete"}
                </span>
                {confirmText || defaultConfirmText}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
