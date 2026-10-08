import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import AttendanceHeatmap from "@/components/AttendanceHeatmap";
import HelixLoader from "@/components/HelixLoader";
import { getStaffMembers } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getAllAttendanceForDate,
  getAllAttendanceRequests,
  reviewAttendanceRequest,
  adminUpsertAttendance,
  getYearlyAttendanceHistory,
  getAllOffDaySwapRequests,
  reviewOffDaySwapRequest,
  getAllAttendanceRecords,
} from "@/lib/services/staffEcoService";
import type { StaffMember } from "@/types/staff";
import type {
  AttendanceRecord,
  AttendanceRegularizationRequest,
  AttendanceStatus,
  OffDaySwapRequest,
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
  const [swapRequests, setSwapRequests] = useState<OffDaySwapRequest[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"roster" | "heatmap" | "requests" | "swaps">("roster");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Heatmap state
  const [selectedStaffForHeatmap, setSelectedStaffForHeatmap] = useState<string>("");
  const [heatmapRecords, setHeatmapRecords] = useState<AttendanceRecord[]>([]);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);

  // Export Attendance Report modal
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportScope, setExportScope] = useState<"daily" | "monthly" | "all">("daily");
  const [isExporting, setIsExporting] = useState(false);

  // Review Missed modal
  const [reviewingReq, setReviewingReq] = useState<AttendanceRegularizationRequest | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Review Swap modal
  const [reviewingSwap, setReviewingSwap] = useState<OffDaySwapRequest | null>(null);
  const [swapRemark, setSwapRemark] = useState("");
  const [isProcessingSwap, setIsProcessingSwap] = useState(false);

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
      const [staff, attendance, requests, swaps] = await Promise.all([
        getStaffMembers(),
        getAllAttendanceForDate(date),
        getAllAttendanceRequests(),
        getAllOffDaySwapRequests(),
      ]);
      setStaffList(staff);
      setDailyAttendance(attendance);
      setMissedRequests(requests);
      setSwapRequests(swaps);

      // Auto-select first staff for heatmap if none selected
      if (!selectedStaffForHeatmap && staff.length > 0) {
        setSelectedStaffForHeatmap(staff[0].id);
      }
    } catch (err) {
      console.error("Error loading attendance data:", err);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, [selectedStaffForHeatmap]);

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

  // Load heatmap when selected staff changes
  useEffect(() => {
    if (!selectedStaffForHeatmap) return;
    const loadHeatmap = async () => {
      setLoadingHeatmap(true);
      try {
        const history = await getYearlyAttendanceHistory(selectedStaffForHeatmap);
        setHeatmapRecords(history);
      } catch (err) {
        console.error("Heatmap load error:", err);
      } finally {
        setLoadingHeatmap(false);
      }
    };
    loadHeatmap();
  }, [selectedStaffForHeatmap]);

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

      const [updatedRequests, updatedAttendance] = await Promise.all([
        getAllAttendanceRequests(),
        getAllAttendanceForDate(selectedDate),
      ]);
      setMissedRequests(updatedRequests);
      setDailyAttendance(updatedAttendance);

      if (selectedStaffForHeatmap) {
        const hist = await getYearlyAttendanceHistory(selectedStaffForHeatmap);
        setHeatmapRecords(hist);
      }

      setReviewingReq(null);
      setAdminRemark("");
    } catch (err) {
      console.error("Review request error:", err);
    } finally {
      setIsProcessingReview(false);
    }
  };

  const handleSwapReviewAction = async (decision: "approved" | "rejected") => {
    if (!reviewingSwap || !adminUser) return;
    setIsProcessingSwap(true);
    try {
      await reviewOffDaySwapRequest({
        requestId: reviewingSwap.id,
        decision,
        adminRemark: swapRemark,
        adminEmail: adminUser.email,
      });

      const updatedSwaps = await getAllOffDaySwapRequests();
      setSwapRequests(updatedSwaps);
      setReviewingSwap(null);
      setSwapRemark("");
    } catch (err) {
      console.error("Review swap error:", err);
    } finally {
      setIsProcessingSwap(false);
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

      if (selectedStaffForHeatmap === manualForm.staffId) {
        const hist = await getYearlyAttendanceHistory(selectedStaffForHeatmap);
        setHeatmapRecords(hist);
      }

      setShowManualModal(false);
    } catch (err) {
      console.error("Manual upsert error:", err);
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleExportCSV = async (scope: "daily" | "monthly" | "all") => {
    setIsExporting(true);
    try {
      let exportData: AttendanceRecord[] = [];
      let filename = `devengine-attendance-${selectedDate}.csv`;

      if (scope === "daily") {
        exportData = dailyAttendance;
        filename = `devengine-attendance-daily-${selectedDate}.csv`;
      } else if (scope === "monthly") {
        const [year, month] = selectedDate.split("-");
        const monthPrefix = `${year}-${month}`;
        const all = await getAllAttendanceRecords(1500);
        exportData = all.filter((r) => r.date && r.date.startsWith(monthPrefix));
        filename = `devengine-attendance-monthly-${monthPrefix}.csv`;
      } else {
        exportData = await getAllAttendanceRecords(2000);
        filename = `devengine-attendance-all-${getTodayDateString()}.csv`;
      }

      // Generate CSV string with UTF-8 BOM so Excel opens it with perfect character encoding
      const headers = [
        "Date",
        "Staff Name",
        "Email",
        "Role",
        "Status",
        "Clock In",
        "Clock Out",
        "Total Gross Hours",
        "Total Break Mins",
        "Net Work Hours",
        "Regularized",
        "Notes",
      ];

      const rows = exportData.map((r) => [
        `"${r.date || ""}"`,
        `"${(r.staffName || "").replace(/"/g, '""')}"`,
        `"${(r.staffEmail || "").replace(/"/g, '""')}"`,
        `"${(r.staffType || "").replace(/"/g, '""')}"`,
        `"${(ATTENDANCE_STATUS_LABELS[r.status] || r.status || "").replace(/"/g, '""')}"`,
        `"${r.clockInTime || ""}"`,
        `"${r.clockOutTime || ""}"`,
        r.totalHours || 0,
        r.totalBreakMinutes || 0,
        r.netWorkHours || 0,
        r.isRegularized ? "Yes" : "No",
        `"${(r.note || "").replace(/"/g, '""')}"`,
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export attendance report. Please try again.");
    } finally {
      setIsExporting(false);
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
  const pendingSwaps = swapRequests.filter((s) => s.status === "pending");
  const presentToday = dailyAttendance.filter((a) => a.status === "present" || a.status === "late");
  const halfDayToday = dailyAttendance.filter((a) => a.status === "half_day");
  const currentHeatmapStaff = staffList.find((s) => s.id === selectedStaffForHeatmap);

  return (
    <AdminLayout title="Attendance & Roster Operations | Admin Console">
      <Head>
        <title>Attendance & Roster Operations | Admin Console</title>
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
                Employee Attendance & Shifts
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Real-time daily presence roster, annual heatmaps, break tracking, and approval queues
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadData(selectedDate, true)}
              disabled={isRefreshing}
              className="py-2.5 px-3.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? "animate-spin" : ""}`}>
                refresh
              </span>
              <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className="py-2.5 px-3.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Download Attendance Report"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Download Report</span>
            </button>

            <button
              onClick={() => setShowManualModal(true)}
              className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-purple-600/20 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Log Attendance Manually</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] text-neutral-400 block">Total Active Employees</span>
            <span className="text-xl font-bold text-white mt-1 block">{staffList.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] text-emerald-400 block">Present on {selectedDate}</span>
            <span className="text-xl font-bold text-emerald-300 mt-1 block">{presentToday.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] text-blue-400 block">Half Day on {selectedDate}</span>
            <span className="text-xl font-bold text-blue-300 mt-1 block">{halfDayToday.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] text-amber-400 block">Pending Missed Punch Requests</span>
            <span className="text-xl font-bold text-amber-300 mt-1 block">{pendingRequests.length}</span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] text-purple-400 block">Pending Off-Day Swap Requests</span>
            <span className="text-xl font-bold text-purple-300 mt-1 block">{pendingSwaps.length}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => setActiveTab("roster")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "roster" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Daily Roster
            </button>
            <button
              onClick={() => setActiveTab("heatmap")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === "heatmap" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              Annual Heatmap Matrix
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "requests" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Missed Punch Requests</span>
              {pendingRequests.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("swaps")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "swaps" ? "bg-purple-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              <span>Off-Day Swaps</span>
              {pendingSwaps.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-300 font-bold">
                  {pendingSwaps.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "roster" && (
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-neutral-400">Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="px-3 py-1 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* Tab 1: Daily Roster */}
        {activeTab === "roster" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Clock In</th>
                    <th className="py-3 px-4">Clock Out</th>
                    <th className="py-3 px-4">Breaks</th>
                    <th className="py-3 px-4">Net Hours</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-neutral-500">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    staffList.map((st) => {
                      const rec = dailyAttendance.find(
                        (a) => a.staffId === st.id || a.staffUid === st.uid
                      );

                      return (
                        <tr key={st.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-white">{st.name}</div>
                            <div className="text-[11px] text-neutral-400">{st.email}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap capitalize text-neutral-300">
                            {st.staffType}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec ? (
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
                                    : rec.status === "absent"
                                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                    : "bg-white/5 text-neutral-300"
                                }`}
                              >
                                {ATTENDANCE_STATUS_LABELS[rec.status] || rec.status}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400">
                                Not Clocked In
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                            {rec?.clockInTime || "—"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-neutral-200">
                            {rec?.clockOutTime || "—"}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {rec?.totalBreakMinutes ? (
                              <span className="text-amber-300 font-medium">
                                {rec.totalBreakMinutes} mins ({rec.breaks?.length || 1})
                              </span>
                            ) : (
                              <span className="text-neutral-500">0 mins</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap font-bold text-cyan-300">
                            {rec?.netWorkHours ? `${rec.netWorkHours}h` : rec?.totalHours ? `${rec.totalHours}h` : "—"}
                          </td>
                          <td className="py-3 px-4 text-neutral-400 max-w-xs truncate">
                            {rec?.note || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Annual Heatmap Matrix */}
        {activeTab === "heatmap" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-neutral-900/60 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-neutral-300">Select Employee:</span>
                <select
                  value={selectedStaffForHeatmap}
                  onChange={(e) => setSelectedStaffForHeatmap(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.email}) — {s.staffType}
                    </option>
                  ))}
                </select>
              </div>

              {currentHeatmapStaff && (
                <div className="text-xs text-neutral-400">
                  Rostered Off: {(currentHeatmapStaff.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                </div>
              )}
            </div>

            {loadingHeatmap ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <HelixLoader size={36} color="#a855f7" />
                <span className="text-xs text-neutral-400">Loading employee attendance history...</span>
              </div>
            ) : (
              <AttendanceHeatmap
                records={heatmapRecords}
                assignedOffDays={currentHeatmapStaff?.assignedOffDays || ["Friday", "Saturday"]}
              />
            )}
          </div>
        )}

        {/* Tab 3: Missed Punch Regularization Requests */}
        {activeTab === "requests" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Target Date</th>
                    <th className="py-3 px-4">Times</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {missedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No missed attendance requests found.
                      </td>
                    </tr>
                  ) : (
                    missedRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{req.staffName}</div>
                          <div className="text-[11px] text-neutral-400">{req.staffEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
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
                        <td className="py-3 px-4 whitespace-nowrap">
                          {req.status === "pending" ? (
                            <button
                              onClick={() => {
                                setReviewingReq(req);
                                setAdminRemark("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-medium transition-all"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-500">
                              {req.adminRemark ? `“${req.adminRemark}”` : "Reviewed"}
                            </span>
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

        {/* Tab 4: Off-Day Swap Requests */}
        {activeTab === "swaps" && (
          <div className="rounded-2xl border border-white/10 bg-neutral-900/60 overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-white/5 border-b border-white/10 text-neutral-400 text-[11px] uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Scheduled Off-Day (Work)</th>
                    <th className="py-3 px-4">Swap To Day Off</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {swapRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-neutral-500">
                        No off-day swap requests submitted.
                      </td>
                    </tr>
                  ) : (
                    swapRequests.map((swap) => (
                      <tr key={swap.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-white">{swap.staffName}</div>
                          <div className="text-[11px] text-neutral-400">{swap.staffEmail}</div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-white font-medium">
                          {swap.currentOffDate}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-cyan-300">
                          {swap.requestedWorkDate}
                        </td>
                        <td className="py-3 px-4 text-neutral-300 max-w-xs truncate">
                          {swap.reason}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              swap.status === "approved"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : swap.status === "rejected"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {swap.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {swap.status === "pending" ? (
                            <button
                              onClick={() => {
                                setReviewingSwap(swap);
                                setSwapRemark("");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 text-xs font-medium transition-all"
                            >
                              Review Swap
                            </button>
                          ) : (
                            <span className="text-[11px] text-neutral-500">
                              {swap.adminRemark ? `“${swap.adminRemark}”` : "Reviewed"}
                            </span>
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

        {/* Review Missed Modal */}
        {reviewingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Review Missed Punch Request</h3>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                <div>
                  <span className="text-neutral-400">Employee:</span>{" "}
                  <span className="font-semibold text-white">{reviewingReq.staffName}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Date:</span>{" "}
                  <span className="font-semibold text-white">{reviewingReq.targetDate}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Claimed Hours:</span>{" "}
                  <span className="text-neutral-200">
                    {reviewingReq.clockInTime} – {reviewingReq.clockOutTime}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-400">Reason:</span>{" "}
                  <span className="text-neutral-200">{reviewingReq.reason}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Admin Feedback / Remark
                </label>
                <input
                  type="text"
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="Optional review note..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingReq(null)}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={() => handleReviewAction("rejected")}
                  className="flex-1 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 font-semibold text-xs hover:bg-rose-600/30"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isProcessingReview}
                  onClick={() => handleReviewAction("approved")}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                >
                  Approve & Create
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Review Swap Modal */}
        {reviewingSwap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">Review Off-Day Swap Request</h3>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1 text-xs">
                <div>
                  <span className="text-neutral-400">Employee:</span>{" "}
                  <span className="font-semibold text-white">{reviewingSwap.staffName}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Will Work On:</span>{" "}
                  <span className="font-semibold text-emerald-400">{reviewingSwap.currentOffDate}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Will Take Off On:</span>{" "}
                  <span className="font-semibold text-cyan-400">{reviewingSwap.requestedWorkDate}</span>
                </div>
                <div>
                  <span className="text-neutral-400">Reason:</span>{" "}
                  <span className="text-neutral-200">{reviewingSwap.reason}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-neutral-300 block mb-1">
                  Admin Feedback / Remark
                </label>
                <input
                  type="text"
                  value={swapRemark}
                  onChange={(e) => setSwapRemark(e.target.value)}
                  placeholder="Optional review remark..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewingSwap(null)}
                  className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isProcessingSwap}
                  onClick={() => handleSwapReviewAction("rejected")}
                  className="flex-1 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 font-semibold text-xs hover:bg-rose-600/30"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={isProcessingSwap}
                  onClick={() => handleSwapReviewAction("approved")}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs"
                >
                  Approve Swap
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manual Upsert Modal */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Log Attendance Manually</h3>
                <button onClick={() => setShowManualModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Select Employee</label>
                  <select
                    required
                    value={manualForm.staffId}
                    onChange={(e) => setManualForm({ ...manualForm, staffId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Choose Employee --</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Clock In Time</label>
                    <input
                      type="text"
                      required
                      value={manualForm.clockInTime}
                      onChange={(e) => setManualForm({ ...manualForm, clockInTime: e.target.value })}
                      placeholder="09:30 AM"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Clock Out Time</label>
                    <input
                      type="text"
                      value={manualForm.clockOutTime}
                      onChange={(e) => setManualForm({ ...manualForm, clockOutTime: e.target.value })}
                      placeholder="06:30 PM"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Status</label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as AttendanceStatus })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="present">Present</option>
                    <option value="late">Late Arrival</option>
                    <option value="half_day">Half Day</option>
                    <option value="remote">Remote / WFH</option>
                    <option value="on_leave">On Leave</option>
                    <option value="absent">Absent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Admin Note</label>
                  <input
                    type="text"
                    value={manualForm.note}
                    onChange={(e) => setManualForm({ ...manualForm, note: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingManual}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingManual ? "Saving..." : "Save Record"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Export Attendance Report Modal */}
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0e0e1a] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">Download Attendance Report</h3>
                    <p className="text-xs text-neutral-400">Export clean, structured CSV for Excel & Google Sheets</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block">
                  Select Export Scope:
                </label>

                {/* Option 1: Selected Date */}
                <button
                  type="button"
                  onClick={() => setExportScope("daily")}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    exportScope === "daily"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                      : "bg-white/[0.02] border-white/5 text-neutral-300 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Selected Date Roster</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-normal">
                        {selectedDate}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Includes all {dailyAttendance.length} records logged for this day
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportScope === "daily" ? "border-cyan-400 bg-cyan-400" : "border-neutral-500"}`}>
                    {exportScope === "daily" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </button>

                {/* Option 2: Monthly */}
                <button
                  type="button"
                  onClick={() => setExportScope("monthly")}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    exportScope === "monthly"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                      : "bg-white/[0.02] border-white/5 text-neutral-300 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>Current Month Records</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-normal">
                        {selectedDate.slice(0, 7)}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      All attendance entries across all employees for this calendar month
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportScope === "monthly" ? "border-cyan-400 bg-cyan-400" : "border-neutral-500"}`}>
                    {exportScope === "monthly" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </button>

                {/* Option 3: All history */}
                <button
                  type="button"
                  onClick={() => setExportScope("all")}
                  className={`w-full p-3.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                    exportScope === "all"
                      ? "bg-cyan-500/10 border-cyan-500/40 text-white"
                      : "bg-white/[0.02] border-white/5 text-neutral-300 hover:bg-white/5"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>All Historical Attendance Records</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Full consolidated archive across all dates and active employees
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${exportScope === "all" ? "border-cyan-400 bg-cyan-400" : "border-neutral-500"}`}>
                    {exportScope === "all" && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                  </div>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-neutral-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-cyan-400 shrink-0">info</span>
                <span>Includes gross hours, break breakdown, net hours, status, notes, and regularization flags.</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300 hover:bg-white/10 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportCSV(exportScope)}
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-500/20"
                >
                  {isExporting ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">file_download</span>
                      <span>Export CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
