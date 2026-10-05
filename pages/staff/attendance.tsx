import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getStaffAttendanceForDate,
  getStaffAttendanceHistory,
  getStaffAttendanceRequests,
  clockInStaff,
  clockOutStaff,
  submitMissedAttendanceRequest,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
} from "@/types/staffEcoSystem";
import { ATTENDANCE_STATUS_LABELS } from "@/types/staffEcoSystem";

export default function StaffAttendancePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [missedRequests, setMissedRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"history" | "requests">("history");

  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  // Missed Request Modal
  const [showMissedModal, setShowMissedModal] = useState(false);
  const [missedForm, setMissedForm] = useState({
    targetDate: "",
    clockInTime: "09:30 AM",
    clockOutTime: "06:30 PM",
    reason: "",
  });
  const [isSubmittingMissed, setIsSubmittingMissed] = useState(false);
  const [missedSuccess, setMissedSuccess] = useState("");
  const [missedError, setMissedError] = useState("");

  const yesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadData = async (staff: StaffMember) => {
    try {
      const today = getTodayDateString();
      const [todayRec, history, reqs] = await Promise.all([
        getStaffAttendanceForDate(staff.id, today),
        getStaffAttendanceHistory(staff.id, 60),
        getStaffAttendanceRequests(staff.id),
      ]);
      setTodayAttendance(todayRec);
      setAttendanceHistory(history);
      setMissedRequests(reqs);
    } catch (err) {
      console.error("Error loading attendance:", err);
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

  const handleClockIn = async () => {
    if (!staffData || isClockingIn) return;
    setIsClockingIn(true);
    try {
      const rec = await clockInStaff({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
      });
      setTodayAttendance(rec);
      setAttendanceHistory((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffData || isClockingOut) return;
    setIsClockingOut(true);
    try {
      const rec = await clockOutStaff(staffData.id);
      if (rec) {
        setTodayAttendance(rec);
        setAttendanceHistory((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)]);
      }
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleSubmitMissed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !missedForm.targetDate || !missedForm.reason.trim()) return;
    setIsSubmittingMissed(true);
    setMissedError("");
    setMissedSuccess("");
    try {
      const req = await submitMissedAttendanceRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        targetDate: missedForm.targetDate,
        clockInTime: missedForm.clockInTime,
        clockOutTime: missedForm.clockOutTime,
        reason: missedForm.reason,
      });
      setMissedRequests((prev) => [req, ...prev]);
      setMissedSuccess("Regularization request submitted to admin for approval.");
      setTimeout(() => {
        setShowMissedModal(false);
        setMissedSuccess("");
        setMissedForm({
          targetDate: "",
          clockInTime: "09:30 AM",
          clockOutTime: "06:30 PM",
          reason: "",
        });
      }, 1500);
    } catch (err: any) {
      setMissedError(err?.message || "Failed to submit request");
    } finally {
      setIsSubmittingMissed(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const presentCount = attendanceHistory.filter((a) => a.status === "present").length;
  const pendingMissedCount = missedRequests.filter((r) => r.status === "pending").length;

  return (
    <StaffLayout title="My Attendance | Staff Portal">
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
                My Attendance & Roster
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Log attendance for today or request missed attendance for past dates.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowMissedModal(true)}
              className="py-2.5 px-4 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer w-fit"
            >
              <span className="material-symbols-outlined text-base">history_toggle_off</span>
              Request Missed Date
            </button>
          </div>

          {/* ── Today's Clock In Banner ── */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-violet-950/30 via-[#0c0c16] to-cyan-950/20 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">alarm_on</span>
              </div>
              <div>
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                  Today's Attendance ({getTodayDateString()})
                </span>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {todayAttendance ? (
                    <>
                      <span className="text-lg font-bold font-mono text-emerald-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Clocked In: {todayAttendance.clockInTime}
                      </span>
                      {todayAttendance.clockOutTime && (
                        <span className="text-sm font-mono text-cyan-400">
                          | Clocked Out: {todayAttendance.clockOutTime}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-base font-bold font-mono text-amber-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Not Clocked In Today
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!todayAttendance ? (
                <button
                  type="button"
                  onClick={handleClockIn}
                  disabled={isClockingIn}
                  className="py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold tracking-wide transition-all shadow-lg hover:shadow-violet-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">login</span>
                  {isClockingIn ? "Clocking In..." : "Clock In Now"}
                </button>
              ) : !todayAttendance.clockOutTime ? (
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={isClockingOut}
                  className="py-3 px-6 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 text-xs font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {isClockingOut ? "Clocking Out..." : "Clock Out"}
                </button>
              ) : (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-medium flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  Completed for Today
                </div>
              )}
            </div>
          </div>

          {/* ── Summary Stats ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Days Logged
              </span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {attendanceHistory.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Days Present
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                {presentCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                Regularized Logs
              </span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {attendanceHistory.filter((a) => a.isRegularized).length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Pending Requests
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {pendingMissedCount}
              </span>
            </div>
          </div>

          {/* ── Tab Selector ── */}
          <div className="flex items-center gap-3 border-b border-white/[0.08] pb-1">
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
                activeTab === "history"
                  ? "text-violet-400 border-b-2 border-violet-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Attendance Records ({attendanceHistory.length})
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer flex items-center gap-2 ${
                activeTab === "requests"
                  ? "text-violet-400 border-b-2 border-violet-500"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Missed Date Requests
              {pendingMissedCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {pendingMissedCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Content Table ── */}
          {activeTab === "history" ? (
            <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Clock In</th>
                      <th className="py-3 px-4">Clock Out</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {attendanceHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                          No attendance records found yet.
                        </td>
                      </tr>
                    ) : (
                      attendanceHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {rec.date}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {ATTENDANCE_STATUS_LABELS[rec.status] || rec.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-300">
                            {rec.clockInTime || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-300">
                            {rec.clockOutTime || "—"}
                          </td>
                          <td className="py-3.5 px-4">
                            {rec.isRegularized ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                Regularized
                              </span>
                            ) : (
                              <span className="text-gray-500 font-mono text-[11px]">Direct Log</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-gray-400 max-w-xs truncate">
                            {rec.note || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Missed Date</th>
                      <th className="py-3 px-4">Proposed Times</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Admin Remarks</th>
                      <th className="py-3 px-4">Requested At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {missedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                          No missed attendance requests submitted.
                        </td>
                      </tr>
                    ) : (
                      missedRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">
                            {req.targetDate}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-300">
                            {req.clockInTime} → {req.clockOutTime || "—"}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">
                            {req.reason}
                          </td>
                          <td className="py-3.5 px-4">
                            {req.status === "approved" ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Approved
                              </span>
                            ) : req.status === "rejected" ? (
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
                            {req.adminRemark || "—"}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-gray-500 text-[11px]">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Missed Attendance Modal ── */}
      {showMissedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">history_toggle_off</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Request Missed Attendance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMissedModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitMissed} className="mt-5 space-y-4">
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300 leading-relaxed">
                Direct clock-in is only allowed for the current day. If you forgot or faced technical issues on a past date, submit this request for admin review and approval.
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Missed Date (Must be a past date) *
                </label>
                <input
                  type="date"
                  required
                  max={yesterdayDateString()}
                  value={missedForm.targetDate}
                  onChange={(e) => setMissedForm({ ...missedForm, targetDate: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Clock In Time
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09:30 AM"
                    value={missedForm.clockInTime}
                    onChange={(e) => setMissedForm({ ...missedForm, clockInTime: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Clock Out Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 06:30 PM"
                    value={missedForm.clockOutTime}
                    onChange={(e) => setMissedForm({ ...missedForm, clockOutTime: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Reason for Missing Attendance *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why attendance was not logged on that date..."
                  value={missedForm.reason}
                  onChange={(e) => setMissedForm({ ...missedForm, reason: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              {missedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  {missedSuccess}
                </div>
              )}
              {missedError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {missedError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowMissedModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMissed}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingMissed ? "Submitting..." : "Send Request to Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
