// pages/staff/certificates.tsx
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getCertificatesForStaff,
  requestCertificate,
} from "@/lib/services/certificateService";
import { generateCertificatePdf } from "@/lib/utils/generateCertificatePdf";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type { EmployeeCertificate, CertificateType } from "@/types/certificate";
import {
  CERTIFICATE_TYPE_LABELS,
  CERTIFICATE_TYPE_ICONS,
  CERTIFICATE_STATUS_CONFIG,
} from "@/types/certificate";

export default function StaffCertificatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [certificates, setCertificates] = useState<EmployeeCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  // Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqType, setReqType] = useState<CertificateType>("experience");
  const [reqReason, setReqReason] = useState("");
  const [reqNotes, setReqNotes] = useState("");
  const [reqLastDay, setReqLastDay] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // View Certificate Modal State
  const [viewingCert, setViewingCert] = useState<EmployeeCertificate | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        router.replace("/staff");
        return;
      }
      setStaffData(staff);

      try {
        const certs = await getCertificatesForStaff(staff.id);
        setCertificates(certs);
      } catch (err) {
        console.error("Failed to load employee certificates:", err);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  const refreshCertificates = async () => {
    if (!staffData) return;
    try {
      const certs = await getCertificatesForStaff(staffData.id);
      setCertificates(certs);
    } catch (err) {
      console.error("Refresh certificates error:", err);
    }
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !reqReason.trim()) return;

    setSubmitting(true);
    try {
      await requestCertificate({
        employeeId: staffData.id,
        employeeName: staffData.name,
        employeeEmail: staffData.email,
        employeeRole: staffData.staffType,
        joiningDate: staffData.joiningDate,
        lastWorkingDay: reqType === "resignation_relieving" ? reqLastDay : undefined,
        type: reqType,
        reason: reqReason.trim(),
        employeeNotes: reqNotes.trim(),
      });

      setNotice({
        type: "success",
        text: `Your request for ${CERTIFICATE_TYPE_LABELS[reqType]} has been submitted to DevEngine administration!`,
      });
      setShowRequestModal(false);
      setReqReason("");
      setReqNotes("");
      setReqLastDay("");
      await refreshCertificates();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to submit certificate request." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdf = async (cert: EmployeeCertificate) => {
    setIsDownloadingPdf(true);
    try {
      await generateCertificatePdf(cert);
    } catch (err) {
      console.error("Failed to generate certificate PDF:", err);
      setNotice({ type: "error", text: "Failed to download PDF certificate." });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!authReady || loading) {
    return (
      <StaffLayout title="Certificates & Credentials | DevEngine">
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <HelixLoader size={48} color="#2cecf7" text="Loading Certificates..." />
        </div>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout title="Certificates & Credentials | DevEngine">
      <Head>
        <title>Certificates & Credentials | DevEngine Employee Portal</title>
      </Head>

      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7] shadow-inner">
              <span className="material-symbols-outlined text-2xl">workspace_premium</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                  Certificates & Credentials
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30">
                  OFFICIAL
                </span>
              </div>
              <p className="text-xs text-[var(--devengine-muted)] font-mono mt-0.5">
                Request and download verified experience, relieving, internship, and employment verification certificates.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold text-xs font-mono shadow-md shadow-[#2cecf7]/20 transition-all cursor-pointer active:scale-95 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
            <span>Request Certificate</span>
          </button>
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

        {/* Certificates List */}
        {certificates.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] flex items-center justify-center mx-auto text-[var(--devengine-muted)]">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                No Certificates Requested Yet
              </h3>
              <p className="text-xs font-mono text-[var(--devengine-muted)] max-w-md mx-auto">
                Need an official Experience Certificate, Relieving Letter, Internship Certificate, or Salary Statement? Click below to submit a request to administration.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono cursor-pointer shadow-sm hover:opacity-95"
            >
              <span className="material-symbols-outlined text-sm font-bold">add</span>
              <span>Submit Certificate Request</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert) => {
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
                      <span className="text-[11px] font-mono font-bold tracking-wider text-[#2cecf7] flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">{typeIcon}</span>
                        {CERTIFICATE_TYPE_LABELS[cert.type] || cert.type}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border flex items-center gap-1 ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                      >
                        <span className="material-symbols-outlined text-xs">{statusCfg.icon}</span>
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Certificate Code & Title */}
                    <div>
                      <h3 className="text-base font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                        {cert.customTitle || CERTIFICATE_TYPE_LABELS[cert.type]}
                      </h3>
                      <p className="text-[11px] font-mono text-[var(--devengine-muted)]">
                        Credential ID: <span className="text-[#2cecf7] font-bold">{cert.certificateNumber}</span>
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="p-3.5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-1.5 text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--devengine-muted)] uppercase">Purpose / Reason:</span>
                        <span className="text-[11px] text-[var(--devengine-text)] font-semibold truncate">{cert.reason}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[var(--devengine-muted)] uppercase">Requested On:</span>
                        <span className="text-[11px] text-[var(--devengine-muted)]">
                          {new Date(cert.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                      {cert.issuedAt && (
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--devengine-border)] text-emerald-400">
                          <span className="text-[10px] uppercase font-bold">Issued By:</span>
                          <span className="text-[11px] font-bold">{cert.issuedBy || "DevEngine Systems"}</span>
                        </div>
                      )}
                      {cert.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] space-y-0.5">
                          <span className="font-bold block uppercase text-[9px]">Admin Feedback:</span>
                          <span>{cert.rejectionReason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-[var(--devengine-border)] flex items-center justify-between gap-2.5">
                    {cert.status === "delivered" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setViewingCert(cert)}
                          className="flex-1 py-2 px-3 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-text)] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>View Certificate</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(cert)}
                          disabled={isDownloadingPdf}
                          className="py-2 px-4 rounded-xl bg-[#2cecf7] hover:bg-[#2cecf7]/90 text-[#02040a] font-bold text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-md shadow-[#2cecf7]/20"
                        >
                          <span className="material-symbols-outlined text-sm font-bold">download</span>
                          <span>{isDownloadingPdf ? "Saving..." : "Download PDF"}</span>
                        </button>
                      </>
                    ) : cert.status === "rejected" ? (
                      <span className="text-[11px] font-mono text-rose-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">info</span>
                        Request was reviewed and closed by admin
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Awaiting administrator review and delivery
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Request Certificate ── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={() => setShowRequestModal(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-5 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7]">
                  <span className="material-symbols-outlined text-xl">workspace_premium</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                    Request Official Certificate
                  </h2>
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono">
                    Submit your request to DevEngine administration
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Certificate Type *
                </label>
                <div className="relative">
                  <select
                    value={reqType}
                    onChange={(e) => setReqType(e.target.value as CertificateType)}
                    required
                    className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="experience">Experience & Service Certificate</option>
                    <option value="resignation_relieving">Relieving & Release Certificate (After Resignation)</option>
                    <option value="internship">Internship Completion Certificate</option>
                    <option value="salary">Salary & Employment Verification Statement</option>
                    <option value="recommendation">Letter of Recommendation</option>
                  </select>
                  <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {reqType === "resignation_relieving" && (
                <div>
                  <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                    Last Working Day / Relieving Date *
                  </label>
                  <input
                    type="date"
                    value={reqLastDay}
                    onChange={(e) => setReqLastDay(e.target.value)}
                    required
                    className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Purpose / Intended Use *
                </label>
                <input
                  type="text"
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="e.g. Higher Studies, Next Job Application, Visa, Bank Account"
                  required
                  className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Any specific designation, date specifics, or remarks you'd like included..."
                  className="w-full bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl p-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 border-t border-[var(--devengine-border)] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: View Certificate Preview ── */}
      {viewingCert && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => setViewingCert(null)} />
          <div className="relative w-full max-w-3xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
            {/* Header bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--devengine-border)]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#2cecf7] font-bold">
                  Official Verified Credential
                </span>
                <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                  {viewingCert.customTitle || CERTIFICATE_TYPE_LABELS[viewingCert.type]}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingCert(null)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Certificate Preview Card */}
            <div className="p-6 sm:p-8 rounded-2xl bg-[var(--devengine-raised)] border-2 border-[#2cecf7]/40 space-y-6 text-center shadow-inner relative overflow-hidden">
              <div className="space-y-1">
                <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--devengine-muted)]">
                  DEVENGINE SYSTEMS INC.
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                  {viewingCert.customTitle || CERTIFICATE_TYPE_LABELS[viewingCert.type].toUpperCase()}
                </h3>
                <div className="w-16 h-0.5 bg-[#2cecf7] mx-auto my-2" />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-mono text-[var(--devengine-muted)] italic">
                  This official credential is presented to
                </p>
                <h4 className="text-2xl font-bold text-[#2cecf7] font-['Space_Grotesk']">
                  {viewingCert.employeeName}
                </h4>
                <p className="text-xs font-mono font-bold text-[var(--devengine-text)]">
                  {viewingCert.employeeRole}
                </p>
              </div>

              <p className="text-xs sm:text-sm font-mono text-[var(--devengine-text)] leading-relaxed max-w-xl mx-auto">
                {viewingCert.certificateBody}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-[var(--devengine-border)] text-left text-xs font-mono">
                <div>
                  <span className="text-[9px] text-[var(--devengine-muted)] block uppercase">Cert No:</span>
                  <span className="text-[#2cecf7] font-bold text-[11px]">{viewingCert.certificateNumber}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[var(--devengine-muted)] block uppercase">Issue Date:</span>
                  <span className="text-[11px]">
                    {viewingCert.issuedAt
                      ? new Date(viewingCert.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "Official"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[var(--devengine-muted)] block uppercase">Rating:</span>
                  <span className="text-[11px] text-emerald-400 font-bold">{viewingCert.performanceRating || "Excellent"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[var(--devengine-muted)] block uppercase">Verification Code:</span>
                  <span className="text-[11px] font-mono">{viewingCert.verificationCode}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)]">
                <div>
                  <span className="font-bold text-[var(--devengine-text)] block">{viewingCert.issuedBy || "Hamim Leon"}</span>
                  <span className="text-[10px]">{viewingCert.signatoryTitle || "Chief Executive Officer"}</span>
                </div>
                <div className="w-12 h-12 rounded-full border border-[#2cecf7] flex items-center justify-center text-[#2cecf7] text-[8px] font-bold">
                  VERIFIED
                </div>
              </div>
            </div>

            {/* Bottom Download Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setViewingCert(null)}
                className="px-4 py-2.5 rounded-xl border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(viewingCert)}
                disabled={isDownloadingPdf}
                className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs font-mono shadow-md cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm font-bold">download</span>
                <span>{isDownloadingPdf ? "Generating..." : "Download Official PDF"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
