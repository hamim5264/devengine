import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import { getAgreementForStaff } from "@/lib/services/agreementService";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type { AgreementRecord } from "@/types/agreement";
import {
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS,
} from "@/types/agreement";

export default function StaffAgreementPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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
        const agr = await getAgreementForStaff({
          agreementId: staff.agreementId,
          staffId: staff.id,
          staffEmail: staff.email,
        });
        setAgreement(agr);
      } catch (err) {
        console.error("Failed to load staff agreement:", err);
      } finally {
        setLoading(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, [router]);

  const handleDownloadPdf = async () => {
    if (!agreement) return;
    setIsDownloadingPdf(true);
    try {
      await generateAgreementPdf(agreement, { download: true });
    } catch (err) {
      console.error("Failed to generate agreement PDF:", err);
      alert("Failed to generate PDF. Please try again or contact administration.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  return (
    <StaffLayout title="Employment Agreement | DevEngine Portal">
      <Head>
        <title>Employment Agreement | DevEngine Portal</title>
      </Head>

      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Employment Agreement & Contract
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Official legal contract, compensation terms, intellectual property, and employment conditions
            </p>
          </div>

          {agreement && (
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${isDownloadingPdf ? "animate-spin" : ""}`}>
                {isDownloadingPdf ? "refresh" : "download"}
              </span>
              <span>{isDownloadingPdf ? "Preparing Contract..." : "Download Official PDF"}</span>
            </button>
          )}
        </div>

        {!agreement ? (
          /* Empty State: No linked agreement yet */
          <div className="py-20 text-center rounded-2xl bg-neutral-900/40 border border-white/10 p-8 backdrop-blur-md">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mx-auto flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">description</span>
            </div>
            <h3 className="text-base font-bold text-white">Agreement Under Preparation</h3>
            <p className="text-xs text-neutral-400 mt-2 max-w-md mx-auto leading-relaxed">
              Your official employment agreement is currently being finalized by the DevEngine HR & legal department. Once executed, your full terms, compensation schedule, and signed legal contract will appear here.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-neutral-300">
              <span className="material-symbols-outlined text-[16px] text-amber-400">mail</span>
              <span>Contact HR: hamim.leon@gmail.com</span>
            </div>
          </div>
        ) : (
          /* Agreement Details View */
          <div className="space-y-6">
            {/* Top Status Card */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-purple-950/20 p-6 backdrop-blur-md relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {AGREEMENT_STATUS_LABELS[agreement.status] || agreement.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-neutral-300 border border-white/10">
                      Ref: {agreement.agreementNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] text-neutral-400 bg-white/5">
                      v{agreement.version || 1}.0
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-bold text-white mt-2.5">
                    {agreement.agreementTypeLabel || AGREEMENT_TYPE_LABELS[agreement.agreementType]}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-1">
                    Executed between DevEngine Systems and {agreement.developer?.fullName || (agreement as any).contributor?.contributorName || staffData?.name}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-neutral-300 self-start sm:self-auto space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500">Effective Date:</span>
                    <span className="font-semibold text-white">
                      {agreement.project?.agreementEffectiveDate || "N/A"}
                    </span>
                  </div>
                  {agreement.project?.expectedCompletionDate && (
                    <div className="flex justify-between gap-4">
                      <span className="text-neutral-500">End Date:</span>
                      <span className="font-semibold text-white">
                        {agreement.project.expectedCompletionDate}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-500">Jurisdiction:</span>
                    <span className="text-neutral-300">
                      {agreement.terms?.jurisdiction || "Dhaka, Bangladesh"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compensation Terms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Salary / Retainer */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <span className="material-symbols-outlined text-[18px]">payments</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Compensation</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {agreement.compensation?.currency === "BDT" ? "৳" : "$"}
                  {(
                    agreement.compensation?.monthlyRetainerAmount ||
                    agreement.compensation?.fixedAmount ||
                    agreement.compensation?.totalContractValue ||
                    0
                  ).toLocaleString()}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  {agreement.compensation?.paymentFrequency || "Monthly Retainer"} • Currency:{" "}
                  {agreement.compensation?.currency || "BDT"}
                </p>
                {agreement.compensation?.hourlyRate ? (
                  <p className="text-[11px] text-cyan-400 mt-1">
                    Hourly Rate: {agreement.compensation.currency === "BDT" ? "৳" : "$"}
                    {agreement.compensation.hourlyRate}/hr
                  </p>
                ) : null}
              </div>

              {/* Card 2: Shift & Working Hours */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-cyan-400 mb-2">
                  <span className="material-symbols-outlined text-[18px]">schedule</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Working Schedule</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {staffData?.shiftHours
                    ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}`
                    : "Standard Shift (09:00 - 18:00)"}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Availability: {agreement.compensation?.availabilityHoursPerWeek || 40} hrs/week
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Scheduled Off-Days: {(staffData?.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                </p>
              </div>

              {/* Card 3: Notice & Term */}
              <div className="p-5 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span className="text-xs font-semibold uppercase tracking-wider">Contract Term</span>
                </div>
                <div className="text-lg font-bold text-white">
                  {agreement.terms?.terminationNoticeDays
                    ? `${agreement.terms.terminationNoticeDays} Days Notice`
                    : "30 Days Notice"}
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Mutual written termination with full prorated payout
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  IP Protection: Full Work-for-Hire Assignment
                </p>
              </div>
            </div>

            {/* Scope of Work & Deliverables */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-400 text-[18px]">checklist</span>
                <span>Scope of Services & Position Responsibilities</span>
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {agreement.project?.description ||
                  "Contributor is engaged to provide professional engineering, software design, code review, product deployment, and technical maintenance under DevEngine standards."}
              </p>

              {agreement.deliverables && agreement.deliverables.length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">
                    Key Performance Deliverables:
                  </span>
                  <div className="space-y-2">
                    {agreement.deliverables.map((del) => (
                      <div
                        key={del.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-neutral-300 flex items-start justify-between gap-4"
                      >
                        <div>
                          <span className="font-semibold text-white block">{del.title}</span>
                          <span className="text-neutral-400 text-[11px] mt-0.5 block">
                            {del.description}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-300 flex-shrink-0">
                          {del.priority} Priority
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Legal Summary Highlights */}
            <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-sm space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-[18px]">security</span>
                <span>Legal Clauses & Intellectual Property Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs text-neutral-300">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-semibold text-white block text-[11px]">
                    1. Work Made for Hire & IP Assignment
                  </span>
                  <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                    All source code, designs, algorithms, architectures, and deliverables created during the term belong exclusively to DevEngine Systems.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-semibold text-white block text-[11px]">
                    2. Strict Non-Disclosure (NDA)
                  </span>
                  <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                    Confidential business metrics, source repos, client data, and proprietary frameworks must not be disclosed or leaked to any third parties.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-semibold text-white block text-[11px]">
                    3. Non-Solicitation
                  </span>
                  <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                    Contributor agrees not to solicit company clients or personnel for independent commercial endeavors for {agreement.terms?.nonSolicitationYears || 2} years following termination.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <span className="font-semibold text-white block text-[11px]">
                    4. Payment Timelines
                  </span>
                  <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                    All compensations are processed within {agreement.compensation?.paymentDuePeriodDays || 7} business days of the designated payment cycle.
                  </p>
                </div>
              </div>
            </div>

            {/* Download Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white">Need a Signed Hard Copy or PDF?</h4>
                <p className="text-xs text-neutral-400 mt-0.5">
                  You can download the publication-grade multi-page legal contract PDF at any time.
                </p>
              </div>
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>Download PDF Contract</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
