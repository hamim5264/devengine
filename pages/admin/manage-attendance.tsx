import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { getStaffMembers } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getAllAttendanceForDate,
  getAllAttendanceRequests,
  reviewAttendanceRequest,
  adminUpsertAttendance,
} from "@/lib/services/staffEcoService";
import type { StaffMember } from "@/types/staff";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
  AttendanceStatus,
} from "@/types/staffEcoSystem";
import { ATTENDANCE_STATUS_LABELS } from "@/types/staffEcoSystem";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageAttendancePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [missedRequests, setMissedRequests] = useState<AttendanceRegularizationRequest[]>([]);
  const [activeTab, setActiveTab] = useState<"roster" | "requests">("roster");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Review modal
  const [reviewingReq, setReviewingReq] = useState<AttendanceRegularizationRequest | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Manual Add Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState<{
    staffId: string;
    date: string;
    clockInTime: string;
    clockOutTime: string;
    status: AttendanceStatus;
    note: string;
  }>({
    staffId: "",
    date: getTodayDateString(),
    clockInTime: "09:30 AM",
    clockOutTime: "06:30 PM",
    status: "present",
    note: "Manually logged by Admin",
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const loadData = useCallback(async (date: string, showIndicator = false) => {
    if (showIndicator) setIsRefreshing(true);
    try {
      const [staff, attendance, requests] = await Promise.all([
        getStaffMembers(),
        getAllAttendanceForDate(date),
        getAllAttendanceRequests(),
      ]);
      setStaffList(staff);
      setDailyAttendance(attendance);
      setMissedRequests(requests);
    } catch (err) {
      console.error("Error loading attendance data:", err);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/admin/login");
        return;
      }
      setAdminUser(user);
      await loadData(selectedDate);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router, selectedDate, loadData]);

  // Live polling every 15 seconds to ensure admin always sees real-time staff clock-ins
  useEffect(() => {
    if (!authReady) return;
    const interval = setInterval(() => {
      loadData(selectedDate);
    }, 15000);
    return () => clearInterval(interval);
  }, [authReady, selectedDate, loadData]);

  const handleDateChange = async (newDate: string) => {
    setSelectedDate(newDate);
    const recs = await getAllAttendanceForDate(newDate);
    setDailyAttendance(recs);
  };

  const handleReviewAction = async (decision: "approved" | "rejected") => {
    if (!reviewingReq || !adminUser) return;
    setIsProcessingReview(true);
    try {
      await reviewAttendanceRequest({
        requestId: reviewingReq.id,
        decision,
        adminRemark,
        adminEmail: adminUser.email,
      });

      // Refresh requests and roster
      const [updatedRequests, updatedAttendance] = await Promise.all([
        getAllAttendanceRequests(),
        getAllAttendanceForDate(selectedDate),
      ]);
      setMissedRequests(updatedRequests);
      setDailyAttendance(updatedAttendance);

      setReviewingReq(null);
      setAdminRemark("");
    } catch (err) {
      console.error("Review request error:", err);
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.staffId) return;
    setIsSubmittingManual(true);
    try {
      const staff = staffList.find((s) => s.id === manualForm.staffId);
      if (!staff) return;

      await adminUpsertAttendance({
        staffId: staff.id,
        staffUid: staff.uid,
        staffName: staff.name,
        staffEmail: staff.email,
        staffType: staff.staffType,
        date: manualForm.date,
        clockInTime: manualForm.clockInTime,
        clockOutTime: manualForm.clockOutTime,
        status: manualForm.status,
        note: manualForm.note,
        isRegularized: false,
      });

      if (manualForm.date === selectedDate) {
        const updated = await getAllAttendanceForDate(selectedDate);
        setDailyAttendance(updated);
      }

      setShowManualModal(false);
    } catch (err) {
      console.error("Manual upsert error:", err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const pendingRequests = missedRequests.filter((r) => r.status === "pending");
  const presentToday = dailyAttendance.filter((a) => a.status === "present" || a.status === "late");

  return (
    <AdminLayout title="Staff Attendance & Roster | Admin">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                Staff Attendance & Roster
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Real-time daily presence tracking, manual roster adjustment, and missed date approvals.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadData(selectedDate, true)}
                disabled={isRefreshing}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-violet-400" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isRefreshing ? "Syncing..." : "Sync Roster"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualForm((prev) => ({
                    ...prev,
                    staffId: staffList[0]?.id || "",
                    date: selectedDate,
                  }));
                  setShowManualModal(true);
                }}
                className="py-2.5 px-4 rounded-xl bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 text-violet-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Manual Log Entry
              </button>
            </div>
          </div>

          {/* ── Stats Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Staff
              </span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {staffList.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Logged on {selectedDate}
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                {dailyAttendance.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                Present & Active
              </span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {presentToday.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Pending Missed Requests
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {pendingRequests.length}
              </span>
            </div>
          </div>

          {/* ── Tab Selector & Date Picker ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("roster")}
                className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
                  activeTab === "roster"
                    ? "text-violet-400 border-b-2 border-violet-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Daily Roster
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
                {pendingRequests.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
            </div>

            {activeTab === "roster" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-gray-400 uppercase">View Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* ── Tab Content ── */}
          {activeTab === "roster" ? (
            <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status on {selectedDate}</th>
                      <th className="py-3 px-4">Clock In</th>
                      <th className="py-3 px-4">Clock Out</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-gray-500 font-mono">
                          No staff accounts configured.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {staffList.map((staff) => {
                          const rec = dailyAttendance.find(
                            (a) =>
                              a.staffId === staff.id ||
                              a.staffUid === staff.uid ||
                              (staff.email && a.staffEmail?.toLowerCase() === staff.email.toLowerCase())
                          );
                          return (
                            <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                                    {staff.avatarUrl ? (
                                      <img
                                        src={staff.avatarUrl}
                                        alt={staff.name}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-violet-300">
                                        {staff.name.charAt(0).toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-semibold text-white block">
                                      {staff.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {staff.email}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-400">
                                {staff.staffType}
                              </td>
                              <td className="py-3.5 px-4">
                                {rec ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    {ATTENDANCE_STATUS_LABELS[rec.status] || rec.status}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono text-gray-500 bg-white/[0.02] border border-white/[0.05]">
                                    Not Logged
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-300">
                                {rec?.clockInTime || "—"}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-300">
                                {rec?.clockOutTime || "—"}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                {rec?.isRegularized ? (
                                  <span className="text-cyan-400">Regularized</span>
                                ) : rec ? (
                                  <span className="text-gray-400">Standard</span>
                                ) : (
                                  <span className="text-gray-600">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-gray-400 max-w-xs truncate">
                                {rec?.note || "—"}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Extra attendance records for this date that may not be in staffList */}
                        {dailyAttendance
                          .filter(
                            (a) =>
                              !staffList.some(
                                (s) =>
                                  s.id === a.staffId ||
                                  s.uid === a.staffUid ||
                                  (s.email && s.email.toLowerCase() === a.staffEmail?.toLowerCase())
                              )
                          )
                          .map((rec) => (
                            <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors bg-violet-500/[0.02]">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-violet-300">
                                      {(rec.staffName || "S").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-semibold text-white block">
                                      {rec.staffName || "Staff Member"}
                                    </span>
                                    <span className="text-[10px] text-gray-500 font-mono">
                                      {rec.staffEmail || rec.staffId}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4 font-mono text-gray-400">
                                {rec.staffType || "staff"}
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
                              <td className="py-3.5 px-4 font-mono text-[11px]">
                                {rec.isRegularized ? (
                                  <span className="text-cyan-400">Regularized</span>
                                ) : (
                                  <span className="text-gray-400">Standard</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-gray-400 max-w-xs truncate">
                                {rec.note || "—"}
                              </td>
                            </tr>
                          ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Missed Attendance Requests Queue */
            <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Target Missed Date</th>
                      <th className="py-3 px-4">Times Requested</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {missedRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 font-mono">
                          No missed attendance requests found.
                        </td>
                      </tr>
                    ) : (
                      missedRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-white block">{req.staffName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {req.staffEmail}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-medium text-violet-300">
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
                          <td className="py-3.5 px-4">
                            {req.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewingReq(req);
                                  setAdminRemark("");
                                }}
                                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                              >
                                Review Request
                              </button>
                            ) : (
                              <span className="text-gray-500 text-[11px] font-mono">Reviewed</span>
                            )}
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

      {/* ── Review Request Modal ── */}
      {reviewingReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Review Missed Attendance Request
              </h3>
              <button
                type="button"
                onClick={() => setReviewingReq(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <p className="text-gray-400">
                  <span className="text-gray-500">Staff:</span> {reviewingReq.staffName} (
                  {reviewingReq.staffEmail})
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Target Date:</span>{" "}
                  <strong className="text-white font-mono">{reviewingReq.targetDate}</strong>
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Proposed Hours:</span>{" "}
                  {reviewingReq.clockInTime} → {reviewingReq.clockOutTime || "—"}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Staff Reason:</span> "{reviewingReq.reason}"
                </p>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Administrator Remarks / Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved per Slack confirmation"
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-300">
                Approving this request will automatically generate an official attendance record for{" "}
                <strong>{reviewingReq.targetDate}</strong> marked as regularized.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={() => handleReviewAction("rejected")}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={() => handleReviewAction("approved")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Approve Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Manual Add / Edit Attendance Modal ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Manual Attendance Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Staff Member *
                </label>
                <select
                  required
                  value={manualForm.staffId}
                  onChange={(e) => setManualForm({ ...manualForm, staffId: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0e0e1a] text-white">
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Clock In
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.clockInTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockInTime: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Clock Out
                  </label>
                  <input
                    type="text"
                    value={manualForm.clockOutTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockOutTime: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Status
                </label>
                <select
                  value={manualForm.status}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, status: e.target.value as AttendanceStatus })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="present" className="bg-[#0e0e1a] text-white">Present</option>
                  <option value="late" className="bg-[#0e0e1a] text-white">Late</option>
                  <option value="half_day" className="bg-[#0e0e1a] text-white">Half Day</option>
                  <option value="remote" className="bg-[#0e0e1a] text-white">Remote</option>
                  <option value="on_leave" className="bg-[#0e0e1a] text-white">On Leave</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Admin Note
                </label>
                <input
                  type="text"
                  value={manualForm.note}
                  onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingManual}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingManual ? "Saving..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
