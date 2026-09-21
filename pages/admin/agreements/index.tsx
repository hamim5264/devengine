import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  AgreementRecord,
  AgreementStatus,
  AgreementType,
  AGREEMENT_STATUS_LABELS,
  AGREEMENT_TYPE_LABELS,
} from "@/types/agreement";
import {
  getAgreements,
  duplicateAgreement,
  updateAgreementStatus,
  deleteAgreement,
} from "@/lib/services/agreementService";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";
import AgreementPreviewModal from "@/components/agreements/AgreementPreviewModal";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const CONTRACT_MODEL_CONFIG: Record<
  AgreementType,
  { label: string; icon: string; badgeClass: string }
> = {
  profit_participation: {
    label: "Profit Participation",
    icon: "trending_up",
    badgeClass: "bg-amber-500/10 border-amber-500/30 text-amber-300",
  },
  hourly: {
    label: "Hourly Billable",
    icon: "timer",
    badgeClass: "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
  },
  milestone: {
    label: "Milestone / Phase",
    icon: "flag",
    badgeClass: "bg-indigo-500/10 border-indigo-500/30 text-indigo-300",
  },
  fixed_completion: {
    label: "Fixed Completion",
    icon: "task_alt",
    badgeClass: "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
  },
  hybrid: {
    label: "Hybrid (Base + Profit)",
    icon: "hub",
    badgeClass: "bg-purple-500/10 border-purple-500/30 text-purple-300",
  },
  retainer: {
    label: "Monthly Retainer",
    icon: "calendar_month",
    badgeClass: "bg-sky-500/10 border-sky-500/30 text-sky-300",
  },
};

export default function AgreementsIndexPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [agreements, setAgreements] = useState<AgreementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "updated">("newest");

  // Copy-to-clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Preview Modal
  const [previewRecord, setPreviewRecord] = useState<AgreementRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/agreements");
    });
    return () => unsub();
  }, [router]);

  // Load agreements
  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getAgreements();
      setAgreements(list);
    } catch (err: any) {
      console.error("Error loading agreements:", err);
      setNotice({ text: "Failed to load agreements from Firestore.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Handle Download PDF directly from table
  const handleDownloadPdf = async (record: AgreementRecord) => {
    try {
      setDownloadingId(record.id);
      await generateAgreementPdf(record, { download: true });
      setNotice({ text: `Downloaded PDF for ${record.agreementNumber}`, type: "success" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error("Download failed:", err);
      setNotice({ text: "Failed to generate agreement PDF.", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle Duplicate
  const handleDuplicate = async (record: AgreementRecord) => {
    try {
      setActionInProgress(record.id);
      const newId = await duplicateAgreement(record.id, ADMIN_EMAIL);
      setNotice({ text: `Agreement duplicated successfully! Opening new draft…`, type: "success" });
      setTimeout(() => {
        router.push(`/admin/agreements/${newId}/edit`);
      }, 700);
    } catch (err) {
      console.error("Duplication failed:", err);
      setNotice({ text: "Failed to duplicate agreement.", type: "error" });
      setActionInProgress(null);
    }
  };

  // Handle Status Update
  const handleStatusChange = async (record: AgreementRecord, newStatus: AgreementStatus) => {
    try {
      setActionInProgress(record.id);
      await updateAgreementStatus(record.id, newStatus, ADMIN_EMAIL);
      setAgreements((prev) =>
        prev.map((a) => (a.id === record.id ? { ...a, status: newStatus } : a))
      );
      setNotice({ text: `Status updated to ${AGREEMENT_STATUS_LABELS[newStatus]}`, type: "success" });
      setTimeout(() => setNotice(null), 3000);
    } catch (err) {
      console.error("Status update failed:", err);
      setNotice({ text: "Failed to update status.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle Delete Draft
  const handleDelete = async (record: AgreementRecord) => {
    if (record.status === "finalized") {
      alert("Finalized corporate agreements cannot be deleted directly. Mark as Terminated or Cancelled instead.");
      return;
    }
    if (!confirm(`Permanently remove draft agreement ${record.agreementNumber}?`)) return;

    try {
      setActionInProgress(record.id);
      await deleteAgreement(record.id);
      setAgreements((prev) => prev.filter((a) => a.id !== record.id));
      setNotice({ text: `Agreement ${record.agreementNumber} deleted.`, type: "info" });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      console.error("Delete failed:", err);
      setNotice({ text: "Failed to delete agreement.", type: "error" });
    } finally {
      setActionInProgress(null);
    }
  };

  // Filter and sort calculations
  const filteredAgreements = useMemo(() => {
    return agreements
      .filter((a) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchId = a.agreementNumber?.toLowerCase().includes(q);
          const matchProject = a.project.projectName?.toLowerCase().includes(q);
          const matchDev = a.developer.fullName?.toLowerCase().includes(q);
          const matchEmail = a.developer.email?.toLowerCase().includes(q);
          if (!matchId && !matchProject && !matchDev && !matchEmail) return false;
        }
        // Type filter
        if (filterType !== "all" && a.agreementType !== filterType) return false;
        // Status filter
        if (filterStatus !== "all" && a.status !== filterStatus) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "newest") {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === "oldest") {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });
  }, [agreements, searchQuery, filterType, filterStatus, sortBy]);

  // 4 Metrics
  const metrics = useMemo(() => {
    const total = agreements.length;
    const drafts = agreements.filter((a) => a.status === "draft" || a.status === "preview").length;
    const finalized = agreements.filter((a) => a.status === "finalized" || a.status === "signed" || a.status === "active").length;
    const profitSharingCount = agreements.filter((a) => a.agreementType === "profit_participation" || a.agreementType === "hybrid").length;

    return { total, drafts, finalized, profitSharingCount };
  }, [agreements]);

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#38f2ff" />
        <p className="mt-4 font-mono text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Authorization…
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Project Agreements & Contracts — DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-cyan-400 transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span>Projects</span>
                <span>/</span>
                <span className="text-cyan-400 font-bold">Agreements & Contracts</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg">
                  <span className="material-symbols-outlined text-[22px]">history_edu</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Project Agreements & Contracts
                </h1>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Contract Engine Active
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2 max-w-3xl">
                Draft, execute, preview, and archive official multi-page A4 project agreements across profit participation, hourly, milestone, fixed-fee, and retainer engagements.
              </p>
            </div>

            {/* Header CTA */}
            <div className="flex items-center gap-3">
              <Link
                href="/admin/agreements/create"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>Create Agreement</span>
              </Link>
            </div>
          </div>

          {/* Flash Feedback Notice */}
          {notice && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-mono border backdrop-blur-xl shadow-xl transition-all ${
                notice.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : notice.type === "info"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">
                  {notice.type === "error" ? "error" : "check_circle"}
                </span>
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* 4 Quick Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Contracts</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{metrics.total}</p>
              <p className="text-[11px] text-gray-500 font-mono mt-1">Managed in Firestore</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Active Drafts</span>
              <p className="text-2xl font-bold font-mono text-amber-300 mt-1">{metrics.drafts}</p>
              <p className="text-[11px] text-gray-500 font-mono mt-1">In review or customization</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Finalized & Executed</span>
              <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{metrics.finalized}</p>
              <p className="text-[11px] text-gray-500 font-mono mt-1">Locked official records</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Profit Participation</span>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">{metrics.profitSharingCount}</p>
              <p className="text-[11px] text-gray-500 font-mono mt-1">Revenue-share models</p>
            </div>
          </div>

          {/* Search, Filter & Sort Bar */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined text-gray-400 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, project, or developer…"
                className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Type Filter */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label="Filter by agreement type"
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 pr-8 text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                >
                  <option value="all">All Agreement Types</option>
                  <option value="profit_participation">Profit Participation</option>
                  <option value="hourly">Hourly</option>
                  <option value="milestone">Milestone / Phase</option>
                  <option value="fixed_completion">Fixed Completion</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="retainer">Monthly Retainer</option>
                </select>
                <span className="material-symbols-outlined text-gray-400 text-sm absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Status Filter */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by agreement status"
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 pr-8 text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="preview">Preview</option>
                  <option value="finalized">Finalized</option>
                  <option value="sent">Sent</option>
                  <option value="signed">Signed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="terminated">Terminated</option>
                </select>
                <span className="material-symbols-outlined text-gray-400 text-sm absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>

              {/* Sort By */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  aria-label="Sort agreements"
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 pr-8 text-xs text-gray-300 font-mono focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="updated">Sort: Recently Updated</option>
                </select>
                <span className="material-symbols-outlined text-gray-400 text-sm absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  expand_more
                </span>
              </div>
            </div>
          </div>

          {/* Agreements Table / Empty State */}
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-12">
              <HelixLoader size={44} color="#38f2ff" />
              <p className="text-xs font-mono text-gray-400 tracking-wider uppercase">Loading Agreements…</p>
            </div>
          ) : filteredAgreements.length === 0 ? (
            /* Empty State */
            <div className="p-12 sm:p-16 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <span className="material-symbols-outlined text-3xl">assignment_add</span>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                  No agreements yet
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  Create your first project agreement to manage developer engagements, contractual deliverables, and compensation models.
                </p>
              </div>
              <Link
                href="/admin/agreements/create"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>Create Agreement</span>
              </Link>
            </div>
          ) : (
            /* Table Data */
            <div className="rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1180px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
                      <th className="py-4 px-5 whitespace-nowrap min-w-[210px]" style={{ whiteSpace: "nowrap" }}>Agreement ID</th>
                      <th className="py-4 px-5 min-w-[260px]">Project Scope</th>
                      <th className="py-4 px-5 min-w-[240px]">Contributor</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[190px]" style={{ whiteSpace: "nowrap" }}>Contract Model</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[130px]" style={{ whiteSpace: "nowrap" }}>Status</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[150px]" style={{ whiteSpace: "nowrap" }}>Effective Date</th>
                      <th className="py-4 px-5 text-right whitespace-nowrap min-w-[160px]" style={{ whiteSpace: "nowrap" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                    {filteredAgreements.map((item) => {
                      const modelCfg = CONTRACT_MODEL_CONFIG[item.agreementType] || {
                        label: item.agreementType,
                        icon: "description",
                        badgeClass: "bg-white/[0.05] border-white/[0.1] text-gray-300",
                      };

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* ID & Version - STRICTLY ONE LINE */}
                          <td className="py-4 px-5 whitespace-nowrap min-w-[210px]" style={{ whiteSpace: "nowrap" }}>
                            <div className="flex items-center gap-2 whitespace-nowrap" style={{ whiteSpace: "nowrap" }}>
                              <span className="text-white group-hover:text-cyan-400 transition-colors font-bold tracking-wide text-sm font-mono whitespace-nowrap select-all shrink-0" style={{ whiteSpace: "nowrap" }}>
                                {item.agreementNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.agreementNumber, `id-${item.id}`)}
                                className="text-gray-500 hover:text-cyan-300 p-0.5 rounded transition-colors cursor-pointer shrink-0"
                                title="Copy Agreement ID"
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {copiedId === `id-${item.id}` ? "check" : "content_copy"}
                                </span>
                              </button>
                              <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.08] text-[10px] text-gray-400 font-mono font-normal shrink-0" style={{ whiteSpace: "nowrap" }}>
                                v{item.version}
                              </span>
                            </div>
                          </td>

                          {/* Project Scope */}
                          <td className="py-4 px-5 min-w-[260px]">
                            <span className="text-white font-bold block truncate max-w-[260px] text-sm" title={item.project.projectName}>
                              {item.project.projectName}
                            </span>
                            <span className="text-[11px] text-gray-400 block truncate max-w-[260px] mt-0.5">
                              {item.project.projectType || "Software Application"}
                            </span>
                          </td>

                          {/* Contributor with Copyable Email */}
                          <td className="py-4 px-5 min-w-[240px]">
                            <span className="text-white font-bold block truncate max-w-[220px] text-sm tracking-wide">
                              {item.developer.fullName}
                            </span>
                            <span className="text-[11px] text-cyan-400 block truncate max-w-[220px] font-medium mt-0.5">
                              {item.developer.role}
                            </span>
                            {item.developer.email && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(item.developer.email, `mail-${item.id}`)}
                                className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 text-gray-300 hover:text-cyan-200 border border-white/[0.08] hover:border-cyan-500/30 transition-all text-[11px] font-mono group/email cursor-pointer active:scale-95 whitespace-nowrap"
                                style={{ whiteSpace: "nowrap" }}
                                title="Click to copy contributor email"
                              >
                                <span className="material-symbols-outlined text-[13px] text-cyan-400 shrink-0">
                                  {copiedId === `mail-${item.id}` ? "check" : "mail"}
                                </span>
                                <span className="truncate max-w-[170px]">{item.developer.email}</span>
                                <span className="material-symbols-outlined text-[12px] text-gray-500 group-hover/email:text-cyan-300 transition-colors shrink-0">
                                  {copiedId === `mail-${item.id}` ? "" : "content_copy"}
                                </span>
                                {copiedId === `mail-${item.id}` && (
                                  <span className="text-[10px] text-emerald-400 font-bold ml-0.5 shrink-0">Copied!</span>
                                )}
                              </button>
                            )}
                          </td>

                          {/* Contract Model */}
                          <td className="py-4 px-5 whitespace-nowrap min-w-[190px]" style={{ whiteSpace: "nowrap" }}>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-medium whitespace-nowrap shadow-sm ${modelCfg.badgeClass}`} style={{ whiteSpace: "nowrap" }}>
                              <span className="material-symbols-outlined text-sm shrink-0">{modelCfg.icon}</span>
                              <span className="whitespace-nowrap">{modelCfg.label}</span>
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap min-w-[130px]" style={{ whiteSpace: "nowrap" }}>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                              item.status === "finalized"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                                : item.status === "signed" || item.status === "active"
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                                : item.status === "terminated" || item.status === "cancelled"
                                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            }`} style={{ whiteSpace: "nowrap" }}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                item.status === "finalized" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                              }`} />
                              <span className="whitespace-nowrap">{AGREEMENT_STATUS_LABELS[item.status] || item.status}</span>
                            </span>
                          </td>

                          {/* Effective Date - STRICTLY ONE LINE */}
                          <td className="py-4 px-5 text-gray-300 text-[11px] whitespace-nowrap min-w-[150px]" style={{ whiteSpace: "nowrap" }}>
                            <div className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono" style={{ whiteSpace: "nowrap" }}>
                              <span className="material-symbols-outlined text-xs text-cyan-400 shrink-0">calendar_today</span>
                              <span className="whitespace-nowrap shrink-0" style={{ whiteSpace: "nowrap" }}>
                                {item.project.agreementEffectiveDate || "Unset"}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview */}
                              <button
                                type="button"
                                onClick={() => setPreviewRecord(item)}
                                title="Preview Agreement"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-300 text-gray-400 transition-all border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center cursor-pointer active:scale-90"
                              >
                                <span className="material-symbols-outlined text-base">visibility</span>
                              </button>

                              {/* Download PDF */}
                              <button
                                type="button"
                                onClick={() => handleDownloadPdf(item)}
                                disabled={downloadingId === item.id}
                                title="Download PDF"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-300 text-gray-400 transition-all border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-90"
                              >
                                <span className="material-symbols-outlined text-base">
                                  {downloadingId === item.id ? "hourglass_top" : "download"}
                                </span>
                              </button>

                              {/* Edit */}
                              <Link
                                href={`/admin/agreements/${item.id}/edit`}
                                title="Edit Agreement"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-300 hover:text-white transition-all border border-white/[0.08] flex items-center justify-center active:scale-90"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </Link>

                              {/* Duplicate */}
                              <button
                                type="button"
                                onClick={() => handleDuplicate(item)}
                                disabled={actionInProgress === item.id}
                                title="Duplicate Agreement"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-300 hover:text-white transition-all border border-white/[0.08] flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-90"
                              >
                                <span className="material-symbols-outlined text-base">content_copy</span>
                              </button>

                              {/* Delete (Drafts only) */}
                              {item.status !== "finalized" && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(item)}
                                  disabled={actionInProgress === item.id}
                                  title="Delete Draft"
                                  className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 hover:text-rose-400 text-gray-500 transition-all border border-white/[0.08] hover:border-rose-500/30 flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-90"
                                >
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* In-browser Preview Modal */}
        {previewRecord && (
          <AgreementPreviewModal
            record={previewRecord}
            isOpen={true}
            onClose={() => setPreviewRecord(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
