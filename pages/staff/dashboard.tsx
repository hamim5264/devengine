import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getStaffAttendanceForDate,
  clockInStaff,
  startStaffBreak,
  endStaffBreak,
  clockOutStaff,
  submitMissedAttendanceRequest,
  getStaffWorkUpdateForDate,
  submitDailyWorkUpdate,
  getStaffLeaveRequests,
  submitLeaveRequest,
  getYearlyAttendanceHistory,
  submitOffDaySwapRequest,
} from "@/lib/services/staffEcoService";
import {
  getEmployeeTasks,
  updateEmployeeTask,
} from "@/lib/services/employeeTaskService";
import StaffLayout from "@/components/StaffLayout";
import AttendanceHeatmap from "@/components/AttendanceHeatmap";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS } from "@/types/staff";
import type {
  AttendanceRecord,
  DailyWorkUpdate,
  LeaveRequest,
  LeaveType,
  BreakType,
  EmployeeTask,
  TaskStatus,
} from "@/types/staffEcoSystem";
import {
  LEAVE_TYPE_LABELS,
  BREAK_TYPE_LABELS,
  TASK_STATUS_LABELS,
} from "@/types/staffEcoSystem";

export default function StaffDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  // Live Clock & Greeting
  const [currentTime, setCurrentTime] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Welcome");

  // Ecosystem state
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayWorkUpdate, setTodayWorkUpdate] = useState<DailyWorkUpdate | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [yearAttendance, setYearAttendance] = useState<AttendanceRecord[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);

  // Action loaders
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [isStartingBreak, setIsStartingBreak] = useState(false);
  const [isEndingBreak, setIsEndingBreak] = useState(false);

  // Modals state
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType>("lunch");
  const [breakNote, setBreakNote] = useState("");

  const [showMissedAttendanceModal, setShowMissedAttendanceModal] = useState(false);
  const [showWorkUpdateModal, setShowWorkUpdateModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOffDaySwapModal, setShowOffDaySwapModal] = useState(false);

  // Quick task modal
  const [quickTaskToUpdate, setQuickTaskToUpdate] = useState<EmployeeTask | null>(null);
  const [taskStatusChoice, setTaskStatusChoice] = useState<TaskStatus>("in_progress");
  const [taskProgressChoice, setTaskProgressChoice] = useState<number>(50);
  const [taskNotesChoice, setTaskNotesChoice] = useState("");
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  // Forms
  const [missedForm, setMissedForm] = useState({
    targetDate: "",
    clockInTime: "09:30 AM",
    clockOutTime: "06:30 PM",
    reason: "",
  });
  const [isSubmittingMissed, setIsSubmittingMissed] = useState(false);
  const [missedSuccessMsg, setMissedSuccessMsg] = useState("");
  const [missedErrorMsg, setMissedErrorMsg] = useState("");

  const [workForm, setWorkForm] = useState({
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    hoursWorked: 8,
    projectLinks: "",
  });
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);
  const [workSuccessMsg, setWorkSuccessMsg] = useState("");

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

  const [swapForm, setSwapForm] = useState({
    currentOffDate: "",
    requestedWorkDate: "",
    reason: "",
  });
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);
  const [swapSuccessMsg, setSwapSuccessMsg] = useState("");

  // Live timer states
  const [elapsedShiftText, setElapsedShiftText] = useState<string>("");
  const [activeBreakText, setActiveBreakText] = useState<string>("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );

      const hour = now.getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      // Elapsed Shift Timer (net work time)
      const inTime = todayAttendance?.clockInTimestamp || todayAttendance?.createdAt;
      if (inTime && todayAttendance && !todayAttendance.clockOutTime) {
        const inDate = new Date(inTime);
        const grossMs = Math.max(0, now.getTime() - inDate.getTime());
        const breakMs = (todayAttendance.totalBreakMinutes || 0) * 60 * 1000;
        const netMs = Math.max(0, grossMs - breakMs);

        const hrs = Math.floor(netMs / (1000 * 60 * 60));
        const mins = Math.floor((netMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((netMs % (1000 * 60)) / 1000);
        setElapsedShiftText(
          `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
        );
      } else {
        setElapsedShiftText("");
      }

      // Active Break Timer
      if (todayAttendance?.currentBreak?.startTime) {
        const bStart = new Date(todayAttendance.currentBreak.startTime);
        const bMs = Math.max(0, now.getTime() - bStart.getTime());
        const bMins = Math.floor(bMs / (1000 * 60));
        const bSecs = Math.floor((bMs % (1000 * 60)) / 1000);
        setActiveBreakText(
          `${String(bMins).padStart(2, "0")}:${String(bSecs).padStart(2, "0")}`
        );
      } else {
        setActiveBreakText("");
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [todayAttendance]);

  // Monthly Attendance Health & Metrics
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let present = 0;
    let late = 0;
    let hours = 0;

    yearAttendance.forEach((rec) => {
      if (rec.date && rec.date.startsWith(prefix)) {
        if (rec.status === "present" || rec.status === "remote" || rec.status === "late") {
          present++;
        }
        if (rec.status === "late") late++;
        hours += rec.netWorkHours || rec.totalHours || 0;
      }
    });

    const onTimeRate = present > 0 ? Math.round(((present - late) / present) * 100) : 100;
    return { present, late, hours: Math.round(hours * 10) / 10, onTimeRate };
  }, [yearAttendance]);

  const loadEcosystemData = async (staff: StaffMember) => {
    try {
      const today = getTodayDateString();
      const [att, work, leaves, history, staffTasks] = await Promise.all([
        getStaffAttendanceForDate(staff.id, today),
        getStaffWorkUpdateForDate(staff.id, today),
        getStaffLeaveRequests(staff.id),
        getYearlyAttendanceHistory(staff.id),
        getEmployeeTasks(staff.id),
      ]);
      setTodayAttendance(att);
      setTodayWorkUpdate(work);
      setLeaveRequests(leaves);

      const combinedHistory = [...history];
      if (att && !combinedHistory.some((r) => r.date === att.date)) {
        combinedHistory.push(att);
      } else if (att) {
        const idx = combinedHistory.findIndex((r) => r.date === att.date);
        if (idx !== -1) combinedHistory[idx] = att;
      }
      setYearAttendance(combinedHistory);
      setTasks(staffTasks);

      if (work) {
        setWorkForm({
          tasksCompleted: work.tasksCompleted || "",
          tasksInProgress: work.tasksInProgress || "",
          blockers: work.blockers || "",
          hoursWorked: work.hoursWorked || 8,
          projectLinks: work.projectLinks || "",
        });
      }
    } catch (err) {
      console.error("[StaffDashboard] Error loading ecosystem data:", err);
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
      await loadEcosystemData(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Clock In
  const handleClockIn = async () => {
    if (!staffData || isClockingIn) return;
    setIsClockingIn(true);
    try {
      const record = await clockInStaff({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
      });
      setTodayAttendance(record);
      setYearAttendance((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.date === record.date);
        if (idx !== -1) next[idx] = record;
        else next.push(record);
        return next;
      });
      if (staffData) loadEcosystemData(staffData);
    } catch (err) {
      console.error("Clock in failed:", err);
    } finally {
      setIsClockingIn(false);
    }
  };

  // Start Break
  const handleStartBreak = async () => {
    if (!staffData || isStartingBreak) return;
    setIsStartingBreak(true);
    try {
      const record = await startStaffBreak(staffData.id, selectedBreakType, breakNote);
      setTodayAttendance(record);
      setYearAttendance((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.date === record.date);
        if (idx !== -1) next[idx] = record;
        else next.push(record);
        return next;
      });
      setShowBreakModal(false);
      setBreakNote("");
    } catch (err) {
      console.error("Failed to start break:", err);
    } finally {
      setIsStartingBreak(false);
    }
  };

  // Resume Work (End Break)
  const handleEndBreak = async () => {
    if (!staffData || isEndingBreak) return;
    setIsEndingBreak(true);
    try {
      const record = await endStaffBreak(staffData.id);
      setTodayAttendance(record);
      setYearAttendance((prev) => {
        const next = [...prev];
        const idx = next.findIndex((r) => r.date === record.date);
        if (idx !== -1) next[idx] = record;
        else next.push(record);
        return next;
      });
      if (staffData) loadEcosystemData(staffData);
    } catch (err) {
      console.error("Failed to resume work:", err);
    } finally {
      setIsEndingBreak(false);
    }
  };

  // Clock Out
  const handleClockOut = async () => {
    if (!staffData || isClockingOut) return;
    setIsClockingOut(true);
    try {
      const record = await clockOutStaff(staffData.id);
      if (record) {
        setTodayAttendance(record);
        setYearAttendance((prev) => {
          const next = [...prev];
          const idx = next.findIndex((r) => r.date === record.date);
          if (idx !== -1) next[idx] = record;
          else next.push(record);
          return next;
        });
      }
      if (staffData) loadEcosystemData(staffData);
    } catch (err) {
      console.error("Clock out failed:", err);
    } finally {
      setIsClockingOut(false);
    }
  };

  // Quick Task update
  const handleSaveQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskToUpdate || !staffData) return;
    setIsUpdatingTask(true);
    try {
      await updateEmployeeTask(quickTaskToUpdate.id, {
        status: taskStatusChoice,
        progressPercent: Number(taskProgressChoice),
        employeeNotes: taskNotesChoice,
      });
      setQuickTaskToUpdate(null);
      await loadEcosystemData(staffData);
    } catch (err) {
      console.error("Task update error:", err);
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Missed attendance submit
  const handleSubmitMissedAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !missedForm.targetDate || !missedForm.reason.trim()) return;
    setIsSubmittingMissed(true);
    setMissedErrorMsg("");
    setMissedSuccessMsg("");
    try {
      await submitMissedAttendanceRequest({
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
      setMissedSuccessMsg("Request sent successfully to administrator!");
      setTimeout(() => {
        setShowMissedAttendanceModal(false);
        setMissedSuccessMsg("");
        setMissedForm({
          targetDate: "",
          clockInTime: "09:30 AM",
          clockOutTime: "06:30 PM",
          reason: "",
        });
      }, 1500);
    } catch (err: any) {
      setMissedErrorMsg(err?.message || "Failed to submit request.");
    } finally {
      setIsSubmittingMissed(false);
    }
  };

  // Off day swap submit
  const handleSubmitOffDaySwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !swapForm.currentOffDate || !swapForm.requestedWorkDate || !swapForm.reason.trim()) return;
    setIsSubmittingSwap(true);
    setSwapSuccessMsg("");
    try {
      await submitOffDaySwapRequest({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        currentOffDate: swapForm.currentOffDate,
        requestedWorkDate: swapForm.requestedWorkDate,
        reason: swapForm.reason,
      });
      setSwapSuccessMsg("Off-day swap request submitted to administrator!");
      setTimeout(() => {
        setShowOffDaySwapModal(false);
        setSwapSuccessMsg("");
        setSwapForm({ currentOffDate: "", requestedWorkDate: "", reason: "" });
      }, 1500);
    } catch (err) {
      console.error("Off day swap error:", err);
    } finally {
      setIsSubmittingSwap(false);
    }
  };

  // Work update submit
  const handleSubmitWorkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !workForm.tasksCompleted.trim()) return;
    setIsSubmittingWork(true);
    setWorkSuccessMsg("");
    try {
      const updated = await submitDailyWorkUpdate({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        tasksCompleted: workForm.tasksCompleted,
        tasksInProgress: workForm.tasksInProgress,
        blockers: workForm.blockers,
        hoursWorked: Number(workForm.hoursWorked) || 0,
        projectLinks: workForm.projectLinks,
      });
      setTodayWorkUpdate(updated);
      setWorkSuccessMsg("Work update saved successfully!");
      setTimeout(() => {
        setShowWorkUpdateModal(false);
        setWorkSuccessMsg("");
      }, 1200);
    } catch (err) {
      console.error("Save work update error:", err);
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // Leave submit
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) return;
    setIsSubmittingLeave(true);
    setLeaveSuccessMsg("");
    try {
      const newLeave = await submitLeaveRequest({
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
      setLeaveRequests((prev) => [newLeave, ...prev]);
      setLeaveSuccessMsg("Leave application submitted successfully!");
      setTimeout(() => {
        setShowLeaveModal(false);
        setLeaveSuccessMsg("");
        setLeaveForm({
          leaveType: "casual",
          startDate: "",
          endDate: "",
          reason: "",
          emergencyContact: "",
        });
      }, 1500);
    } catch (err) {
      console.error("Submit leave error:", err);
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const typeColor = STAFF_TYPE_COLORS[staffData.staffType] || {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
  };

  const isOnBreak = !!todayAttendance?.currentBreak;
  const isCheckedIn = !!todayAttendance && !todayAttendance.clockOutTime;
  const isShiftConcluded = !!todayAttendance?.clockOutTime;

  return (
    <StaffLayout title="Employee Portal | DevEngine">
      <Head>
        <title>Employee Portal | DevEngine</title>
      </Head>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* ─────────────────────────────────────────────────────────────
            1. HERO EXECUTIVE BANNER & REAL-TIME CLOCK
        ───────────────────────────────────────────────────────────── */}
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-purple-950/20 p-6 sm:p-8 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Employee Info */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-purple-500/10 border-2 border-purple-500/30 flex items-center justify-center">
                  {staffData.avatarUrl ? (
                    <img src={staffData.avatarUrl} alt={staffData.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-purple-300">
                      {staffData.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900 shadow-sm" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider text-purple-400 font-semibold">
                    {greeting}
                  </span>
                  <span className="text-xs text-neutral-500">•</span>
                  <span className="text-xs text-neutral-400">DevEngine Workplace</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {staffData.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-medium ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}>
                    {STAFF_TYPE_LABELS[staffData.staffType] || staffData.staffType}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                    Active Member
                  </span>
                  <span className="text-xs text-neutral-400 hidden sm:inline">
                    {staffData.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Shift Hours & Live Clock */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md self-start lg:self-auto">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                  Scheduled Shift
                </span>
                <span className="text-xs font-semibold text-white block mt-0.5">
                  {staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  Off: {(staffData.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                </span>
              </div>

              <div className="sm:border-l sm:border-white/10 sm:pl-4">
                <div className="flex items-center gap-1.5 text-purple-400">
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <span className="text-xl sm:text-2xl font-bold text-white tracking-wider">
                    {currentTime || "00:00:00 AM"}
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400 block mt-0.5">
                  {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1.5. EXECUTIVE OVERVIEW METRIC CAPSULES STRIP
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Capsule 1: Shift State */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Shift Presence
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnBreak
                    ? "bg-amber-400 animate-pulse"
                    : isCheckedIn
                    ? "bg-emerald-400 animate-pulse"
                    : isShiftConcluded
                    ? (todayAttendance?.status === "half_day" || ((todayAttendance?.netWorkHours ?? todayAttendance?.totalHours ?? 0) < 5) ? "bg-yellow-400" : "bg-purple-400")
                    : "bg-neutral-600"
                }`}
              />
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-white block capitalize">
                {isOnBreak
                  ? "On Break"
                  : isCheckedIn
                  ? "Active Working"
                  : isShiftConcluded
                  ? (todayAttendance?.status === "half_day" || ((todayAttendance?.netWorkHours ?? todayAttendance?.totalHours ?? 0) < 5) ? "Half Day Shift" : "Shift Concluded")
                  : "Not Clocked In"}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                {isShiftConcluded && (todayAttendance?.status === "half_day" || ((todayAttendance?.netWorkHours ?? todayAttendance?.totalHours ?? 0) < 5))
                  ? `${todayAttendance?.netWorkHours || todayAttendance?.totalHours || 0} hrs • Half Day Shift`
                  : staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
              </span>
            </div>
          </div>

          {/* Capsule 2: Today's Net Active Work */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Net Work Today
              </span>
              <span className="material-symbols-outlined text-[16px] text-cyan-400">schedule</span>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-cyan-300 font-mono block">
                {elapsedShiftText || (todayAttendance?.netWorkHours ? `${todayAttendance.netWorkHours}h net` : "00h 00m")}
              </span>
              <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                Target: 8.0 hrs standard shift
              </span>
            </div>
          </div>

          {/* Capsule 3: Monthly Attendance Health */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Monthly Record
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                {monthlyStats.onTimeRate}%
              </span>
            </div>
            <div>
              <span className="text-base sm:text-lg font-bold text-white block">
                {monthlyStats.present} Shifts
              </span>
              <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                {monthlyStats.hours} hrs logged this month
              </span>
            </div>
          </div>

          {/* Capsule 4: Daily Work Report Status */}
          <div className="p-4 rounded-2xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                Work Report
              </span>
              <span className="material-symbols-outlined text-[16px] text-purple-400">edit_note</span>
            </div>
            <div>
              <span
                className={`text-base sm:text-lg font-bold block ${
                  todayWorkUpdate ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {todayWorkUpdate ? "Submitted ✓" : "Pending Log"}
              </span>
              <button
                type="button"
                onClick={() => setShowWorkUpdateModal(true)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline block mt-0.5 text-left cursor-pointer"
              >
                {todayWorkUpdate ? "View / Edit Report →" : "Submit Daily Log →"}
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. ULTRA CONTROL BAR: CLOCK IN / BREAK / RESUME / CLOCK OUT
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-neutral-900/80 p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-base font-bold text-white tracking-tight">
                  Workplace Presence & Break Control
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Manage your clock-in, log structured breaks, resume work, and conclude shifts
              </p>
            </div>

            {/* Shift Timers Banner */}
            <div className="flex items-center gap-3">
              {isCheckedIn && (
                <div className="px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                  <span className="text-neutral-400 block text-[10px] uppercase tracking-wider">
                    Net Active Work
                  </span>
                  <span className="text-sm font-bold text-purple-300 font-mono">
                    {elapsedShiftText || "00h 00m 00s"}
                  </span>
                </div>
              )}

              {isOnBreak && (
                <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs animate-pulse">
                  <span className="text-amber-400 block text-[10px] uppercase tracking-wider font-semibold">
                    On Break ({BREAK_TYPE_LABELS[todayAttendance.currentBreak?.breakType || "lunch"]})
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {activeBreakText || "00:00"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            {/* Button 1: Clock In */}
            {!todayAttendance ? (
              <button
                onClick={handleClockIn}
                disabled={isClockingIn}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>{isClockingIn ? "Clocking In..." : "Clock In for Today"}</span>
              </button>
            ) : (
              <div className="py-2.5 px-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">In Time</span>
                  <span className="text-xs font-bold text-white">{todayAttendance.clockInTime}</span>
                </div>
                <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
              </div>
            )}

            {/* Button 2: Take Break OR Resume Work */}
            {isCheckedIn && !isOnBreak && !isShiftConcluded && (
              <button
                onClick={() => setShowBreakModal(true)}
                className="py-3 px-4 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 text-amber-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">coffee</span>
                <span>Take a Break</span>
              </button>
            )}

            {isOnBreak && !isShiftConcluded && (
              <button
                onClick={handleEndBreak}
                disabled={isEndingBreak}
                className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                <span>{isEndingBreak ? "Resuming..." : "Resume Work"}</span>
              </button>
            )}

            {/* Button 3: Clock Out */}
            {isCheckedIn && !isShiftConcluded ? (
              <button
                onClick={handleClockOut}
                disabled={isClockingOut}
                className="py-3 px-4 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>{isClockingOut ? "Concluding..." : "Clock Out"}</span>
              </button>
            ) : isShiftConcluded ? (
              <div className="py-2.5 px-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Out Time</span>
                  <span className="text-xs font-bold text-white">{todayAttendance.clockOutTime}</span>
                </div>
                <span className={`text-[11px] font-semibold ${
                  (todayAttendance.netWorkHours !== undefined ? todayAttendance.netWorkHours : (todayAttendance.totalHours || 0)) < 5
                    ? "text-yellow-400"
                    : "text-emerald-400"
                }`}>
                  {todayAttendance.netWorkHours || todayAttendance.totalHours} hrs worked ({
                    (todayAttendance.netWorkHours !== undefined ? todayAttendance.netWorkHours : (todayAttendance.totalHours || 0)) < 5 ? "Half Day" : "Full Day"
                  })
                </span>
              </div>
            ) : null}

            {/* Button 4: Daily Work Report */}
            <button
              onClick={() => setShowWorkUpdateModal(true)}
              className="py-3 px-4 rounded-2xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit_note</span>
              <span>{todayWorkUpdate ? "Edit Daily Work Report" : "Submit Daily Work Report"}</span>
            </button>
          </div>

          {/* Quick Request links: Missed Punch, Leave, Off-Day Swap */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-xs text-neutral-400">
            <span>Requests Center:</span>
            <button
              onClick={() => setShowMissedAttendanceModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200 text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              <span>Missed Punch Regularization</span>
            </button>
            <button
              onClick={() => setShowOffDaySwapModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200 text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              <span>Request Off-Day Swap</span>
            </button>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200 text-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">beach_access</span>
              <span>Apply for Leave</span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ASSIGNED TASKS WIDGET & SPRINT TICKETS
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">assignment</span>
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Assigned Sprints & Deadlines ({tasks.filter((t) => t.status !== "completed").length} Active)
                </h3>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Tasks assigned by administration. Update status, mark progress %, and attach deliverables
              </p>
            </div>

            <Link
              href="/staff/tasks"
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-400 transition-all flex items-center gap-1 self-start sm:self-auto"
            >
              <span>View All Tasks</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-black/30 border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto text-xl">
                ✨
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-white">Sprint Queue Clear & On Track</h4>
                <p className="text-xs text-neutral-400">
                  No pending deliverables or sprints assigned right now. When tasks are dispatched by administration, you can update completion percentage and attach deliverables here.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition"
                >
                  Log Daily Tasks
                </button>
                <Link
                  href="/staff/agreement"
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 text-xs font-semibold transition"
                >
                  View Agreement
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {task.priority}
                      </span>
                      <span className="text-[11px] font-medium text-neutral-300">
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-white line-clamp-1">{task.title}</h4>
                    {task.description && (
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-3 text-[11px] text-neutral-400 flex justify-between">
                      <span>Due: {task.dueDate}</span>
                      <span className="font-semibold text-cyan-400">{task.progressPercent || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                        style={{ width: `${task.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuickTaskToUpdate(task);
                      setTaskStatusChoice(task.status);
                      setTaskProgressChoice(task.progressPercent || 0);
                      setTaskNotesChoice(task.employeeNotes || "");
                    }}
                    className="mt-3 py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-neutral-200 transition-all text-center cursor-pointer"
                  >
                    Quick Update
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3.5. TODAY'S PERSONAL ACTIVITY TIMELINE (NEW REQUESTED SECTION)
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px]">history</span>
              </span>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Today&apos;s Activity Timeline
                </h3>
                <p className="text-xs text-neutral-400">
                  Chronological record of your punches, breaks, report submissions, and sprint milestones
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono text-neutral-400">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {/* Event 1: Check In */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Clock-In Punch</span>
                <span className="material-symbols-outlined text-emerald-400 text-sm">login</span>
              </div>
              <span className="text-white font-bold block text-sm">
                {todayAttendance?.clockInTime || "Not Clocked In"}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {todayAttendance ? "Verified on shift roster" : "Awaiting clock-in"}
              </span>
            </div>

            {/* Event 2: Breaks Taken */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Structured Breaks</span>
                <span className="material-symbols-outlined text-amber-400 text-sm">coffee</span>
              </div>
              <span className="text-white font-bold block text-sm">
                {todayAttendance?.totalBreakMinutes ? `${todayAttendance.totalBreakMinutes} mins` : isOnBreak ? "Break in Progress" : "No Breaks Taken"}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {isOnBreak ? activeBreakText : `${todayAttendance?.breaks?.length || 0} total breaks logged`}
              </span>
            </div>

            {/* Event 3: Daily Work Report */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Engineering Report</span>
                <span className="material-symbols-outlined text-cyan-400 text-sm">edit_note</span>
              </div>
              <span className="text-white font-bold block text-sm">
                {todayWorkUpdate ? "Logged ✓" : "Pending Log"}
              </span>
              <span className="text-[10px] text-neutral-400 block truncate">
                {todayWorkUpdate ? `${todayWorkUpdate.hoursWorked} hrs recorded` : "Due at end of shift"}
              </span>
            </div>

            {/* Event 4: Clock-Out */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 uppercase tracking-wider">Shift Conclusion</span>
                <span className="material-symbols-outlined text-rose-400 text-sm">logout</span>
              </div>
              <span className="text-white font-bold block text-sm">
                {todayAttendance?.clockOutTime || (isCheckedIn ? "Active Shift" : "Shift Not Started")}
              </span>
              <span className="text-[10px] text-neutral-400 block">
                {todayAttendance?.clockOutTime ? `${todayAttendance.netWorkHours || 0} hrs net total` : "Ongoing"}
              </span>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. ANNUAL ATTENDANCE HEATMAP (52-WEEK MATRIX)
        ───────────────────────────────────────────────────────────── */}
        <AttendanceHeatmap
          records={yearAttendance}
          assignedOffDays={staffData.assignedOffDays || ["Friday", "Saturday"]}
          onSelectDate={(date, rec) => {
            if (rec) {
              alert(`Date: ${date}\nStatus: ${rec.status}\nIn: ${rec.clockInTime}\nOut: ${rec.clockOutTime || "N/A"}\nNet Hours: ${rec.netWorkHours || "N/A"}`);
            }
          }}
        />

        {/* ─────────────────────────────────────────────────────────────
            5. MY AGREEMENT & CONTRACT SHORTCUT
        ───────────────────────────────────────────────────────────── */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-purple-950/30 via-neutral-900 to-neutral-900/90 p-6 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Employment Contract & Legal Agreement</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Review your official compensation, hourly/retainer payouts, shift rules, and download publication PDF.
              </p>
            </div>
          </div>

          <Link
            href="/staff/agreement"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 flex-shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>View & Download Contract</span>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODALS: BREAK, MISSED ATTENDANCE, WORK UPDATE, LEAVE, SWAP
        ───────────────────────────────────────────────────────────── */}

        {/* Modal 1: Take Break */}
        {showBreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-lg">coffee</span>
                  <span>Select Break Type</span>
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
                  Optional Note / Reason
                </label>
                <input
                  type="text"
                  value={breakNote}
                  onChange={(e) => setBreakNote(e.target.value)}
                  placeholder="e.g. Grabbing lunch nearby..."
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
                  {isStartingBreak ? "Starting..." : "Start Break Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Quick Task Update */}
        {quickTaskToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Update Task Progress</h3>
                <button onClick={() => setQuickTaskToUpdate(null)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <p className="text-xs font-semibold text-purple-300">{quickTaskToUpdate.title}</p>

              <form onSubmit={handleSaveQuickTask} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">Status</label>
                  <select
                    value={taskStatusChoice}
                    onChange={(e) => setTaskStatusChoice(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="completed">Completed</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Progress:</span>
                    <span className="font-bold text-cyan-400">{taskProgressChoice}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskProgressChoice}
                    onChange={(e) => setTaskProgressChoice(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Progress Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={taskNotesChoice}
                    onChange={(e) => setTaskNotesChoice(e.target.value)}
                    placeholder="Short update on current milestone..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickTaskToUpdate(null)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingTask}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isUpdatingTask ? "Saving..." : "Save Progress"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 3: Off-Day Swap Request */}
        {showOffDaySwapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">swap_horiz</span>
                  <span>Off-Day Swap Request</span>
                </h3>
                <button onClick={() => setShowOffDaySwapModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitOffDaySwap} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Scheduled Off-Day to Work On
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
                    Requested Day Off Instead
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
                    Reason for Swap
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={swapForm.reason}
                    onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                    placeholder="Explain why you need to swap this off-day..."
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
                    onClick={() => setShowOffDaySwapModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSwap}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingSwap ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 4: Missed Punch Regularization */}
        {showMissedAttendanceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">history</span>
                  <span>Missed Punch Regularization</span>
                </h3>
                <button onClick={() => setShowMissedAttendanceModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitMissedAttendance} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Past Date (Must be before today)
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
                    placeholder="Describe why attendance was missed..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {missedSuccessMsg && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    {missedSuccessMsg}
                  </div>
                )}
                {missedErrorMsg && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs text-center">
                    {missedErrorMsg}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMissedAttendanceModal(false)}
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

        {/* Modal 5: Daily Work Update */}
        {showWorkUpdateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">edit_note</span>
                  <span>Daily Work Update ({getTodayDateString()})</span>
                </h3>
                <button onClick={() => setShowWorkUpdateModal(false)} className="text-neutral-400 hover:text-white">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSubmitWorkUpdate} className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Tasks Completed Today (Required)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={workForm.tasksCompleted}
                    onChange={(e) => setWorkForm({ ...workForm, tasksCompleted: e.target.value })}
                    placeholder="• Implemented feature X&#10;• Fixed issue Y"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Tasks In Progress (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={workForm.tasksInProgress}
                    onChange={(e) => setWorkForm({ ...workForm, tasksInProgress: e.target.value })}
                    placeholder="Ongoing items carried forward..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Hours Worked</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={workForm.hoursWorked}
                      onChange={(e) => setWorkForm({ ...workForm, hoursWorked: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-neutral-300 block mb-1">Blockers (if any)</label>
                    <input
                      type="text"
                      value={workForm.blockers}
                      onChange={(e) => setWorkForm({ ...workForm, blockers: e.target.value })}
                      placeholder="None"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Project / PR / Figma Links (Optional)
                  </label>
                  <input
                    type="text"
                    value={workForm.projectLinks}
                    onChange={(e) => setWorkForm({ ...workForm, projectLinks: e.target.value })}
                    placeholder="https://github.com/... or Figma link"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {workSuccessMsg && (
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    {workSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWorkUpdateModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWork}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingWork ? "Saving..." : "Save Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 6: Leave Request */}
        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-white/10 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400 text-lg">beach_access</span>
                  <span>Apply for Leave</span>
                </h3>
                <button onClick={() => setShowLeaveModal(false)} className="text-neutral-400 hover:text-white">
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
                    placeholder="Describe purpose of leave..."
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
                    placeholder="Phone number or alternative email"
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
                    onClick={() => setShowLeaveModal(false)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {isSubmittingLeave ? "Submitting..." : "Submit Leave Application"}
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
