import AdminOverlay from "@/components/admin/AdminOverlay";
import { AdminSelect } from "@/components/admin/AdminFormControls";
// pages/admin/manage-certificates.tsx
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import type { EmployeeCertificate, CertificateType, CertificateStatus } from "@/types/certificate";
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPE_ICONS,
  CERTIFICATE_STATUS_CONFIG,
} from "@/types/certificate";
import type { StaffMember } from "@/types/staff";
import { getStaffMembers } from "@/lib/services/staffService";
import {
  getCertificates,
  createDirectCertificate,
  deliverCertificate,
  rejectCertificate,
  updateCertificate,
  deleteCertificate,
  getDefaultCertificateBody,
} from "@/lib/services/certificateService";
import { generateCertificatePdf } from "@/lib/utils/generateCertificatePdf";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageCertificatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [certificates, setCertificates] = useState<EmployeeCertificate[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Filtering & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [selectedCert, setSelectedCert] = useState<EmployeeCertificate | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Issue modal state
  const [issueStaffId, setIssueStaffId] = useState("");
  const [issueType, setIssueType] = useState<CertificateType>("experience");
  const [issueCustomTitle, setIssueCustomTitle] = useState("");
  const [issueBody, setIssueBody] = useState("");
  const [issueRating, setIssueRating] = useState("Excellent");
  const [issueConduct, setIssueConduct] = useState("Character and conduct during tenure have been exemplary.");
  const [issueDeliverDirect, setIssueDeliverDirect] = useState(true);

  // Review / Edit modal state
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editConduct, setEditConduct] = useState("");
  const [editSignatory, setEditSignatory] = useState("Hamim Leon");
  const [editSignatoryTitle, setEditSignatoryTitle] = useState("Chief Executive Officer");

  // Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [certs, staff] = await Promise.all([getCertificates(), getStaffMembers()]);
      setCertificates(certs);
      setStaffList(staff);
    } catch (err) {
      console.error("Failed to load certificates:", err);
      setNotice({ type: "error", text: "Failed to load certificates." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Sync search query from URL parameter if provided (e.g. from Employee Dossier)
  useEffect(() => {
    if (router.query.search && typeof router.query.search === "string") {
      setSearchQuery(router.query.search);
    }
  }, [router.query.search]);

  useEffect(() => {
    if (!router.isReady || !staffList.length || typeof router.query.issue !== "string" || !router.query.issue) return;
    const person = staffList.find(item => item.id === router.query.issue);
    if (person) { setIssueStaffId(person.id); setShowIssueModal(true); }
  }, [router.isReady, router.query.issue, staffList]);

  // Sync issue modal defaults when staff or type changes
  useEffect(() => {
    const targetStaff = staffList.find((s) => s.id === issueStaffId);
    if (targetStaff) {
      const body = getDefaultCertificateBody(
        issueType,
        targetStaff.name,
        targetStaff.staffType,
        targetStaff.joiningDate,
        targetStaff.resignationDetails?.lastWorkingDay
      );
      setIssueBody(body);
      setIssueCustomTitle(CERTIFICATE_TYPE_LABELS[issueType].toUpperCase());
    }
  }, [issueStaffId, issueType, staffList]);

  // Open review modal
  const openReviewModal = (cert: EmployeeCertificate) => {
    setSelectedCert(cert);
    setEditTitle(cert.customTitle || (CERTIFICATE_TYPE_LABELS[cert.type] || "Service Certificate").toUpperCase());
    setEditBody(cert.certificateBody || "");
    setEditRating(cert.performanceRating || "Excellent");
    setEditConduct(cert.conductRemarks || "Character and conduct during tenure have been exemplary.");
    setEditSignatory(cert.issuedBy || "Hamim Leon");
    setEditSignatoryTitle(cert.signatoryTitle || "Chief Executive Officer");
    setShowReviewModal(true);
  };

  // Filtered certificates
  const filteredCertificates = useMemo(() => {
    return certificates.filter((cert) => {
      if (statusFilter !== "all" && cert.status !== statusFilter) return false;
      if (typeFilter !== "all" && cert.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (cert.employeeName || "").toLowerCase().includes(q);
        const matchesNum = (cert.certificateNumber || "").toLowerCase().includes(q);
        const matchesEmail = (cert.employeeEmail || "").toLowerCase().includes(q);
        const matchesRole = (cert.employeeRole || "").toLowerCase().includes(q);
        if (!matchesName && !matchesNum && !matchesEmail && !matchesRole) return false;
      }
      return true;
    });
  }, [certificates, statusFilter, typeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = certificates.length;
    const delivered = certificates.filter((c) => c.status === "delivered").length;
    const pending = certificates.filter((c) => c.status === "pending").length;
    const inReview = certificates.filter((c) => c.status === "in_review").length;
    const rejected = certificates.filter((c) => c.status === "rejected").length;
    return { total, delivered, pending, inReview, rejected };
  }, [certificates]);

  // Handle direct certificate creation
  const handleCreateDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStaff = staffList.find((s) => s.id === issueStaffId);
    if (!targetStaff) {
      setNotice({ type: "error", text: "Please select an employee." });
      return;
    }

    setProcessing(true);
    try {
      await createDirectCertificate({
        employeeId: targetStaff.id,
        employeeName: targetStaff.name,
        employeeEmail: targetStaff.email,
        employeeRole: targetStaff.staffType,
        joiningDate: targetStaff.joiningDate,
        lastWorkingDay: targetStaff.resignationDetails?.lastWorkingDay,
        type: issueType,
        customTitle: issueCustomTitle,
        certificateBody: issueBody,
        performanceRating: issueRating,
        conductRemarks: issueConduct,
        deliverImmediately: issueDeliverDirect,
      });

      setNotice({
        type: "success",
        text: `Certificate ${issueDeliverDirect ? "issued and delivered" : "created as draft"} for ${targetStaff.name}.`,
      });
      setShowIssueModal(false);
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to issue certificate." });
    } finally {
      setProcessing(false);
    }
  };

  // Handle approve & deliver
  const handleApproveAndDeliver = async () => {
    if (!selectedCert) return;
    setProcessing(true);
    try {
      await deliverCertificate(selectedCert.id, {
        customTitle: editTitle,
        certificateBody: editBody,
        performanceRating: editRating,
        conductRemarks: editConduct,
        issuedBy: editSignatory,
        signatoryTitle: editSignatoryTitle,
      });

      setNotice({
        type: "success",
        text: `Certificate ${selectedCert.certificateNumber} approved and delivered to ${selectedCert.employeeName}!`,
      });
      setShowReviewModal(false);
      setSelectedCert(null);
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to deliver certificate." });
    } finally {
      setProcessing(false);
    }
  };

  // Handle reject
  const handleRejectConfirm = async () => {
    if (!selectedCert || !rejectionReason.trim()) return;
    setProcessing(true);
    try {
      await rejectCertificate(selectedCert.id, rejectionReason.trim());
      setNotice({
        type: "info",
        text: `Certificate request rejected for ${selectedCert.employeeName}.`,
      });
      setShowRejectModal(false);
      setShowReviewModal(false);
      setSelectedCert(null);
      setRejectionReason("");
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to reject certificate." });
    } finally {
      setProcessing(false);
    }
  };

  // Handle delete
  const handleDelete = async (cert: EmployeeCertificate) => {
    if (!confirm(`Are you sure you want to delete certificate record ${cert.certificateNumber}?`)) return;
    try {
      await deleteCertificate(cert.id);
      setNotice({ type: "info", text: "Certificate record removed." });
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to delete certificate." });
    }
  };

  // Handle PDF Download
  const handleDownloadPdf = async (cert: EmployeeCertificate) => {
    try {
      await generateCertificatePdf(cert);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setNotice({ type: "error", text: "Failed to generate certificate PDF." });
    }
  };

  if (!authReady || loading) {
    return (
      <AdminLayout title="Certificate Management | DevEngine Admin">
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <HelixLoader size={48} color="#2cecf7" text="Loading Certificate Hub..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Certificate Management | DevEngine Admin">
      <Head>
        <title>Certificate & Credential Management | DevEngine Admin</title>
      </Head>

      <div className="space-y-6 pb-16">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7] shadow-inner">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                  Certificate & Credential Hub
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-[var(--devengine-muted)] font-mono mt-0.5">
                Issue, customize, and deliver official verifiable service certificates, relieving letters & verification statements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                if (staffList.length > 0 && !issueStaffId) {
                  setIssueStaffId(staffList[0].id);
                }
                setShowIssueModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold text-xs font-mono shadow-md shadow-[#2cecf7]/20 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
              <span>Issue New Certificate</span>
            </button>
          </div>
        </div>

        {/* Global Notice Toast */}
        {notice && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-mono flex items-center justify-between ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : notice.type === "error"
                ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-[var(--devengine-muted)] hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--devengine-muted)]">
              Total Certificates
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
              {stats.total}
            </div>
            <div className="text-[10px] font-mono text-[var(--devengine-muted)]">
              All credentials on record
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
              Pending Requests
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-amber-400">
              {stats.pending}
            </div>
            <div className="text-[10px] font-mono text-[var(--devengine-muted)]">
              Awaiting admin review
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400">
              Delivered & Verified
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-emerald-400">
              {stats.delivered}
            </div>
            <div className="text-[10px] font-mono text-[var(--devengine-muted)]">
              Active with downloadable PDF
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400">
              Rejected Requests
            </span>
            <div className="text-2xl font-bold font-['Space_Grotesk'] text-rose-400">
              {stats.rejected}
            </div>
            <div className="text-[10px] font-mono text-[var(--devengine-muted)]">
              Non-approved applications
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "All Records", count: stats.total },
              { id: "pending", label: "Pending", count: stats.pending },
              { id: "delivered", label: "Delivered", count: stats.delivered },
              { id: "rejected", label: "Rejected", count: stats.rejected },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                      : "bg-[var(--devengine-raised)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] border border-[var(--devengine-border)]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      active ? "bg-black/20 text-black font-bold" : "bg-[var(--devengine-surface)] text-[var(--devengine-muted)]"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Type Select */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff, code, role..."
                className="w-full h-9 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl pl-8 pr-3 text-xs text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] font-mono focus:outline-none transition-colors"
              />
              <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
            </div>

            <div className="relative sm:w-48">
              <AdminSelect
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full h-9 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer transition-colors"
              >
                <option value="all">All Certificate Types</option>
                <option value="experience">Experience</option>
                <option value="resignation_relieving">Relieving / Resignation</option>
                <option value="internship">Internship</option>
                <option value="salary">Salary Verification</option>
                <option value="recommendation">Recommendation</option>
                <option value="custom">Custom</option>
              </AdminSelect>
              <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Certificate Cards / Table */}
        {filteredCertificates.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] flex items-center justify-center mx-auto text-[var(--devengine-muted)]">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <p className="text-sm font-mono text-[var(--devengine-text)] font-bold">
              No certificate records found
            </p>
            <p className="text-xs font-mono text-[var(--devengine-muted)] max-w-md mx-auto">
              There are no certificates matching your current filter. You can issue a new certificate proactively or wait for employee requests.
            </p>
            <button
              type="button"
              onClick={() => setShowIssueModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              Issue Certificate
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCertificates.map((cert) => {
              const statusCfg = CERTIFICATE_STATUS_CONFIG[cert.status] || CERTIFICATE_STATUS_CONFIG.pending;
              const typeIcon = CERTIFICATE_TYPE_ICONS[cert.type] || "verified";

              return (
                <div
                  key={cert.id}
                  className="p-5 rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Header: Type & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold tracking-wider text-[#2cecf7] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{typeIcon}</span>
                        {CERTIFICATE_TYPE_LABELS[cert.type] || cert.type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className="material-symbols-outlined text-xs">{statusCfg.icon}</span>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Employee & Certificate Info */}
                    <div>
                      <h3 className="text-base font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                        {cert.employeeName}
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--devengine-muted)]">
                        {cert.employeeRole} • {cert.employeeEmail}
                      </p>
                    </div>

                    {/* Reference & Reason */}
                    <div className="p-3 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--devengine-muted)] uppercase">Ref Number:</span>
                        <span className="text-[11px] text-[#2cecf7] font-bold font-mono">{cert.certificateNumber}</span>
                      </div>
                      {cert.reason && (
                        <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--devengine-border)]/50">
                          <span className="text-[10px] text-[var(--devengine-muted)] uppercase">Purpose:</span>
                          <span className="text-[11px] text-[var(--devengine-text)] text-right truncate">{cert.reason}</span>
                        </div>
                      )}
                      {cert.issuedAt && (
                        <div className="flex items-center justify-between text-[10px] text-[var(--devengine-muted)]">
                          <span>Issued On:</span>
                          <span>{new Date(cert.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      )}
                      {cert.rejectionReason && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px]">
                          <strong>Reason:</strong> {cert.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-[var(--devengine-border)] flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openReviewModal(cert)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 text-xs font-mono text-[var(--devengine-text)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {cert.status === "pending" ? "rate_review" : "edit_document"}
                      </span>
                      <span>{cert.status === "pending" ? "Review & Prepare" : "Edit / Inspect"}</span>
                    </button>

                    {cert.status === "delivered" && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(cert)}
                        title="Download Verified PDF"
                        className="p-2 rounded-xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(cert)}
                      title="Delete Record"
                      className="p-2 rounded-xl bg-[var(--devengine-raised)] hover:bg-rose-500/10 hover:text-rose-400 border border-[var(--devengine-border)] text-[var(--devengine-muted)] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Issue New Certificate ── */}
      {showIssueModal && (
        <AdminOverlay onClose={() => { if (!processing) setShowIssueModal(false); }} label="Issue certificate" className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div className="relative w-full max-w-2xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7]">
                  <span className="material-symbols-outlined text-xl">workspace_premium</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                    Issue Service Certificate
                  </h2>
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono">
                    Prepare and award an official verified credential to a team member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDirect} className="space-y-4">
              {notice?.type === "error" && <p role="alert" className="text-rose-400">{notice.text}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Select Employee *
                  </label>
                  <div className="relative">
                    <AdminSelect
                      value={issueStaffId}
                      onChange={(e) => setIssueStaffId(e.target.value)}
                      required
                      className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                    >
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[var(--devengine-surface)] text-[var(--devengine-text)]">
                          {s.name} ({s.staffType})
                        </option>
                      ))}
                    </AdminSelect>
                    <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Certificate Type *
                  </label>
                  <div className="relative">
                    <AdminSelect
                      value={issueType}
                      onChange={(e) => setIssueType(e.target.value as CertificateType)}
                      required
                      className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="experience">Experience & Service Certificate</option>
                      <option value="resignation_relieving">Relieving & Release Certificate</option>
                      <option value="internship">Internship Completion Certificate</option>
                      <option value="salary">Salary Verification Statement</option>
                      <option value="recommendation">Letter of Recommendation</option>
                      <option value="custom">Custom Certificate</option>
                    </AdminSelect>
                    <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Certificate Header Title
                </label>
                <input
                  type="text"
                  value={issueCustomTitle}
                  onChange={(e) => setIssueCustomTitle(e.target.value)}
                  placeholder="e.g. CERTIFICATE OF EXPERIENCE & SERVICE"
                  className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Official Statement Body
                </label>
                <textarea
                  rows={4}
                  value={issueBody}
                  onChange={(e) => setIssueBody(e.target.value)}
                  className="w-full bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl p-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Performance Rating
                  </label>
                  <div className="relative">
                    <AdminSelect
                      value={issueRating}
                      onChange={(e) => setIssueRating(e.target.value)}
                      className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                    </AdminSelect>
                    <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Conduct Remarks
                  </label>
                  <input
                    type="text"
                    value={issueConduct}
                    onChange={(e) => setIssueConduct(e.target.value)}
                    className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[var(--devengine-text)] block">
                    Deliver Immediately to Employee
                  </span>
                  <span className="text-[10px] text-[var(--devengine-muted)] font-mono">
                    Employee will receive a notification and can download PDF instantly
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={issueDeliverDirect}
                  onChange={(e) => setIssueDeliverDirect(e.target.checked)}
                  className="w-4 h-4 accent-[#2cecf7] cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-[var(--devengine-border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono shadow-md cursor-pointer disabled:opacity-50"
                >
                  {processing ? "Generating..." : issueDeliverDirect ? "Issue & Deliver" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </AdminOverlay>
      )}

      {/* ── Modal: Review, Edit & Deliver Certificate ── */}
      {showReviewModal && selectedCert && (
        <AdminOverlay onClose={() => { if (!processing) setShowReviewModal(false); }} label="Review certificate" className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div className="relative w-full max-w-3xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-5 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7]">
                  <span className="material-symbols-outlined text-xl">rate_review</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                    Review Certificate: {selectedCert.certificateNumber}
                  </h2>
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono">
                    Applicant: {selectedCert.employeeName} ({selectedCert.employeeRole})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Applicant request reason */}
            {selectedCert.reason && (
              <div className="p-3.5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--devengine-muted)] uppercase tracking-wider text-[10px]">
                    Employee Stated Purpose:
                  </span>
                  <span className="text-[#2cecf7] font-bold">{selectedCert.reason}</span>
                </div>
                {selectedCert.employeeNotes && (
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono italic">
                    &ldquo;{selectedCert.employeeNotes}&rdquo;
                  </p>
                )}
              </div>
            )}

            {/* Editable Content */}
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Certificate Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Official Statement Body
                </label>
                <textarea
                  rows={5}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl p-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Performance Rating
                  </label>
                  <div className="relative">
                    <AdminSelect
                      value={editRating}
                      onChange={(e) => setEditRating(e.target.value)}
                      className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                    >
                      <option value="Outstanding">Outstanding</option>
                      <option value="Excellent">Excellent</option>
                      <option value="Very Good">Very Good</option>
                      <option value="Good">Good</option>
                    </AdminSelect>
                    <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Conduct Remarks
                  </label>
                  <input
                    type="text"
                    value={editConduct}
                    onChange={(e) => setEditConduct(e.target.value)}
                    className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Signatory Name
                  </label>
                  <input
                    type="text"
                    value={editSignatory}
                    onChange={(e) => setEditSignatory(e.target.value)}
                    className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Signatory Title
                  </label>
                  <input
                    type="text"
                    value={editSignatoryTitle}
                    onChange={(e) => setEditSignatoryTitle(e.target.value)}
                    className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[var(--devengine-border)] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold cursor-pointer transition-all"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf({ ...selectedCert, customTitle: editTitle, certificateBody: editBody })}
                  className="px-3.5 py-2 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-text)] flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  Preview PDF
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndDeliver}
                  disabled={processing}
                  className="px-5 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  <span>{processing ? "Delivering..." : "Approve & Deliver"}</span>
                </button>
              </div>
            </div>
          </div>
        </AdminOverlay>
      )}

      {/* ── Modal: Reject Request Reason ── */}
      {showRejectModal && selectedCert && (
        <AdminOverlay onClose={() => { if (!processing) setShowRejectModal(false); }} label="Reject certificate" className="fixed inset-0 z-[10000] overflow-y-auto p-4 flex justify-center items-center">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRejectModal(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="material-symbols-outlined text-2xl">cancel</span>
              <h3 className="text-base font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                Reject Certificate Request
              </h3>
            </div>
            <p className="text-xs text-[var(--devengine-muted)] font-mono">
              Please explain why this request is being rejected. The employee will receive this feedback in their portal.
            </p>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Incomplete handover clearance or tenure criteria not met..."
              className="w-full bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-rose-400 rounded-xl p-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none resize-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim() || processing}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs font-mono cursor-pointer disabled:opacity-50"
              >
                {processing ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </AdminOverlay>
      )}
    </AdminLayout>
  );
}
