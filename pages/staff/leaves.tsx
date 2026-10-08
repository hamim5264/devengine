import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getStaffLeaveRequests,
  submitLeaveRequest,
  getStaffOffDaySwapRequests,
  submitOffDaySwapRequest,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type {
  LeaveRequest,
  LeaveType,
  OffDaySwapRequest,
} from "@/types/staffEcoSystem";
import { LEAVE_TYPE_LABELS } from "@/types/staffEcoSystem";

export default function StaffLeavesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [activeTab, setActiveTab] = useState<"leaves" | "swaps">("leaves");
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [swaps, setSwaps] = useState<OffDaySwapRequest[]>([]);

  // Apply Leave Modal
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState<{
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
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [leaveSuccessMsg, setLeaveSuccessMsg] = useState("");

  // Off-Day Swap Modal
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapForm, setSwapForm] = useState({
    currentOffDate: "",
    requestedWorkDate: "",
    reason: "",
  });
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [swapSuccessMsg, setSwapSuccessMsg] = useState("");

  const loadData = async (staff: StaffMember) => {
    try {
      const [leavesData, swapsData] = await Promise.all([
        getStaffLeaveRequests(staff.id),
        getStaffOffDaySwapRequests(staff.id),
      ]);
      setLeaves(leavesData);
      setSwaps(swapsData);
    } catch (err) {
      console.error("Error loading leave & swap data:", err);
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
      await loadData(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) return;
    setIsSubmittingLeave(true);
    setLeaveSuccessMsg("");
    try {
      const created = await submitLeaveRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        emergencyContact: leaveForm.emergencyContact,
      });

      setLeaves((prev) => [created, ...prev]);
      setLeaveSuccessMsg("Leave application submitted for approval!");
      setTimeout(() => {
        setShowApplyLeaveModal(false);
        setLeaveSuccessMsg("");
        setLeaveForm({
          leaveType: "casual",
          startDate: "",
          endDate: "",
          reason: "",
          emergencyContact: "",
        });
      }, 1200);
    } catch (err) {
      console.error("Submit leave failed:", err);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSubmitSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !swapForm.currentOffDate || !swapForm.requestedWorkDate || !swapForm.reason.trim()) return;
    setIsSubmittingSwap(true);
    setSwapSuccessMsg("");
    try {
      const created = await submitOffDaySwapRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        currentOffDate: swapForm.currentOffDate,
        requestedWorkDate: swapForm.requestedWorkDate,
        reason: swapForm.reason,
      });
      setSwaps((prev) => [created, ...prev]);
      setSwapSuccessMsg("Off-day swap request submitted for approval!");
      setTimeout(() => {
        setShowSwapModal(false);
        setSwapSuccessMsg("");
        setSwapForm({ currentOffDate: "", requestedWorkDate: "", reason: "" });
      }, 1200);
    } catch (err) {
      console.error("Submit swap failed:", err);
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  return (
    <StaffLayout title="Leaves & Off-Day Swaps | DevEngine Portal">
      <Head>
        <title>Leaves & Off-Day Swaps | DevEngine Portal</title>
      </Head>

      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">beach_access</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Leaves & Off-Day Swaps
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Apply for formal leave, check approval status, and request off-day swap adjustments
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSwapModal(true)}
              className="py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
              <span>Swap Off-Day</span>
            </button>
            <button
              onClick={() => setShowApplyLeaveModal(true)}
              className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* Schedule & Roster Info Banner */}
        <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
            </span>
            <div>
              <span className="text-neutral-400 block text-[11px]">Assigned Off-Days:</span>
              <span className="text-white font-semibold">
                {(staffData.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
              </span>
            </div>
          </div>

          <div className="sm:border-l sm:border-white/10 sm:pl-4">
            <span className="text-neutral-400 block text-[11px]">Shift Timing:</span>
            <span className="text-white font-semibold">
              {staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
            </span>
          </div>

          <div className="sm:border-l sm:border-white/10 sm:pl-4">
            <span className="text-neutral-400 block text-[11px]">Active Requests:</span>
            <span className="text-purple-300 font-semibold">
              {leaves.filter((l) => l.status === "pending").length} Leaves, {swaps.filter((s) => s.status === "pending").length} Swaps
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs">
          <button
            onClick={() => setActiveTab("leaves")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "leaves" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Leave Applications ({leaves.length})
          </button>
          <button
            onClick={() => setActiveTab("swaps")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "swaps" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Off-Day Swap Requests ({swaps.length})
          </button>
        </div>

        {/* Tab 1: Leaves */}
        {activeTab === "leaves" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Leave Type</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Days</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Admin Remark</th>
                    <th className="py-3 px-4">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500">
                        No leave requests submitted yet.
                      </td>
                    </tr>
                  ) : (
                    leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          {LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                          {l.startDate} → {l.endDate}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-cyan-300">
                          {l.totalDays} {l.totalDays === 1 ? "day" : "days"}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                          {l.reason}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              l.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : l.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {l.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {l.adminRemark || "—"}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 whitespace-nowrap text-[11px]">
                          {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Off-Day Swaps */}
        {activeTab === "swaps" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Scheduled Off-Day</th>
                    <th className="py-3 px-4">Swap To Day Off</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Admin Remark</th>
                    <th className="py-3 px-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {swaps.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No off-day swap requests submitted.
                      </td>
                    </tr>
                  ) : (
                    swaps.map((s) => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          {s.currentOffDate} (Work Day)
                        </td>
                        <td className="py-3 px-4 text-cyan-300 font-semibold whitespace-nowrap">
                          {s.requestedWorkDate} (Take Off)
                        </td>
                        <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                          {s.reason}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              s.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : s.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {s.adminRemark || "—"}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 whitespace-nowrap text-[11px]">
                          {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Apply Leave */}
        {showApplyLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">beach_access</span>
                  <span>Apply for Leave</span>
                </h3>
                <button onClick={() => setShowApplyLeaveModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitLeave} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Leave Type</label>
                  <select
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((lt) => (
                      <option key={lt} value={lt}>
                        {LEAVE_TYPE_LABELS[lt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Specify the reason for taking leave..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={leaveForm.emergencyContact}
                    onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: e.target.value })}
                    placeholder="Phone or alternative contact"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {leaveSuccessMsg && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    {leaveSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApplyLeaveModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingLeave ? "Submitting..." : "Apply Leave"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Swap Off-Day */}
        {showSwapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">swap_horiz</span>
                  <span>Request Off-Day Swap</span>
                </h3>
                <button onClick={() => setShowSwapModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitSwap} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Scheduled Off-Day (You will work on this day)
                  </label>
                  <input
                    type="date"
                    required
                    value={swapForm.currentOffDate}
                    onChange={(e) => setSwapForm({ ...swapForm, currentOffDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Requested Day Off (You want off on this day)
                  </label>
                  <input
                    type="date"
                    required
                    value={swapForm.requestedWorkDate}
                    onChange={(e) => setSwapForm({ ...swapForm, requestedWorkDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Reason for Off-Day Swap
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={swapForm.reason}
                    onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                    placeholder="Provide reason for this shift swap..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {swapSuccessMsg && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    {swapSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSwapModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSwap}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingSwap ? "Submitting..." : "Submit Swap Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
