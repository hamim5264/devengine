import React from "react";
import { AgreementRecord } from "@/types/agreement";

interface FinalizeModalProps {
  record: AgreementRecord;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isFinalizing: boolean;
  isSuccess?: boolean;
  errorMessage?: string | null;
  onDownloadPdf?: () => void;
  onCloseAndNavigate?: () => void;
}

export default function FinalizeModal({
  record,
  isOpen,
  onClose,
  onConfirm,
  isFinalizing,
  isSuccess = false,
  errorMessage = null,
  onDownloadPdf,
  onCloseAndNavigate,
}: FinalizeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg bg-[#0c0c16]/98 border border-white/[0.12] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-white relative">
        
        {/* SUCCESS STATE */}
        {isSuccess ? (
          <div className="text-center space-y-5 py-2">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                Agreement Successfully Finalized!
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Official contract <span className="text-cyan-400 font-bold">{record.agreementNumber}</span> has been executed, locked, and recorded in company archives.
              </p>
            </div>

            {/* Contributor Highlight Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-left space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400 shrink-0">Project:</span>
                <span className="text-white font-semibold truncate max-w-[280px] text-right" title={record.project.projectName}>
                  {record.project.projectName}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-400 shrink-0">Contributor:</span>
                <span className="text-cyan-300 font-bold tracking-wide">{record.developer.fullName}</span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                <span className="text-gray-400 shrink-0">Status:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[11px] border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  FINALIZED & LOCKED
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {onDownloadPdf && (
                <button
                  type="button"
                  onClick={onDownloadPdf}
                  className="h-12 px-5 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 text-slate-950 font-sans font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-[0_0_25px_rgba(56,189,248,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span>Download PDF</span>
                </button>
              )}

              <button
                type="button"
                onClick={onCloseAndNavigate || onClose}
                className="h-12 px-5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-sans font-semibold text-xs tracking-wider transition-all duration-200 border border-white/[0.12] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>View Agreements</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        ) : errorMessage ? (
          /* ERROR STATE */
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <span className="material-symbols-outlined text-2xl">error</span>
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Space_Grotesk'] text-white">
                  Finalization Notice
                </h3>
                <p className="text-xs text-rose-300 font-mono mt-0.5">
                  An error occurred while saving the agreement.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-mono text-rose-200 leading-relaxed">
              {errorMessage}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white font-mono text-xs transition-all border border-white/[0.08] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          /* CONFIRMATION STATE */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <span className="material-symbols-outlined text-2xl">verified_user</span>
              </div>
              <div>
                <h3 className="text-lg font-bold font-['Space_Grotesk'] text-white">
                  Finalize Official Agreement?
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Ref: <span className="text-cyan-400 font-semibold">{record.agreementNumber}</span> (v{record.version})
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 text-xs font-mono text-gray-300 space-y-2 leading-relaxed">
              <p className="text-amber-300 font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>Official Execution Notice</span>
              </p>
              <p>
                Finalizing this agreement locks all contractual clauses into a formal company record:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400 pl-1">
                <li>Generates the official publication-grade multi-page A4 PDF</li>
                <li>Affixes official DevEngine CEO signature & letterhead</li>
                <li>Archives the document in Firestore & cloud storage</li>
                <li>Contributor: <strong className="text-cyan-300">{record.developer.fullName}</strong></li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isFinalizing}
                className="h-11 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-300 hover:text-white font-sans font-semibold text-xs transition-all border border-white/[0.08] cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={isFinalizing}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 text-slate-950 font-sans font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                {isFinalizing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Executing & Archiving…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>Confirm & Finalize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
