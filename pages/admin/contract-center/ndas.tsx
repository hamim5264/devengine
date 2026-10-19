import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/ndas.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Non-Disclosure Agreements (NDAs)
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge } from "@/components/contract-center/CCUI";
import {
  getNDAs,
  getClients,
  createNDA,
  updateNDA,
  archiveNDA,
  softDeleteNDA,
  restoreNDA,
  permanentlyDeleteNDA,
} from "@/lib/services/contractCenterService";
import { generateNDAPdf } from "@/lib/services/ccPdfService";
import DeleteConfirmModal from "@/components/contract-center/DeleteConfirmModal";
import type { CCNDA, CCClient, CCNDAType, CCNDAStatus } from "@/types/contractCenter";
import { CC_NDA_STATUS_LABELS } from "@/types/contractCenter";

export default function NDAsManagementPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ndas, setNdas] = useState<CCNDA[]>([]);
  const [clients, setClients] = useState<CCClient[]>([]);

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
    nda: CCNDA | null;
    isPermanent: boolean;
  }>({
    isOpen: false,
    nda: null,
    isPermanent: false,
  });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNDA, setEditingNDA] = useState<CCNDA | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    ndaType: "mutual" as CCNDAType,
    isMutual: true,
    clientId: "",
    disclosingPartyName: "DevEngine Software Studio",
    disclosingPartyRep: "DevEngine Authorized Management",
    disclosingPartyEmail: "hamim.leon@gmail.com",
    receivingPartyName: "",
    receivingPartyRep: "",
    receivingPartyEmail: "",
    purpose: "Proprietary software engineering, systems design, architecture evaluation, and technology consultancy.",
    effectiveDate: new Date().toISOString().split("T")[0],
    confidentialityDurationMonths: 24,
    governingLaw: "Bangladesh",
    status: "draft" as CCNDAStatus,
  });

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setAuthReady(true);
    }, () => {
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ndaList, cliList] = await Promise.all([getNDAs(), getClients()]);
      setNdas(ndaList);
      setClients(cliList);
    } catch (err) {
      console.error("Error loading NDAs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const openAddModal = () => {
    setEditingNDA(null);
    setFormData({
      ndaType: "mutual",
      isMutual: true,
      clientId: "",
      disclosingPartyName: "DevEngine Software Studio",
      disclosingPartyRep: "DevEngine Authorized Management",
      disclosingPartyEmail: "hamim.leon@gmail.com",
      receivingPartyName: "",
      receivingPartyRep: "",
      receivingPartyEmail: "",
      purpose: "Proprietary software engineering, systems design, architecture evaluation, and technology consultancy.",
      effectiveDate: new Date().toISOString().split("T")[0],
      confidentialityDurationMonths: 24,
      governingLaw: "Bangladesh",
      status: "draft",
    });
    setIsModalOpen(true);
  };

  const handleClientSelect = (clientId: string) => {
    const cl = clients.find((c) => c.id === clientId);
    if (cl) {
      setFormData((prev) => ({
        ...prev,
        clientId,
        receivingPartyName: cl.legalName,
        receivingPartyRep: cl.authorizedSignatoryName || cl.primaryContactName,
        receivingPartyEmail: cl.email,
      }));
    } else {
      setFormData((prev) => ({ ...prev, clientId }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.receivingPartyName) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";

      if (editingNDA) {
        await updateNDA(editingNDA.id, formData, performedBy);
      } else {
        await createNDA(
          {
            ...formData,
            termMonths: 12,
            disputeResolution: "Arbitration",
            executionMethod: "electronic",
            legalReviewStatus: "approved",
            createdBy: performedBy,
          },
          performedBy
        );
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save NDA:", err);
      alert("Failed to save NDA.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (nda: CCNDA) => {
    try {
      setDownloadingId(nda.id);
      await generateNDAPdf(nda, { download: true });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate NDA PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const copyShareLink = (nda: CCNDA) => {
    const url = `${window.location.origin}/contract/view/${nda.id}?type=nda`;
    navigator.clipboard.writeText(url);
    setCopiedId(nda.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Archive / Unarchive Handler
  const handleArchive = async (nda: CCNDA, shouldArchive: boolean) => {
    try {
      setActionInProgress(nda.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await archiveNDA(nda.id, shouldArchive, performedBy);
      setNdas((prev) =>
        prev.map((item) => (item.id === nda.id ? { ...item, isArchived: shouldArchive } : item))
      );
      setNotice({
        text: shouldArchive
          ? `NDA ${nda.ndaNumber} moved to Archived.`
          : `NDA ${nda.ndaNumber} restored to Active.`,
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
  const handleRestore = async (nda: CCNDA) => {
    try {
      setActionInProgress(nda.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await restoreNDA(nda.id, performedBy);
      setNdas((prev) =>
        prev.map((item) => (item.id === nda.id ? { ...item, isDeleted: false, deletedAt: undefined } : item))
      );
      setNotice({ text: `NDA ${nda.ndaNumber} restored from Recycle Bin!`, type: "success" });
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Restore failed:", err);
      setNotice({ text: "Failed to restore NDA.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (nda: CCNDA, isPermanent: boolean) => {
    setDeleteModalState({
      isOpen: true,
      nda,
      isPermanent,
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModalState.nda) return;
    const { nda, isPermanent } = deleteModalState;
    try {
      setActionInProgress(nda.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      if (isPermanent) {
        await permanentlyDeleteNDA(nda.id, performedBy);
        setNdas((prev) => prev.filter((item) => item.id !== nda.id));
        setNotice({
          text: `NDA ${nda.ndaNumber} permanently deleted from Firestore.`,
          type: "info",
        });
      } else {
        await softDeleteNDA(nda.id, performedBy);
        setNdas((prev) =>
          prev.map((item) => (item.id === nda.id ? { ...item, isDeleted: true } : item))
        );
        setNotice({
          text: `NDA ${nda.ndaNumber} moved to Recycle Bin.`,
          type: "info",
        });
      }
      setTimeout(() => setNotice(null), 3500);
      setDeleteModalState({ isOpen: false, nda: null, isPermanent: false });
    } catch (err) {
      console.error("Delete failed:", err);
      setNotice({ text: "Failed to delete NDA.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Tab counts
  const tabCounts = React.useMemo(() => {
    const active = ndas.filter((n) => !n.isDeleted && !n.isArchived).length;
    const archived = ndas.filter((n) => !n.isDeleted && n.isArchived).length;
    const trash = ndas.filter((n) => n.isDeleted).length;
    return { active, archived, trash };
  }, [ndas]);

  const filtered = ndas.filter((n) => {
    if (viewTab === "trash") {
      if (!n.isDeleted) return false;
    } else if (viewTab === "archived") {
      if (n.isDeleted || !n.isArchived) return false;
    } else {
      // active
      if (n.isDeleted || n.isArchived) return false;
    }

    const matchesSearch =
      n.ndaNumber.toLowerCase().includes(search.toLowerCase()) ||
      n.receivingPartyName.toLowerCase().includes(search.toLowerCase()) ||
      n.disclosingPartyName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || n.status === statusFilter;
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
        <title>Non-Disclosure Agreements — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Non-Disclosure Agreements (NDAs)</h1>
            <p className="text-sm text-slate-400">
              Manage mutual and one-way confidentiality agreements before exchanging proprietary code and designs.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Draft New NDA
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/ndas" />

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
            Active NDAs
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
              placeholder="Search NDAs by ref #, counterparty, party name..."
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
              {Object.entries(CC_NDA_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* NDAs Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">NDA #</th>
                  <th className="py-3 px-4 font-medium">Agreement Type</th>
                  <th className="py-3 px-4 font-medium">Counterparty</th>
                  <th className="py-3 px-4 font-medium">Effective Date</th>
                  <th className="py-3 px-4 font-medium">Confidentiality Term</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((nda) => (
                  <tr key={nda.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pink-400">
                      {nda.ndaNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium uppercase">
                        {nda.isMutual ? "Mutual NDA" : "One-Way NDA"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{nda.receivingPartyName}</div>
                      <div className="text-[11px] text-slate-400">{nda.receivingPartyEmail || "No email"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(nda.effectiveDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {nda.confidentialityDurationMonths} Months
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={nda.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPdf(nda)}
                          disabled={downloadingId === nda.id}
                          title="Download NDA PDF"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          {downloadingId === nda.id ? (
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
                          onClick={() => copyShareLink(nda)}
                          title="Copy Link"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          {copiedId === nda.id ? (
                            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                        </button>

                        {/* Archive / Unarchive */}
                        {viewTab === "active" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(nda, true)}
                            disabled={actionInProgress === nda.id}
                            title="Archive NDA"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">archive</span>
                          </button>
                        )}

                        {viewTab === "archived" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(nda, false)}
                            disabled={actionInProgress === nda.id}
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
                            onClick={() => handleOpenDeleteModal(nda, false)}
                            disabled={actionInProgress === nda.id}
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
                              onClick={() => handleRestore(nda)}
                              disabled={actionInProgress === nda.id}
                              title="Restore to Active"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">restore_from_trash</span>
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(nda, true)}
                              disabled={actionInProgress === nda.id}
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
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      {viewTab === "trash"
                        ? "Recycle bin is empty. No deleted NDAs."
                        : viewTab === "archived"
                        ? "No archived NDAs found."
                        : "No active NDAs found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Draft NDA Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Draft Non-Disclosure Agreement</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">NDA Type</label>
                    <select
                      value={formData.ndaType}
                      onChange={(e) => {
                        const val = e.target.value as CCNDAType;
                        setFormData({ ...formData, ndaType: val, isMutual: val === "mutual" });
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="mutual">Mutual NDA (Two-Way Protection)</option>
                      <option value="one_way">One-Way NDA (DevEngine Disclosing)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Select Existing Client</label>
                    <select
                      value={formData.clientId}
                      onChange={(e) => handleClientSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Manual Entry / Other</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Counterparty Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Innovate Holdings LLC"
                      value={formData.receivingPartyName}
                      onChange={(e) => setFormData({ ...formData, receivingPartyName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Counterparty Signatory Name</label>
                    <input
                      type="text"
                      placeholder="Signatory Full Name"
                      value={formData.receivingPartyRep}
                      onChange={(e) => setFormData({ ...formData, receivingPartyRep: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Counterparty Email</label>
                    <input
                      type="email"
                      placeholder="legal@counterparty.com"
                      value={formData.receivingPartyEmail}
                      onChange={(e) => setFormData({ ...formData, receivingPartyEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Effective Date</label>
                    <input
                      type="date"
                      value={formData.effectiveDate}
                      onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Duration (Months)</label>
                    <input
                      type="number"
                      value={formData.confidentialityDurationMonths}
                      onChange={(e) =>
                        setFormData({ ...formData, confidentialityDurationMonths: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Governing Law</label>
                    <input
                      type="text"
                      value={formData.governingLaw}
                      onChange={(e) => setFormData({ ...formData, governingLaw: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Purpose / Scope of Disclosure</label>
                  <textarea
                    rows={2}
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-medium disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Generate NDA"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete & Recycle Bin Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, nda: null, isPermanent: false })}
          onConfirm={handleConfirmDelete}
          title={
            deleteModalState.isPermanent
              ? "Permanently Delete Non-Disclosure Agreement"
              : "Move NDA to Recycle Bin"
          }
          itemRef={deleteModalState.nda?.ndaNumber}
          itemTitle={deleteModalState.nda?.receivingPartyName}
          itemSubtitle={deleteModalState.nda?.isMutual ? "Mutual Non-Disclosure Agreement" : "One-Way Confidentiality Agreement"}
          isPermanent={deleteModalState.isPermanent}
          loading={actionInProgress === deleteModalState.nda?.id}
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
