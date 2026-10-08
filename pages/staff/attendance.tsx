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
  startStaffBreak,
  endStaffBreak,
  clockOutStaff,
  submitMissedAttendanceRequest,
  getYearlyAttendanceHistory,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import AttendanceHeatmap from "@/components/AttendanceHeatmap";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
  BreakType,
} from "@/types/staffEcoSystem";
import {
  ATTENDANCE_STATUS_LABELS,
  BREAK_TYPE_LABELS,
} from "@/types/staffEcoSystem";

export default function StaffAttendancePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [yearAttendance, setYearAttendance] = useState<AttendanceRecord[]>([]);
  const [missedRequests, setMissedRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"matrix" | "history" | "requests">("matrix");

  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);

  // Break modal
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType>("lunch");
  const [breakNote, setBreakNote] = useState("");

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

  const loadData = async (staff: StaffMember) => {
    try {
      const today = getTodayDateString();
      const [todayRec, history, yearRecs, reqs] = await Promise.all([
        getStaffAttendanceForDate(staff.id, today),
        getStaffAttendanceHistory(staff.id, 90),
        getYearlyAttendanceHistory(staff.id),
        getStaffAttendanceRequests(staff.id),
      ]);
      setTodayAttendance(todayRec);
      setAttendanceHistory(history);
      const combinedYear = [...yearRecs];
      if (todayRec && !combinedYear.some((r) => r.date === todayRec.date)) {
        combinedYear.push(todayRec);
      } else if (todayRec) {
        const idx = combinedYear.findIndex((r) => r.date === todayRec.date);
        if (idx !== -1) combinedYear[idx] = todayRec;
      }
      setYearAttendance(combinedYear);
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
      await loadData(staffData);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleStartBreak = async () => {
    if (!staffData || isStartingBreak) return;
    setIsStartingBreak(true);
    try {
      const rec = await startStaffBreak(staffData.id, selectedBreakType, breakNote);
      setTodayAttendance(rec);
      setShowBreakModal(false);
      setBreakNote("");
      await loadData(staffData);
    } finally {
      setIsStartingBreak(false);
    }
  };

  const handleEndBreak = async () => {
    if (!staffData || isEndingBreak) return;
    setIsEndingBreak(true);
    try {
      const rec = await endStaffBreak(staffData.id);
      setTodayAttendance(rec);
      await loadData(staffData);
    } finally {
      setIsEndingBreak(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffData || isClockingOut) return;
    setIsClockingOut(true);
    try {
      const rec = await clockOutStaff(staffData.id);
      if (rec) {
        setTodayAttendance(rec);
        await loadData(staffData);
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

  const isCheckedIn = !!todayAttendance && !todayAttendance.clockOutTime;
  const isOnBreak = !!todayAttendance?.currentBreak;
  const isShiftConcluded = !!todayAttendance?.clockOutTime;

  return (
    <StaffLayout title="Attendance & Heatmap | DevEngine Portal">
      <Head>
        <title>Attendance & Heatmap | DevEngine Portal</title>
      </Head>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Attendance, Breaks & Shifts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Track annual presence matrix, punch times, break logs, and missed punch requests
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMissedModal(true)}
            className="py-2.5 px-4 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">history_toggle_off</span>
            <span>Regularize Missed Punch</span>
          </button>
        </div>

        {/* Today's Punch & Break Control Card */}
        <div className="p-6 rounded-3xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">alarm_on</span>
            </div>
            <div>
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider block">
                Today's Punch Status ({getTodayDateString()})
              </span>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {todayAttendance ? (
                  <>
                    <span className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      In: {todayAttendance.clockInTime}
                    </span>
                    {todayAttendance.clockOutTime && (
                      <span className="text-sm text-neutral-300">
                        • Out: {todayAttendance.clockOutTime}
                      </span>
                    )}
                    {todayAttendance.totalBreakMinutes ? (
                      <span className="text-xs text-amber-400 font-medium">
                        • {todayAttendance.totalBreakMinutes}m break
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    Not Clocked In Today
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {!todayAttendance ? (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">login</span>
                <span>{isClockingIn ? "Clocking In..." : "Clock In"}</span>
              </button>
            ) : isCheckedIn && !isOnBreak ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowBreakModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">coffee</span>
                  <span>Take Break</span>
                </button>
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={isClockingOut}
                  className="py-2.5 px-4 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[16px]">logout</span>
                  <span>{isClockingOut ? "Concluding..." : "Clock Out"}</span>
                </button>
              </>
            ) : isOnBreak ? (
              <button
                type="button"
                onClick={handleEndBreak}
                disabled={isEndingBreak}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                <span>{isEndingBreak ? "Resuming..." : "Resume Work"}</span>
              </button>
            ) : isShiftConcluded ? (
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                Shift Concluded ({todayAttendance.netWorkHours || todayAttendance.totalHours} hrs)
              </span>
            ) : null}
          </div>
        </div>

        {/* Navigation Tabs: Matrix Heatmap / Detailed Log / Requests */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-xs">
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "matrix"
                ? "bg-purple-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Annual Heatmap Matrix
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "history"
                ? "bg-purple-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Attendance Logs & Breaks ({attendanceHistory.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "requests"
                ? "bg-purple-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Missed Punch Requests ({missedRequests.length})
          </button>
        </div>

        {/* Tab 1: Heatmap Matrix */}
        {activeTab === "matrix" && (
          <AttendanceHeatmap
            records={yearAttendance}
            assignedOffDays={staffData.assignedOffDays || ["Friday", "Saturday"]}
          />
        )}

        {/* Tab 2: Attendance History & Breaks Table */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">In Time</th>
                    <th className="py-3 px-4">Out Time</th>
                    <th className="py-3 px-4">Breaks Taken</th>
                    <th className="py-3 px-4">Net Work Hours</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {attendanceHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500">
                        No attendance records recorded yet.
                      </td>
                    </tr>
                  ) : (
                    attendanceHistory.map((rec) => (
                      <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          {rec.date}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              rec.status === "present"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : rec.status === "half_day"
                                ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
                                : rec.status === "late"
                                ? "bg-orange-500/10 text-orange-400 border border-orange-500/30"
                                : rec.status === "on_break"
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                                : rec.status === "remote"
                                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                                : rec.status === "on_leave"
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : "bg-white/5 text-neutral-300"
                            }`}
                          >
                            {ATTENDANCE_STATUS_LABELS[rec.status] || rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                          {rec.clockInTime || "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                          {rec.clockOutTime || "—"}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {rec.totalBreakMinutes ? (
                            <span className="text-amber-300 font-medium">
                              {rec.totalBreakMinutes} mins ({rec.breaks?.length || 1} break)
                            </span>
                          ) : (
                            <span className="text-neutral-500">0 mins</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-semibold text-cyan-300">
                          {rec.netWorkHours ? `${rec.netWorkHours} hrs` : rec.totalHours ? `${rec.totalHours} hrs` : "—"}
                        </td>
                        <td className="py-3 px-4 text-neutral-400 max-w-xs truncate">
                          {rec.note || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Missed Punch Regularization Requests */}
        {activeTab === "requests" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4">Claimed Hours</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Admin Remark</th>
                    <th className="py-3 px-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {missedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No regularization requests submitted.
                      </td>
                    </tr>
                  ) : (
                    missedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                          {req.targetDate}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                          {req.clockInTime} – {req.clockOutTime || "N/A"}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                          {req.reason}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              req.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : req.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-neutral-400">
                          {req.adminRemark || "—"}
                        </td>
                        <td className="py-3 px-4 text-neutral-500 whitespace-nowrap text-[11px]">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Break Modal */}
        {showBreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">coffee</span>
                  <span>Start Work Break</span>
                </h3>
                <button onClick={() => setShowBreakModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["lunch", "tea", "meeting", "personal"] as BreakType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedBreakType(type)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      selectedBreakType === type
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-black/30 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="block font-bold">{BREAK_TYPE_LABELS[type]}</span>
                    <span className="text-[10px] text-neutral-500 block mt-0.5">
                      {type === "lunch" ? "Up to 60 mins" : "Up to 20 mins"}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Optional Note
                </label>
                <input
                  type="text"
                  value={breakNote}
                  onChange={(e) => setBreakNote(e.target.value)}
                  placeholder="e.g. Taking coffee break..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBreakModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartBreak}
                  disabled={isStartingBreak}
                  className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all disabled:opacity-50"
                >
                  {isStartingBreak ? "Starting..." : "Start Break"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missed Punch Modal */}
        {showMissedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">history</span>
                  <span>Regularize Missed Punch</span>
                </h3>
                <button onClick={() => setShowMissedModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitMissed} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Missed Date (Past Date)
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date(Date.now() - 86400000).toISOString().split("T")[0]}
                    value={missedForm.targetDate}
                    onChange={(e) => setMissedForm({ ...missedForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Clock In Time</label>
                    <input
                      type="text"
                      required
                      value={missedForm.clockInTime}
                      onChange={(e) => setMissedForm({ ...missedForm, clockInTime: e.target.value })}
                      placeholder="09:30 AM"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Clock Out Time</label>
                    <input
                      type="text"
                      value={missedForm.clockOutTime}
                      onChange={(e) => setMissedForm({ ...missedForm, clockOutTime: e.target.value })}
                      placeholder="06:30 PM"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={missedForm.reason}
                    onChange={(e) => setMissedForm({ ...missedForm, reason: e.target.value })}
                    placeholder="Why attendance was missed on this day..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {missedSuccess && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    {missedSuccess}
                  </div>
                )}
                {missedError && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                    {missedError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMissedModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMissed}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingMissed ? "Submitting..." : "Submit Regularization"}
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
