// pages/admin/contract-center/agreements.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Master Service Agreements (MSAs)
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
  getServiceAgreements,
  getClients,
  getQuotations,
  createServiceAgreement,
  updateServiceAgreement,
  archiveServiceAgreement,
  softDeleteServiceAgreement,
  restoreServiceAgreement,
  permanentlyDeleteServiceAgreement,
} from "@/lib/services/contractCenterService";
import { generateServiceAgreementPdf } from "@/lib/services/ccPdfService";
import DeleteConfirmModal from "@/components/contract-center/DeleteConfirmModal";
import type {
  CCServiceAgreement,
  CCClient,
  CCQuotation,
  CCServiceAgreementStatus,
  CCIPOwnershipModel,
  CCCurrency,
} from "@/types/contractCenter";
import { CC_SERVICE_AGREEMENT_STATUS_LABELS } from "@/types/contractCenter";

export default function ServiceAgreementsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agreements, setAgreements] = useState<CCServiceAgreement[]>([]);
  const [clients, setClients] = useState<CCClient[]>([]);
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
    agreement: CCServiceAgreement | null;
    isPermanent: boolean;
  }>({
    isOpen: false,
    agreement: null,
    isPermanent: false,
  });

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    quotationId: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    currency: "BDT" as CCCurrency,
    totalValue: 500000,
    ipOwnershipModel: "client_ownership" as CCIPOwnershipModel,
    scopeOfWork: "Full-Stack Custom Platform Development & Cloud Architecture as designated in the attached Project Specifications.",
    governingLaw: "Bangladesh",
    status: "draft" as CCServiceAgreementStatus,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/agreements");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agrList, cliList, quoList] = await Promise.all([
        getServiceAgreements(),
        getClients(),
        getQuotations(),
      ]);
      setAgreements(agrList);
      setClients(cliList);
      setQuotations(quoList);
    } catch (err) {
      console.error("Error loading agreements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const openAddModal = () => {
    setFormData({
      title: "Master Software Services Agreement",
      clientId: clients[0]?.id || "",
      quotationId: "",
      effectiveDate: new Date().toISOString().split("T")[0],
      currency: "USD",
      totalValue: 5000,
      ipOwnershipModel: "client_ownership",
      scopeOfWork: "Full-Stack Custom Platform Development & Cloud Architecture as designated in the attached Project Specifications.",
      governingLaw: "Bangladesh",
      status: "draft",
    });
    setIsModalOpen(true);
  };

  const handleQuotationSelect = (quoId: string) => {
    const quo = quotations.find((q) => q.id === quoId);
    if (quo) {
      setFormData((prev) => ({
        ...prev,
        quotationId: quoId,
        clientId: quo.clientId,
        totalValue: quo.grandTotal || 0,
        currency: quo.currency,
        title: `Master Agreement — ${quo.title}`,
      }));
    } else {
      setFormData((prev) => ({ ...prev, quotationId: quoId }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selClient = clients.find((c) => c.id === formData.clientId);
      const selQuo = quotations.find((q) => q.id === formData.quotationId);

      await createServiceAgreement(
        {
          title: formData.title,
          clientId: formData.clientId,
          clientName: selClient ? selClient.legalName : undefined,
          clientSnapshot: selClient ? { ...selClient } : undefined,
          effectiveDate: formData.effectiveDate,
          quotationId: formData.quotationId || undefined,
          quotationNumber: selQuo ? selQuo.quotationNumber : undefined,
          currency: formData.currency,
          totalValue: formData.totalValue,
          paymentSchedule: selQuo?.paymentSchedule || [],
          status: formData.status,
          clauses: {
            engagementDescription: formData.title,
            scopeOfWork: formData.scopeOfWork,
            feesAndPayment: `Total engagement fee of ${formData.totalValue.toLocaleString()} ${formData.currency} payable via milestones.`,
            ipOwnershipModel: formData.ipOwnershipModel,
            ipDetails: "Upon receipt of complete payment, full title and ownership transfer to the Client.",
            disputeResolution: "Amicable consultation followed by binding arbitration.",
            governingLaw: formData.governingLaw,
            jurisdiction: formData.governingLaw,
            severability: true,
            ipReviewFlag: false,
            dataProtectionReviewFlag: false,
          },
          legalReviewStatus: "approved",
          createdBy: performedBy,
        },
        performedBy
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create service agreement:", err);
      alert("Failed to create agreement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async (agreement: CCServiceAgreement) => {
    try {
      setDownloadingId(agreement.id);
      await generateServiceAgreementPdf(agreement, { download: true });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF.");
    } finally {
      setDownloadingId(null);
    }
  };

  const copyShareLink = (agr: CCServiceAgreement) => {
    const url = `${window.location.origin}/contract/view/${agr.id}?type=agreement`;
    navigator.clipboard.writeText(url);
    setCopiedId(agr.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Archive / Unarchive Handler
  const handleArchive = async (agr: CCServiceAgreement, shouldArchive: boolean) => {
    try {
      setActionInProgress(agr.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await archiveServiceAgreement(agr.id, shouldArchive, performedBy);
      setAgreements((prev) =>
        prev.map((a) => (a.id === agr.id ? { ...a, isArchived: shouldArchive } : a))
      );
      setNotice({
        text: shouldArchive
          ? `Agreement ${agr.agreementNumber} moved to Archived.`
          : `Agreement ${agr.agreementNumber} restored to Active.`,
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
  const handleRestore = async (agr: CCServiceAgreement) => {
    try {
      setActionInProgress(agr.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await restoreServiceAgreement(agr.id, performedBy);
      setAgreements((prev) =>
        prev.map((a) => (a.id === agr.id ? { ...a, isDeleted: false, deletedAt: undefined } : a))
      );
      setNotice({ text: `Agreement ${agr.agreementNumber} restored from Recycle Bin!`, type: "success" });
      setTimeout(() => setNotice(null), 3500);
    } catch (err) {
      console.error("Restore failed:", err);
      setNotice({ text: "Failed to restore agreement.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Open Delete Modal (Soft or Permanent)
  const handleOpenDeleteModal = (agr: CCServiceAgreement, isPermanent: boolean) => {
    setDeleteModalState({
      isOpen: true,
      agreement: agr,
      isPermanent,
    });
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteModalState.agreement) return;
    const { agreement, isPermanent } = deleteModalState;
    try {
      setActionInProgress(agreement.id);
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      if (isPermanent) {
        await permanentlyDeleteServiceAgreement(agreement.id, performedBy);
        setAgreements((prev) => prev.filter((a) => a.id !== agreement.id));
        setNotice({
          text: `Agreement ${agreement.agreementNumber} permanently deleted from Firestore.`,
          type: "info",
        });
      } else {
        await softDeleteServiceAgreement(agreement.id, performedBy);
        setAgreements((prev) =>
          prev.map((a) => (a.id === agreement.id ? { ...a, isDeleted: true } : a))
        );
        setNotice({
          text: `Agreement ${agreement.agreementNumber} moved to Recycle Bin.`,
          type: "info",
        });
      }
      setTimeout(() => setNotice(null), 3500);
      setDeleteModalState({ isOpen: false, agreement: null, isPermanent: false });
    } catch (err) {
      console.error("Delete failed:", err);
      setNotice({ text: "Failed to delete agreement.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Tab counts
  const tabCounts = React.useMemo(() => {
    const active = agreements.filter((a) => !a.isDeleted && !a.isArchived).length;
    const archived = agreements.filter((a) => !a.isDeleted && a.isArchived).length;
    const trash = agreements.filter((a) => a.isDeleted).length;
    return { active, archived, trash };
  }, [agreements]);

  const filtered = agreements.filter((a) => {
    if (viewTab === "trash") {
      if (!a.isDeleted) return false;
    } else if (viewTab === "archived") {
      if (a.isDeleted || !a.isArchived) return false;
    } else {
      // active
      if (a.isDeleted || a.isArchived) return false;
    }

    const matchesSearch =
      a.agreementNumber.toLowerCase().includes(search.toLowerCase()) ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.clientName && a.clientName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
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
        <title>Master Service Agreements — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Master Service Agreements</h1>
            <p className="text-sm text-slate-400">
              Legally binding development contracts, IP transfer rights, liability terms, and milestone warranties.
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
            Draft Service Agreement
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/agreements" />

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
            Active Agreements
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
              placeholder="Search agreements by contract #, client, title..."
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
              {Object.entries(CC_SERVICE_AGREEMENT_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Agreements Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Agreement #</th>
                  <th className="py-3 px-4 font-medium">Title & Scope</th>
                  <th className="py-3 px-4 font-medium">Client</th>
                  <th className="py-3 px-4 font-medium">Contract Value</th>
                  <th className="py-3 px-4 font-medium">Effective Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((agr) => (
                  <tr key={agr.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pink-400">
                      {agr.agreementNumber}
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-semibold text-white truncate">{agr.title}</div>
                      <div className="text-[11px] text-slate-400">
                        Linked Quote: {agr.quotationNumber || "None"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{agr.clientName || "Client"}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">
                      {formatCCPrice(agr.totalValue || 0, agr.currency || "BDT")}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(agr.effectiveDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={agr.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownloadPdf(agr)}
                          disabled={downloadingId === agr.id}
                          title="Download Agreement PDF"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          {downloadingId === agr.id ? (
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
                          onClick={() => copyShareLink(agr)}
                          title="Copy Link"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                          {copiedId === agr.id ? (
                            <span className="text-[10px] text-emerald-400 font-bold">✓</span>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          )}
                        </button>

                        {viewTab !== "trash" && (
                          <Link
                            href={`/admin/contract-center/sow?agreementId=${agr.id}`}
                            className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium"
                          >
                            SOWs
                          </Link>
                        )}

                        {/* Archive / Unarchive */}
                        {viewTab === "active" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(agr, true)}
                            disabled={actionInProgress === agr.id}
                            title="Archive Agreement"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">archive</span>
                          </button>
                        )}

                        {viewTab === "archived" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(agr, false)}
                            disabled={actionInProgress === agr.id}
                            title="Restore to Active"
                            className="p-1.5 rounded-lg bg-slate-800 text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">unarchive</span>
                          </button>
                        )}

                        {/* Soft Delete (Send to Recycle Bin) */}
                        {viewTab !== "trash" && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(agr, false)}
                            disabled={actionInProgress === agr.id}
                            title="Move to Recycle Bin"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        )}

                        {/* Recycle Bin Actions: Restore & Permanent Delete */}
                        {viewTab === "trash" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRestore(agr)}
                              disabled={actionInProgress === agr.id}
                              title="Restore to Active"
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[14px]">restore_from_trash</span>
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDeleteModal(agr, true)}
                              disabled={actionInProgress === agr.id}
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
                        ? "Recycle bin is empty. No deleted service agreements."
                        : viewTab === "archived"
                        ? "No archived service agreements found."
                        : "No active service agreements found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Draft Master Service Agreement</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Agreement Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Sync from Approved Quotation</label>
                    <select
                      value={formData.quotationId}
                      onChange={(e) => handleQuotationSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">No linked quotation</option>
                      {quotations.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.quotationNumber} — {q.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Client Entity *</label>
                    <select
                      required
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Select Client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Contract Total Value</label>
                    <input
                      type="number"
                      value={formData.totalValue}
                      onChange={(e) => setFormData({ ...formData, totalValue: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as CCCurrency })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
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
                    <label className="block font-medium text-slate-300 mb-1">IP Ownership Model</label>
                    <select
                      value={formData.ipOwnershipModel}
                      onChange={(e) => setFormData({ ...formData, ipOwnershipModel: e.target.value as CCIPOwnershipModel })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="client_ownership">Full Client Ownership (IP Transfer upon payment)</option>
                      <option value="client_license">Client License</option>
                      <option value="devengine_ownership_licensed">DevEngine Ownership with Usage Rights</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Scope of Services Summary</label>
                  <textarea
                    rows={3}
                    value={formData.scopeOfWork}
                    onChange={(e) => setFormData({ ...formData, scopeOfWork: e.target.value })}
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
                    {saving ? "Creating..." : "Generate Agreement"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete & Recycle Bin Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({ isOpen: false, agreement: null, isPermanent: false })}
          onConfirm={handleConfirmDelete}
          title={
            deleteModalState.isPermanent
              ? "Permanently Delete Service Agreement"
              : "Move Service Agreement to Recycle Bin"
          }
          itemRef={deleteModalState.agreement?.agreementNumber}
          itemTitle={deleteModalState.agreement?.title}
          itemSubtitle={deleteModalState.agreement?.clientName || "Client"}
          isPermanent={deleteModalState.isPermanent}
          loading={actionInProgress === deleteModalState.agreement?.id}
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
