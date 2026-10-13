// pages/admin/contract-center/quotations/index.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Quotation Lifecycle Management
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge, formatCCPrice } from "@/components/contract-center/CCUI";
import {
  getQuotations,
  transitionQuotationStatus,
  createQuotationRevision,
  archiveQuotation,
  softDeleteQuotation,
  restoreQuotation,
  permanentlyDeleteQuotation,
} from "@/lib/services/contractCenterService";
import { generateQuotationPdf } from "@/lib/services/ccPdfService";
import DeleteConfirmModal from "@/components/contract-center/DeleteConfirmModal";
import type { CCQuotation, CCQuotationStatus } from "@/types/contractCenter";
import { CC_QUOTATION_STATUS_LABELS, CC_QUOTATION_TRANSITIONS } from "@/types/contractCenter";

export default function QuotationsIndexPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<CCQuotation[]>([]);

  // Search & Filter & Tabs
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewTab, setViewTab] = useState<"active" | "archived" | "trash">("active");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Delete & Recycle Bin Modal State
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    quotation: CCQuotation | null;
    isPermanent: boolean;
  }>({
    isOpen: false,
    quotation: null,
    isPermanent: false,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/quotations");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getQuotations();
      setQuotations(list);
    } catch (err) {
      console.error("Error loading quotations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleDownloadPdf = async (q: CCQuotation) => {
    try {
      setDownloadingId(q.id);
      await generateQuotationPdf(q, { download: true });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Check console.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleStatusChange = async (q: CCQuotation, newStatus: CCQuotationStatus) => {
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await transitionQuotationStatus(q.id, newStatus, performedBy, `Status updated to ${newStatus}`);
      await loadData();
    } catch (err: any) {
      console.error("Failed to update status:", err);
      alert(err.message || "Failed to update status");
    }
  };

  const handleCreateRevision = async (q: CCQuotation) => {
    if (!confirm(`Create a new revision (v${q.version + 1}) for ${q.quotationNumber}?`)) return;
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const newId = await createQuotationRevision(q.id, performedBy);
      router.push(`/admin/contract-center/quotations/create?editId=${newId}`);
    } catch (err: any) {
      console.error("Failed to create revision:", err);
      alert(err.message || "Failed to create revision");
    }
  };

  const copyShareLink = (q: CCQuotation) => {
    const url = `${window.location.origin}/contract/view/${q.id}?type=quotation`;
    navigator.clipboard.writeText(url);
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Archive / Unarchive Handler
  const handleArchive = async (q: CCQuotation, shouldArchive: boolean) => {
    try {
      setActionInProgress(q.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await archiveQuotation(q.id, shouldArchive, performedBy);
      setQuotations((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, isArchived: shouldArchive } : item))
      );
      setNotice({
        text: shouldArchive
          ? `Quotation ${q.quotationNumber} moved to Archived.`
          : `Quotation ${q.quotationNumber} restored to Active.`,
        type: "success",
      });
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Archive toggle failed:", err);
      setNotice({ text: "Failed to update archive status.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Restore Handler (from Recycle Bin)
  const handleRestore = async (q: CCQuotation) => {
    try {
      setActionInProgress(q.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await restoreQuotation(q.id, performedBy);
      setQuotations((prev) =>
        prev.map((item) => (item.id === q.id ? { ...item, isDeleted: false, deletedAt: undefined } : item))
      );
      setNotice({ text: `Quotation ${q.quotationNumber} restored from Recycle Bin!`, type: "success" });
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Restore failed:", err);
      setNotice({ text: "Failed to restore quotation.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (q: CCQuotation, isPermanent: boolean) => {
    setDeleteModalState({
      isOpen: true,
      quotation: q,
      isPermanent,
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModalState.quotation) return;
    const { quotation, isPermanent } = deleteModalState;
    try {
      setActionInProgress(quotation.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      if (isPermanent) {
        await permanentlyDeleteQuotation(quotation.id, performedBy);
        setQuotations((prev) => prev.filter((item) => item.id !== quotation.id));
        setNotice({
          text: `Quotation ${quotation.quotationNumber} permanently deleted from Firestore.`,
          type: "info",
        });
      } else {
        await softDeleteQuotation(quotation.id, performedBy);
        setQuotations((prev) =>
          prev.map((item) => (item.id === quotation.id ? { ...item, isDeleted: true } : item))
        );
        setNotice({
          text: `Quotation ${quotation.quotationNumber} moved to Recycle Bin.`,
          type: "info",
        });
      }
      setTimeout(() => setNotice(null), 3500);
      setDeleteModalState({ isOpen: false, quotation: null, isPermanent: false });
    } catch (err) {
      console.error("Delete failed:", err);
      setNotice({ text: "Failed to delete quotation.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Tab counts
  const tabCounts = React.useMemo(() => {
    const active = quotations.filter((q) => !q.isDeleted && !q.isArchived).length;
    const archived = quotations.filter((q) => !q.isDeleted && q.isArchived).length;
    const trash = quotations.filter((q) => q.isDeleted).length;
    return { active, archived, trash };
  }, [quotations]);

  const filtered = quotations.filter((q) => {
    if (viewTab === "trash") {
      if (!q.isDeleted) return false;
    } else if (viewTab === "archived") {
      if (q.isDeleted || !q.isArchived) return false;
    } else {
      // active
      if (q.isDeleted || q.isArchived) return false;
    }

    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.quotationNumber.toLowerCase().includes(search.toLowerCase()) ||
      (q.clientName && q.clientName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!authReady || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <HelixLoader />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Quotations & Proposals — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Quotations & Commercial Proposals</h1>
            <p className="text-sm text-slate-400">
              Draft, version, review, and track client quotations with itemized deliverables and payment schedules.
            </p>
          </div>
          <Link
            href="/admin/contract-center/quotations/create"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Build New Quotation
          </Link>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/quotations" />

        {/* Notice Banner */}
        {notice && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-mono border backdrop-blur-xl shadow-xl transition-all ${
              notice.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                : notice.type === "info"
                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base">
                {notice.type === "error" ? "error" : "check_circle"}
              </span>
              <span>{notice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* View Tabs: Active | Archived | Recycle Bin */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setViewTab("active")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewTab === "active"
                ? "bg-pink-500/15 border border-pink-500/30 text-pink-300 shadow-sm shadow-pink-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <span className="material-symbols-outlined text-base">description</span>
            Active Quotations
            <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono">
              {tabCounts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab("archived")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewTab === "archived"
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
            }`}
          >
            <span className="material-symbols-outlined text-base">archive</span>
            Archived
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              {tabCounts.archived}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab("trash")}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              viewTab === "trash"
                ? "bg-rose-500/15 border border-rose-500/30 text-rose-300 shadow-sm shadow-rose-500/20"
                : "text-slate-400 hover:text-rose-300 hover:bg-white/[0.04]"
            }`}
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Recycle Bin
            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono">
              {tabCounts.trash}
            </span>
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by quote #, title, or client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            <svg
              className="absolute left-3 top-2.5 text-slate-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(CC_QUOTATION_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Quote #</th>
                  <th className="py-3 px-4 font-medium">Title & Scope</th>
                  <th className="py-3 px-4 font-medium">Client</th>
                  <th className="py-3 px-4 font-medium">Grand Total</th>
                  <th className="py-3 px-4 font-medium">Valid Until</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((q) => {
                  const allowedTransitions = CC_QUOTATION_TRANSITIONS[q.status] || [];
                  return (
                    <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-pink-400">{q.quotationNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">v{q.version}</div>
                      </td>
                      <td className="py-3 px-4 max-w-[240px]">
                        <div className="font-semibold text-white truncate">{q.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {q.lineItems?.length || 0} line items • {q.commercialModel.replace(/_/g, " ")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">{q.clientName || "Client"}</div>
                        <div className="text-[11px] text-slate-500">{q.projectTitle || "Direct Quote"}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {formatCCPrice(q.grandTotal || 0, q.currency || "BDT")}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(q.validUntilDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <CCStatusBadge status={q.status} />
                          {allowedTransitions.length > 0 && viewTab === "active" && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleStatusChange(q, e.target.value as CCQuotationStatus);
                              }}
                              defaultValue=""
                              className="text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-slate-300 focus:outline-none"
                            >
                              <option value="" disabled>
                                Move status...
                              </option>
                              {allowedTransitions.map((st) => (
                                <option key={st} value={st}>
                                  → {CC_QUOTATION_STATUS_LABELS[st]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDownloadPdf(q)}
                            disabled={downloadingId === q.id}
                            title="Download Official PDF"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            {downloadingId === q.id ? (
                              <span className="text-[10px]">...</span>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                              </svg>
                            )}
                          </button>

                          <button
                            onClick={() => copyShareLink(q)}
                            title="Copy Client View Link"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          >
                            {copiedId === q.id ? (
                              <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                              </svg>
                            )}
                          </button>

                          {viewTab !== "trash" && (
                            <>
                              <button
                                onClick={() => handleCreateRevision(q)}
                                title="Create Revision"
                                className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-medium"
                              >
                                Revise
                              </button>

                              <Link
                                href={`/admin/contract-center/quotations/create?editId=${q.id}`}
                                className="px-2 py-1 rounded bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 text-[11px] font-medium"
                              >
                                Edit
                              </Link>
                            </>
                          )}

                          {/* Archive / Unarchive */}
                          {viewTab === "active" && (
                            <button
                              type="button"
                              onClick={() => handleArchive(q, true)}
                              disabled={actionInProgress === q.id}
                              title="Archive Quotation"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">archive</span>
                            </button>
                          )}

                          {viewTab === "archived" && (
                            <button
                              type="button"
                              onClick={() => handleArchive(q, false)}
                              disabled={actionInProgress === q.id}
                              title="Restore to Active"
                              className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">unarchive</span>
                            </button>
                          )}

                          {/* Soft Delete */}
                          {viewTab !== "trash" && (
                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(q, false)}
                              disabled={actionInProgress === q.id}
                              title="Move to Recycle Bin"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          )}

                          {/* Recycle Bin Actions */}
                          {viewTab === "trash" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleRestore(q)}
                                disabled={actionInProgress === q.id}
                                title="Restore to Active"
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">restore_from_trash</span>
                                <span>Restore</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(q, true)}
                                disabled={actionInProgress === q.id}
                                title="Delete Permanently"
                                className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete_forever</span>
                                <span>Delete Forever</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      {viewTab === "trash"
                        ? "Recycle bin is empty. No deleted quotations."
                        : viewTab === "archived"
                        ? "No archived quotations found."
                        : "No active quotations found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Delete & Recycle Bin Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, quotation: null, isPermanent: false })}
          onConfirm={handleConfirmDelete}
          title={
            deleteModalState.isPermanent
              ? "Permanently Delete Quotation"
              : "Move Quotation to Recycle Bin"
          }
          itemRef={deleteModalState.quotation?.quotationNumber}
          itemTitle={deleteModalState.quotation?.title}
          itemSubtitle={deleteModalState.quotation?.clientName || "Client"}
          isPermanent={deleteModalState.isPermanent}
          loading={actionInProgress === deleteModalState.quotation?.id}
          confirmText={
            deleteModalState.isPermanent
              ? "Permanently Delete"
              : "Move to Recycle Bin"
          }
        />
      </div>
    </AdminLayout>
  );
}
