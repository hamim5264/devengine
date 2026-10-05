import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getStaffLeaveRequests,
  submitLeaveRequest,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type { LeaveRequest, LeaveType } from "@/types/staffEcoSystem";
import { LEAVE_TYPE_LABELS } from "@/types/staffEcoSystem";

export default function StaffLeavesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [form, setForm] = useState<{
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
    emergencyContact: string;
  }>({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
    emergencyContact: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadLeaves = async (staff: StaffMember) => {
    try {
      const data = await getStaffLeaveRequests(staff.id);
      setLeaves(data);
    } catch (err) {
      console.error("Error loading leaves:", err);
    }
  };

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
      await loadLeaves(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !form.startDate || !form.endDate || !form.reason.trim()) return;
    setIsSubmitting(true);
    setSuccessMsg("");
    try {
      const created = await submitLeaveRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        emergencyContact: form.emergencyContact,
      });

      setLeaves((prev) => [created, ...prev]);
      setSuccessMsg("Leave application submitted for approval!");
      setTimeout(() => {
        setShowApplyModal(false);
        setSuccessMsg("");
        setForm({
          leaveType: "casual",
          startDate: "",
          endDate: "",
          reason: "",
          emergencyContact: "",
        });
      }, 1200);
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const rejectedLeaves = leaves.filter((l) => l.status === "rejected");
  const totalApprovedDays = approvedLeaves.reduce((sum, l) => sum + (l.totalDays || 0), 0);

  return (
    <StaffLayout title="Leave Applications | Staff Portal">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-6xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                Leave Management & Applications
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Apply for planned leaves and monitor administrative approval statuses.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowApplyModal(true)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold transition-all shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 cursor-pointer w-fit"
            >
              <span className="material-symbols-outlined text-base">beach_access</span>
              Apply for Leave
            </button>
          </div>

          {/* ── Leave Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Applications
              </span>
              <span className="text-2xl font-bold font-mono text-white mt-1 block">
                {leaves.length}
              </span>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Pending Review
              </span>
              <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
                {pendingLeaves.length}
              </span>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Approved Leaves
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">
                {approvedLeaves.length}
              </span>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                Approved Days Off
              </span>
              <span className="text-2xl font-bold font-mono text-cyan-300 mt-1 block">
                {totalApprovedDays} days
              </span>
            </div>
          </div>

          {/* ── Leave History Table ── */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold font-['Space_Grotesk'] text-white">
              Application History
            </h2>

            <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Leave Type</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Admin Remarks</th>
                      <th className="py-3 px-4">Applied On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {leaves.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500 font-mono">
                          No leave applications submitted yet.
                        </td>
                      </tr>
                    ) : (
                      leaves.map((leave) => (
                        <tr key={leave.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {LEAVE_TYPE_LABELS[leave.leaveType] || leave.leaveType}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-300 whitespace-nowrap">
                            {leave.startDate} → {leave.endDate}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-cyan-400">
                            {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">
                            {leave.reason}
                          </td>
                          <td className="py-3.5 px-4">
                            {leave.status === "approved" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Approved
                              </span>
                            ) : leave.status === "rejected" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Pending Review
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400">
                            {leave.adminRemark || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px] whitespace-nowrap">
                            {new Date(leave.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Apply Leave Modal ── */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">beach_access</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Apply for Leave
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Leave Type *
                </label>
                <select
                  value={form.leaveType}
                  onChange={(e) => setForm({ ...form, leaveType: e.target.value as LeaveType })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(LEAVE_TYPE_LABELS).map(([key, label]) => (
                    <option key={key} value={key} className="bg-[#0e0e1a] text-white">
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide details or context for the requested leave..."
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Emergency Contact / Phone while away (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={form.emergencyContact}
                  onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  {successMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
