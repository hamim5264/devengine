import { CommunicationDashboard } from "@/components/communication/CommunicationEntry";
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
import CustomDatePickerField from "@/components/staff/CustomDatePickerField";
import CustomSelectField, { SelectOption } from "@/components/staff/CustomSelectField";
import AttachmentPicker from "@/components/common/AttachmentPicker";
import HelixLoader from "@/components/HelixLoader";
import { useTheme } from "@/context/ThemeContext";
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
  EcoAttachment,
} from "@/types/staffEcoSystem";
import {
  LEAVE_TYPE_LABELS,
  BREAK_TYPE_LABELS,
  TASK_STATUS_LABELS,
} from "@/types/staffEcoSystem";

const LEAVE_OPTIONS: SelectOption<LeaveType>[] = [
  {
    value: "casual",
    label: "Casual Leave",
    description: "Planned personal time off",
    badge: "Planned",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-[#2cecf7]",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: "sick",
    label: "Sick Leave",
    description: "Medical care & health recovery",
    badge: "Medical",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
  },
  {
    value: "emergency",
    label: "Emergency Leave",
    description: "Urgent unforeseen situations",
    badge: "Urgent",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    value: "maternity_paternity",
    label: "Maternity / Paternity",
    description: "Family bonding & newborn care",
    badge: "Family",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    value: "unpaid",
    label: "Unpaid Leave",
    description: "Approved extended leave without pay",
    badge: "Unpaid",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-400",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    value: "other",
    label: "Other Leave",
    description: "Special or administrative leave",
    badge: "Special",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const TASK_STATUS_OPTIONS: SelectOption<TaskStatus>[] = [
  {
    value: "todo",
    label: "To Do",
    description: "Scheduled / backlog item",
    iconBg: "bg-slate-500/15",
    iconColor: "text-slate-400",
    badge: "Queued",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    value: "in_progress",
    label: "In Progress",
    description: "Actively working on this right now",
    iconBg: "bg-cyan-500/15",
    iconColor: "text-[#2cecf7]",
    badge: "Active",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    ),
  },
  {
    value: "in_review",
    label: "In Review",
    description: "Submitted for QA or lead review",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    badge: "Review",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    value: "completed",
    label: "Completed",
    description: "Done and verified",
    iconBg: "bg-emerald-500/15",
    iconColor: "text-emerald-400",
    badge: "Done",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    value: "blocked",
    label: "Blocked",
    description: "Blocked by dependency or waiting",
    iconBg: "bg-rose-500/15",
    iconColor: "text-rose-400",
    badge: "Blocked",
    icon: (
      <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    ),
  },
];

export default function StaffDashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
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

  const [workForm, setWorkForm] = useState<{
    tasksCompleted: string;
    tasksInProgress: string;
    blockers: string;
    hoursWorked: number;
    projectLinks: string;
    attachments: EcoAttachment[];
  }>({
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    hoursWorked: 8,
    projectLinks: "",
    attachments: [],
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

  // Real-time calculated progress through today's standard 9-hour shift window (09:00 AM - 06:00 PM)
  const shiftProgressPercent = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = 9 * 60; // 09:00 AM = 540
    const endMinutes = 18 * 60;  // 06:00 PM = 1080
    if (currentMinutes <= startMinutes) return 0;
    if (currentMinutes >= endMinutes) return 100;
    return Math.round(((currentMinutes - startMinutes) / (endMinutes - startMinutes)) * 100);
  }, [currentTime]);

  // Today's logged work progress toward standard 8.0h target
  const dailyWorkGoalPercent = useMemo(() => {
    const hours = todayAttendance?.netWorkHours || todayAttendance?.totalHours || 0;
    return Math.min(100, Math.round((hours / 8) * 100));
  }, [todayAttendance]);

  // Current week's 7-day sprint overview
  const currentWeekDays = useMemo(() => {
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 = Sun, 6 = Sat
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - currentDayOfWeek);

    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const fullNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const offDays = staffData?.assignedOffDays || ["Friday", "Saturday"];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const isToday = i === currentDayOfWeek;
      const isPast = i < currentDayOfWeek;
      const isOff = offDays.includes(fullNames[i]);
      days.push({
        name: dayNames[i],
        full: fullNames[i],
        date: d.getDate(),
        isToday,
        isPast,
        isOff,
      });
    }
    return days;
  }, [staffData]);

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
          attachments: work.attachments || [],
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
        attachments: workForm.attachments,
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
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-[#f8fafc]" : "bg-[#07070f]"}`}>
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  const typeColor = STAFF_TYPE_COLORS[staffData.staffType] || {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  };

  const isOnBreak = !!todayAttendance?.currentBreak;
  const isCheckedIn = !!todayAttendance && !todayAttendance.clockOutTime;
  const isShiftConcluded = !!todayAttendance?.clockOutTime;

  return (
    <StaffLayout title="Employee Portal | DevEngine">
      <Head>
        <title>Employee Portal | DevEngine</title>
      </Head>

      <div className="p-3.5 sm:p-6 lg:p-8 w-full max-w-[1560px] mx-auto space-y-6 sm:space-y-8">
        <CommunicationDashboard />
        {/* ─────────────────────────────────────────────────────────────
            1. HERO EXECUTIVE BANNER & REAL-TIME CLOCK (Widened + Weekly Sprint)
        ───────────────────────────────────────────────────────────── */}
        <div className={`relative rounded-3xl border p-5 sm:p-7 lg:p-8 backdrop-blur-xl overflow-hidden shadow-xl transition-all duration-300 ${
          isLight
            ? "bg-gradient-to-r from-white via-cyan-50/25 to-blue-50/20 border-slate-200/90 shadow-[0_10px_35px_rgba(44,236,247,0.12)]"
            : "bg-gradient-to-r from-[#080d19] via-[#0b1326] to-[#07111e] border-[#2cecf7]/20 shadow-[0_12px_45px_rgba(0,0,0,0.7)]"
        }`}>
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2cecf7]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 anim-float-orb" />
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
            {/* Left: Employee Info */}
            <div className="flex items-center gap-3.5 sm:gap-6 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#2cecf7]/10 border-2 border-[#2cecf7] ring-4 ring-[#2cecf7]/20 flex items-center justify-center shadow-[0_0_24px_rgba(44,236,247,0.35)] transition-transform hover:scale-105 duration-200 flex-shrink-0"
                  style={{ width: "64px", height: "64px", minWidth: "64px", minHeight: "64px", maxWidth: "64px", maxHeight: "64px" }}
                >
                  {staffData.avatarUrl ? (
                    <img
                      src={staffData.avatarUrl}
                      alt={staffData.name}
                      className="w-full h-full object-cover"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <span className="text-2xl font-extrabold text-[#2cecf7]">
                      {staffData.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 sm:h-4 sm:w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className={`relative inline-flex rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 bg-emerald-500 border-2 shadow-[0_0_8px_#10b981] ${isLight ? "border-white" : "border-[#080d19]"}`}></span>
                </span>
              </div>

              <div className="space-y-1 sm:space-y-1.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold" style={{ color: "#2cecf7" }}>
                    {greeting}
                  </span>
                  <span className="text-xs text-neutral-400">•</span>
                  <span className={`text-xs font-medium truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    DevEngine Workplace
                  </span>
                </div>
                <h1 className={`text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                  {staffData.name}
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-0.5">
                  <span className="px-2.5 sm:px-3 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm" style={{
                    background: isLight ? "rgba(44, 236, 247, 0.15)" : "rgba(44, 236, 247, 0.12)",
                    color: isLight ? "#0e7490" : "#2cecf7",
                    border: isLight ? "1px solid rgba(44, 236, 247, 0.35)" : "1px solid rgba(44, 236, 247, 0.25)",
                  }}>
                    {STAFF_TYPE_LABELS[staffData.staffType] || staffData.staffType}
                  </span>
                  <span className="px-2.5 sm:px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.15)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active Member
                  </span>
                  <span className={`text-xs font-mono hidden md:inline ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                    {staffData.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle: Weekly Sprint Presence Mini-Calendar (Utilizing Empty Space) */}
            <div className={`hidden 2xl:flex flex-col justify-between p-3.5 rounded-2xl border backdrop-blur-md min-w-[340px] ${
              isLight ? "bg-slate-50/80 border-slate-200/80" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5 text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold">
                <span className="flex items-center gap-1.5 text-[#2cecf7]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-pulse" />
                  7-Day Sprint Presence
                </span>
                <span>Active Roster</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
                {currentWeekDays.map((d) => (
                  <div
                    key={d.name}
                    className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center transition-all ${
                      d.isToday
                        ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-[0_0_14px_rgba(44,236,247,0.45)] scale-105"
                        : d.isOff
                        ? isLight ? "bg-slate-200/60 text-slate-400" : "bg-white/[0.02] text-neutral-500"
                        : isLight ? "bg-white text-slate-700 border border-slate-200/60" : "bg-white/[0.04] text-neutral-300"
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold">{d.name}</span>
                    <span className="text-xs font-bold mt-0.5">{d.date}</span>
                    <span className="text-[8px] mt-0.5 font-semibold opacity-80">
                      {d.isToday ? "TODAY" : d.isOff ? "OFF" : "SHIFT"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Shift Hours & Live Clock */}
            <div className={`w-full lg:w-auto self-stretch lg:self-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-5 p-3.5 sm:p-5 rounded-2xl border backdrop-blur-md transition-all flex-shrink-0 ${
              isLight
                ? "bg-white/90 border-slate-200/90 shadow-sm"
                : "bg-black/50 border-[#2cecf7]/20 shadow-[0_0_25px_rgba(44,236,247,0.1)]"
            }`}>
              <div className="space-y-0.5">
                <span className={`text-[10px] uppercase tracking-wider font-semibold block ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Scheduled Shift
                </span>
                <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                  {staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
                </span>
                <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Off: {(staffData.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                </span>
              </div>

              <div className={`pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l sm:pl-5 ${isLight ? "border-slate-200" : "border-white/10"}`}>
                <div className="flex items-center gap-2">
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="animate-pulse flex-shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span
                    className="text-lg sm:text-2xl font-black font-mono tracking-wider tabular-nums whitespace-nowrap inline-block min-w-[11ch]"
                    style={{
                      color: isLight ? "#0e7490" : "#2cecf7",
                      textShadow: isLight ? "none" : "0 0 20px rgba(44,236,247,0.45)"
                    }}
                  >
                    {currentTime || "00:00:00 AM"}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1.5. EXECUTIVE OVERVIEW METRIC CAPSULES (Distinct Futuristic Looks)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {/* Capsule 1: Shift Presence & Biometric Status (Cyan / Blue Accent) */}
          <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl flex flex-col justify-between space-y-3 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${
            isLight
              ? "bg-gradient-to-br from-white via-cyan-50/30 to-white border-cyan-200/70 shadow-sm hover:border-[#2cecf7] hover:shadow-[0_16px_36px_rgba(44,236,247,0.22)]"
              : "bg-gradient-to-br from-[#081224] via-[#0a0f1d] to-[#07111e] border-[#2cecf7]/25 hover:border-[#2cecf7] hover:shadow-[0_0_35px_rgba(44,236,247,0.28)] shadow-lg"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 ${isLight ? "text-cyan-800" : "text-[#2cecf7]"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7]" />
                Live Presence
              </span>
              <div className="relative flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${
                  isOnBreak
                    ? "bg-amber-400 animate-pulse shadow-[0_0_12px_#f59e0b]"
                    : isCheckedIn
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_12px_#10b981]"
                    : isShiftConcluded
                    ? "bg-[#2cecf7] shadow-[0_0_12px_#2cecf7]"
                    : isLight ? "bg-slate-300" : "bg-neutral-600"
                }`} />
                {(isCheckedIn || isOnBreak) && (
                  <span className="absolute w-6 h-6 rounded-full border border-current opacity-40 anim-radar" />
                )}
              </div>
            </div>
            <div>
              <span className={`text-base sm:text-lg font-black block capitalize tracking-tight truncate ${
                isOnBreak
                  ? "text-amber-500"
                  : isCheckedIn
                  ? "text-emerald-500"
                  : isShiftConcluded
                  ? (isLight ? "text-cyan-700" : "text-[#2cecf7]")
                  : (isLight ? "text-slate-800" : "text-white")
              }`}>
                {isOnBreak
                  ? "On Break"
                  : isCheckedIn
                  ? "Active On Shift"
                  : isShiftConcluded
                  ? (todayAttendance?.status === "half_day" || ((todayAttendance?.netWorkHours ?? todayAttendance?.totalHours ?? 0) < 5) ? "Half Day Shift" : "Shift Concluded")
                  : "Not Clocked In"}
              </span>
              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/5">
                <span className={`text-[10px] sm:text-[11px] font-mono truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
                </span>
                <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                  isCheckedIn
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-neutral-400"
                }`}>
                  {isCheckedIn ? "PUNCHED" : "PENDING"}
                </span>
              </div>
            </div>
          </div>

          {/* Capsule 2: Net Work Today & Progress Bar (Emerald / Teal Accent) */}
          <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl flex flex-col justify-between space-y-3 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${
            isLight
              ? "bg-gradient-to-br from-white via-emerald-50/25 to-white border-emerald-200/70 shadow-sm hover:border-emerald-400 hover:shadow-[0_16px_36px_rgba(16,185,129,0.2)]"
              : "bg-gradient-to-br from-[#06181b] via-[#0a0f1d] to-[#07111e] border-emerald-500/25 hover:border-emerald-400 hover:shadow-[0_0_35px_rgba(16,185,129,0.25)] shadow-lg"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Net Work Today
              </span>
              <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-500 shadow-sm">
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base sm:text-xl font-black font-mono tracking-tight tabular-nums whitespace-nowrap" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>
                  {elapsedShiftText || (todayAttendance?.netWorkHours ? `${todayAttendance.netWorkHours}h net` : "00h 00m")}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-500">
                  {dailyWorkGoalPercent}% Goal
                </span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1.5 ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                <div
                  className="h-full rounded-full anim-shimmer transition-all duration-500"
                  style={{
                    width: `${dailyWorkGoalPercent}%`,
                    background: "linear-gradient(90deg, #10b981 0%, #2cecf7 50%, #10b981 100%)",
                    backgroundSize: "200% 100%"
                  }}
                />
              </div>
              <span className={`text-[10px] font-mono block mt-1 truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                Standard: 8.0 hrs benchmark
              </span>
            </div>
          </div>

          {/* Capsule 3: Monthly Attendance Health & Reliability (Violet / Cyan Accent) */}
          <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl flex flex-col justify-between space-y-3 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${
            isLight
              ? "bg-gradient-to-br from-white via-violet-50/25 to-white border-violet-200/70 shadow-sm hover:border-violet-400 hover:shadow-[0_16px_36px_rgba(139,92,246,0.2)]"
              : "bg-gradient-to-br from-[#120e26] via-[#0a0f1d] to-[#07111e] border-violet-500/25 hover:border-violet-400 hover:shadow-[0_0_35px_rgba(139,92,246,0.25)] shadow-lg"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 ${isLight ? "text-violet-800" : "text-violet-400"}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Monthly Health
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                {monthlyStats.onTimeRate}% On-Time
              </span>
            </div>
            <div>
              <span className={`text-base sm:text-lg font-black block tracking-tight truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                {monthlyStats.present} Shifts Logged
              </span>
              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/5">
                <span className={`text-[10px] sm:text-[11px] font-mono truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {monthlyStats.hours} hrs accumulated
                </span>
                <span className="text-[9px] font-mono font-semibold text-violet-600 dark:text-violet-300">
                  TIER-1 RELIABLE
                </span>
              </div>
            </div>
          </div>

          {/* Capsule 4: Daily Work Report Status (Amber / Orange / Emerald Accent) */}
          <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl flex flex-col justify-between space-y-3 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group ${
            isLight
              ? todayWorkUpdate
                ? "bg-gradient-to-br from-white via-emerald-50/20 to-white border-emerald-200/70 shadow-sm hover:border-emerald-400 hover:shadow-[0_16px_36px_rgba(16,185,129,0.2)]"
                : "bg-gradient-to-br from-white via-amber-50/25 to-white border-amber-200/70 shadow-sm hover:border-amber-400 hover:shadow-[0_16px_36px_rgba(245,158,11,0.2)]"
              : todayWorkUpdate
              ? "bg-gradient-to-br from-[#06181b] via-[#0a0f1d] to-[#07111e] border-emerald-500/25 hover:border-emerald-400 shadow-lg"
              : "bg-gradient-to-br from-[#1a1208] via-[#0a0f1d] to-[#07111e] border-amber-500/25 hover:border-amber-400 hover:shadow-[0_0_35px_rgba(245,158,11,0.25)] shadow-lg"
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5 ${
                todayWorkUpdate
                  ? isLight ? "text-emerald-800" : "text-emerald-400"
                  : isLight ? "text-amber-800" : "text-amber-400"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${todayWorkUpdate ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                Engineering EOD
              </span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                todayWorkUpdate
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25"
                  : "bg-amber-500/10 text-amber-500 border border-amber-500/25"
              }`}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
            </div>
            <div>
              <span className={`text-base sm:text-lg font-black block tracking-tight truncate ${
                todayWorkUpdate ? "text-emerald-500" : "text-amber-500"
              }`}>
                {todayWorkUpdate ? "Submitted ✓" : "Pending Log"}
              </span>
              <div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-white/5">
                <span className={`text-[10px] sm:text-[11px] font-mono truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  {todayWorkUpdate ? `${todayWorkUpdate.hoursWorked}h recorded` : "Due by 06:00 PM"}
                </span>
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(true)}
                  className="text-[10px] font-bold font-mono hover:underline cursor-pointer transition-colors"
                  style={{ color: isLight ? "#0891b2" : "#2cecf7" }}
                >
                  {todayWorkUpdate ? "Edit →" : "Submit →"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            2. WORKPLACE PRESENCE & BREAK CONTROL (Intense Shadow + 2-Wing Horizon Bento)
        ───────────────────────────────────────────────────────────── */}
        <div
          className={`relative rounded-3xl p-5 sm:p-7 lg:p-8 backdrop-blur-2xl transition-all duration-300 overflow-hidden ${
            isLight
              ? "bg-gradient-to-br from-white via-cyan-50/20 to-blue-50/10"
              : "bg-gradient-to-br from-[#080d19] via-[#0a1224] to-[#07111e]"
          }`}
          style={{
            border: isLight ? "1.5px solid rgba(44, 236, 247, 0.4)" : "1.5px solid rgba(44, 236, 247, 0.3)",
            boxShadow: isLight
              ? "0 22px 55px -12px rgba(44, 236, 247, 0.28), 0 12px 30px -8px rgba(15, 23, 42, 0.06), 0 0 30px rgba(44, 236, 247, 0.15)"
              : "0 32px 90px -10px rgba(0, 0, 0, 0.95), 0 0 60px rgba(44, 236, 247, 0.3), inset 0 1px 1px rgba(44, 236, 247, 0.3)",
          }}
        >
          {/* Subtle Cyber Grid Laser Sweep Animation Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#2cecf7] to-transparent anim-sweep-laser opacity-70 pointer-events-none" />

          {/* Dual-Wing Responsive Bento Grid: Left Operations + Right Shift Horizon */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* ── LEFT WING: COMMAND & ACTIONS (Col 1 to 7) ── */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2cecf7] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2cecf7] shadow-[0_0_10px_#2cecf7]"></span>
                  </span>
                  <h2 className={`text-base sm:text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    Workplace Presence & Break Control
                  </h2>
                </div>
                <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Biometric shift presence telemetry, structured break logging, and daily milestone coordination.
                </p>
              </div>

              {/* Dynamic State Alert Glass Capsule */}
              <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                isOnBreak
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-300"
                  : isCheckedIn
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : isShiftConcluded
                  ? isLight ? "bg-cyan-50 border-cyan-200 text-cyan-900" : "bg-[#2cecf7]/10 border-[#2cecf7]/25 text-[#2cecf7]"
                  : isLight ? "bg-slate-50 border-slate-200 text-slate-700" : "bg-white/[0.03] border-white/10 text-neutral-300"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    isOnBreak
                      ? "bg-amber-500 text-slate-950 shadow-[0_0_12px_#f59e0b]"
                      : isCheckedIn
                      ? "bg-emerald-500 text-slate-950 shadow-[0_0_12px_#10b981]"
                      : isShiftConcluded
                      ? "bg-[#2cecf7] text-[#02040a] shadow-[0_0_12px_#2cecf7]"
                      : isLight ? "bg-slate-200 text-slate-700" : "bg-white/10 text-white"
                  }`}>
                    {isOnBreak ? (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                      </svg>
                    ) : isCheckedIn ? (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    ) : isShiftConcluded ? (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold block opacity-80">
                      {isOnBreak
                        ? `ON BREAK // ${BREAK_TYPE_LABELS[todayAttendance?.currentBreak?.breakType || "lunch"]}`
                        : isCheckedIn
                        ? "TELEMETRY SYNCHRONIZED // ACTIVE WORK"
                        : isShiftConcluded
                        ? "SHIFT COMPLETED // ROSTER ARCHIVED"
                        : "SHIFT WINDOW OPEN // READY TO PUNCH"}
                    </span>
                    {isCheckedIn && !isOnBreak ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[11px] sm:text-xs font-semibold ${isLight ? "text-slate-600" : "text-neutral-300"}`}>
                          Live Net Active Work:
                        </span>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs sm:text-sm tracking-wider font-black border transition-all ${
                          isLight
                            ? "bg-white/95 border-emerald-300 text-emerald-800 shadow-[0_2px_8px_rgba(16,185,129,0.18)]"
                            : "bg-[#02181c]/90 border-[#2cecf7]/50 text-[#2cecf7] shadow-[0_0_15px_rgba(44,236,247,0.3)]"
                        }`}>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="tabular-nums font-mono">{elapsedShiftText || "00h 00m 00s"}</span>
                        </div>
                      </div>
                    ) : isOnBreak ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`text-[11px] sm:text-xs font-semibold ${isLight ? "text-amber-800" : "text-amber-200"}`}>
                          Break Elapsed:
                        </span>
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl font-mono text-xs sm:text-sm tracking-wider font-black border transition-all ${
                          isLight
                            ? "bg-white/95 border-amber-300 text-amber-800 shadow-[0_2px_8px_rgba(245,158,11,0.18)]"
                            : "bg-[#1c1204]/90 border-amber-500/50 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                        }`}>
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                          </span>
                          <span className="tabular-nums font-mono">{activeBreakText || "00:00"}</span>
                        </div>
                        <span className={`text-[11px] sm:text-xs font-medium opacity-80 ${isLight ? "text-amber-900" : "text-amber-200"}`}>
                          • Remember to resume
                        </span>
                      </div>
                    ) : isShiftConcluded ? (
                      <span className="text-xs sm:text-sm font-bold block mt-0.5">
                        Clocked out at {todayAttendance?.clockOutTime} • {todayAttendance?.netWorkHours || todayAttendance?.totalHours}h net logged
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm font-bold block mt-0.5">
                        Shift 09:00 AM - 06:00 PM • Tap Clock In below to verify presence
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <span className="font-bold uppercase tracking-wider">
                    {isOnBreak ? "Break Active" : isCheckedIn ? "Live Roster" : isShiftConcluded ? "Concluded" : "Standby"}
                  </span>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Button 1: Clock In OR Clocked In Status */}
                {!todayAttendance ? (
                  <button
                    type="button"
                    onClick={handleClockIn}
                    disabled={isClockingIn}
                    className="py-3.5 px-5 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer active:scale-[0.98] hover:scale-[1.01] hover:brightness-105 shadow-[0_3px_12px_rgba(44,236,247,0.3)] hover:shadow-[0_4px_18px_rgba(44,236,247,0.45)] border border-[#2cecf7]/60"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                    }}
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span>{isClockingIn ? "Clocking In..." : "Clock In for Today"}</span>
                  </button>
                ) : (
                  <div className={`py-3 px-4 rounded-2xl border flex items-center justify-between ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.04] border-white/5"
                  }`}>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">Clocked In</span>
                      <span className={`text-xs font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>{todayAttendance.clockInTime}</span>
                    </div>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2.5}>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                )}

                {/* Button 2: Take Break OR Resume Work */}
                {isCheckedIn && !isOnBreak && !isShiftConcluded && (
                  <button
                    type="button"
                    onClick={() => setShowBreakModal(true)}
                    className="py-3.5 px-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="6" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                    </svg>
                    <span>Take a Break</span>
                  </button>
                )}

                {isOnBreak && !isShiftConcluded && (
                  <button
                    type="button"
                    onClick={handleEndBreak}
                    disabled={isEndingBreak}
                    className="py-3.5 px-5 rounded-2xl font-black text-xs transition-all duration-200 flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer active:scale-[0.98] hover:scale-[1.01] hover:brightness-105 shadow-[0_4px_18px_rgba(44,236,247,0.45)] hover:shadow-[0_6px_26px_rgba(44,236,247,0.65)] border border-[#2cecf7] group"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                    }}
                  >
                    <span className="w-5 h-5 rounded-md bg-black/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="#02040a" stroke="#02040a" strokeWidth={1}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </span>
                    <span className="tracking-wide uppercase font-extrabold">{isEndingBreak ? "Resuming..." : "Resume Work"}</span>
                  </button>
                )}

                {/* Button 3: Clock Out (When Checked In) */}
                {isCheckedIn && !isShiftConcluded && (
                  <button
                    type="button"
                    onClick={handleClockOut}
                    disabled={isClockingOut}
                    className="py-3.5 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                  >
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{isClockingOut ? "Concluding..." : "Clock Out"}</span>
                  </button>
                )}

                {/* Button 4: Daily Work Report */}
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(true)}
                  className="py-3.5 px-4 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] hover:scale-[1.01]"
                  style={{
                    background: isLight ? "#ecfeff" : "rgba(44, 236, 247, 0.08)",
                    border: "1px solid rgba(44, 236, 247, 0.35)",
                    color: isLight ? "#0891b2" : "#2cecf7"
                  }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>{todayWorkUpdate ? "Edit Daily Report" : "Submit Daily Report"}</span>
                </button>
              </div>

              {/* Quick Request links: Missed Punch, Leave, Off-Day Swap */}
              <div className={`flex flex-wrap items-center gap-2 pt-3 border-t text-xs ${
                isLight ? "border-slate-200 text-slate-500" : "border-white/5 text-neutral-400"
              }`}>
                <span className="font-semibold text-[11px] font-mono uppercase tracking-wider">Shortcuts:</span>
                <button
                  type="button"
                  onClick={() => setShowMissedAttendanceModal(true)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#2cecf7] hover:shadow-[0_0_12px_rgba(44,236,247,0.22)] active:scale-95 ${
                    isLight ? "bg-white border-slate-200 text-slate-700 hover:bg-cyan-50/40 hover:text-cyan-900" : "bg-white/5 border-white/5 text-neutral-200 hover:bg-[#2cecf7]/10 hover:text-[#2cecf7]"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" />
                  </svg>
                  <span>Missed Punch</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowOffDaySwapModal(true)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#2cecf7] hover:shadow-[0_0_12px_rgba(44,236,247,0.22)] active:scale-95 ${
                    isLight ? "bg-white border-slate-200 text-slate-700 hover:bg-cyan-50/40 hover:text-cyan-900" : "bg-white/5 border-white/5 text-neutral-200 hover:bg-[#2cecf7]/10 hover:text-[#2cecf7]"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" />
                  </svg>
                  <span>Off-Day Swap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer hover:border-[#2cecf7] hover:shadow-[0_0_12px_rgba(44,236,247,0.22)] active:scale-95 ${
                    isLight ? "bg-white border-slate-200 text-slate-700 hover:bg-cyan-50/40 hover:text-cyan-900" : "bg-white/5 border-white/5 text-neutral-200 hover:bg-[#2cecf7]/10 hover:text-[#2cecf7]"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span>Apply Leave</span>
                </button>
              </div>
            </div>

            {/* ── RIGHT WING: VISUAL SHIFT HORIZON & TELEMETRY (Col 8 to 12 - Filling Empty Space) ── */}
            <div className={`lg:col-span-5 p-4 sm:p-5 rounded-2xl border space-y-4 backdrop-blur-md ${
              isLight
                ? "bg-white/80 border-slate-200/90 shadow-sm"
                : "bg-black/40 border-white/10 shadow-lg"
            }`}>
              {/* Header: Visual Shift Horizon */}
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#2cecf7] animate-pulse" />
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                    Daily Shift Horizon
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold text-cyan-500 bg-[#2cecf7]/10 px-2 py-0.5 rounded-full border border-[#2cecf7]/25">
                  {shiftProgressPercent}% Horizon
                </span>
              </div>

              {/* Interactive Timeline Progression Bar with Checkpoints */}
              <div className="space-y-2 pt-1">
                <div className="relative pt-3 pb-1">
                  {/* Track line */}
                  <div className={`h-2 rounded-full w-full overflow-hidden ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                    <div
                      className="h-full rounded-full transition-all duration-700 anim-shimmer"
                      style={{
                        width: `${shiftProgressPercent}%`,
                        background: "linear-gradient(90deg, #0891b2 0%, #2cecf7 50%, #10b981 100%)",
                        backgroundSize: "200% 100%"
                      }}
                    />
                  </div>

                  {/* Pulsing Needle Indicator at current progress */}
                  <div
                    className="absolute top-1 transform -translate-x-1/2 transition-all duration-700 pointer-events-none"
                    style={{ left: `${Math.max(4, Math.min(96, shiftProgressPercent))}%` }}
                  >
                    <div className="w-4 h-4 rounded-full bg-[#2cecf7] border-2 border-white shadow-[0_0_12px_#2cecf7] flex items-center justify-center animate-bounce">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#02040a]" />
                    </div>
                  </div>
                </div>

                {/* 4 Checkpoint Labels */}
                <div className="grid grid-cols-4 text-center font-mono text-[9px] pt-1">
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-[#2cecf7]">09:00 AM</span>
                    <span className="text-neutral-400 mt-0.5">Start</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-amber-500">01:00 PM</span>
                    <span className="text-neutral-400 mt-0.5">Lunch</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-cyan-500">05:00 PM</span>
                    <span className="text-neutral-400 mt-0.5">Report</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-emerald-500">06:00 PM</span>
                    <span className="text-neutral-400 mt-0.5">Conclude</span>
                  </div>
                </div>
              </div>

              {/* 3-Pillar Telemetry Micro-Cards */}
              <div className="grid grid-cols-3 gap-2 pt-2 text-xs font-mono">
                <div className={`p-2.5 rounded-xl border text-center space-y-0.5 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"
                }`}>
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider block">Duration</span>
                  <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>9.0 hrs</span>
                  <span className="text-[8px] text-cyan-500 block">15m Grace</span>
                </div>

                <div className={`p-2.5 rounded-xl border text-center space-y-0.5 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"
                }`}>
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider block">Target Net</span>
                  <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>8.0 hrs</span>
                  <span className="text-[8px] text-emerald-500 block">Standard</span>
                </div>

                <div className={`p-2.5 rounded-xl border text-center space-y-0.5 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"
                }`}>
                  <span className="text-[9px] text-neutral-400 uppercase tracking-wider block">Breaks</span>
                  <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                    {todayAttendance?.totalBreakMinutes ? `${todayAttendance.totalBreakMinutes}m` : "0m"}
                  </span>
                  <span className="text-[8px] text-amber-500 block">Quota: 80m</span>
                </div>
              </div>

              {/* Studio Telemetry Verified Badge */}
              <div className={`p-2.5 rounded-xl border flex items-center justify-between text-[10px] font-mono ${
                isLight ? "bg-cyan-50/50 border-cyan-200/60 text-cyan-900" : "bg-[#2cecf7]/5 border-[#2cecf7]/20 text-[#2cecf7]"
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">Studio Node: Biometric Verified</span>
                </div>
                <span className="font-bold">UTC+6 Local</span>
              </div>
            </div>

          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. ASSIGNED TASKS WIDGET & SPRINT TICKETS
        ───────────────────────────────────────────────────────────── */}
        <div className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-xl space-y-5 transition-all shadow-xl ${
          isLight
            ? "bg-white border-slate-200/90 shadow-sm"
            : "bg-[#0a0f1d]/80 border-[#2cecf7]/15 shadow-2xl"
        }`}>
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
            isLight ? "border-slate-100" : "border-white/5"
          }`}>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-[#2cecf7]/10 border border-[#2cecf7]/25 text-[#2cecf7] flex items-center justify-center">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                </span>
                <h3 className={`text-base sm:text-lg font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Assigned Sprints & Deadlines ({tasks.filter((t) => t.status !== "completed").length} Active)
                </h3>
              </div>
              <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                Tasks assigned by administration. Update status, mark progress %, and attach deliverables.
              </p>
            </div>

            <Link
              href="/staff/tasks"
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer ${
                isLight
                  ? "bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100"
                  : "bg-[#2cecf7]/10 border-[#2cecf7]/25 text-[#2cecf7] hover:bg-[#2cecf7]/20"
              }`}
            >
              <span>View All Tasks</span>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
          </div>

          {tasks.length === 0 ? (
            <div className={`py-10 px-4 rounded-2xl border text-center space-y-3 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/30 border-white/5"
            }`}>
              <div className="w-12 h-12 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/25 text-[#2cecf7] flex items-center justify-center mx-auto shadow-sm">
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Sprint Queue Clear & On Track</h4>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  No pending deliverables or sprints assigned right now. When tasks are dispatched by administration, you can update completion percentage and attach deliverables here.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  style={{
                    background: isLight ? "#e5f8fc" : "rgba(44, 236, 247, 0.15)",
                    border: "1px solid rgba(44, 236, 247, 0.3)",
                    color: isLight ? "#0891b2" : "#2cecf7"
                  }}
                >
                  Log Daily Tasks
                </button>
                <Link
                  href="/staff/agreement"
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                    isLight ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-50" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  View Agreement
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all hover:-translate-y-0.5 ${
                    isLight ? "bg-slate-50 border-slate-200 hover:border-cyan-300" : "bg-black/40 border-white/5 hover:border-[#2cecf7]/30"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#2cecf7]/10 text-[#2cecf7] border border-[#2cecf7]/25">
                        {task.priority}
                      </span>
                      <span className={`text-[11px] font-semibold ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </div>
                    <h4 className={`text-xs font-bold line-clamp-1 ${isLight ? "text-slate-900" : "text-white"}`}>{task.title}</h4>
                    {task.description && (
                      <p className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                        {task.description}
                      </p>
                    )}
                    <div className={`mt-3 text-[11px] flex justify-between ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                      <span>Due: {task.dueDate}</span>
                      <span className="font-bold" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>{task.progressPercent || 0}%</span>
                    </div>
                    <div className={`w-full h-1.5 rounded-full overflow-hidden mt-1 ${isLight ? "bg-slate-200" : "bg-white/10"}`}>
                      <div
                        className="h-full rounded-full shadow-[0_0_10px_#2cecf7] anim-shimmer"
                        style={{
                          width: `${task.progressPercent || 0}%`,
                          background: "linear-gradient(90deg, #2cecf7 0%, #3b82f6 50%, #2cecf7 100%)",
                          backgroundSize: "200% 100%"
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickTaskToUpdate(task);
                      setTaskStatusChoice(task.status);
                      setTaskProgressChoice(task.progressPercent || 0);
                      setTaskNotesChoice(task.employeeNotes || "");
                    }}
                    className={`mt-3 py-2 px-3 rounded-xl border text-[11px] font-semibold transition-all text-center cursor-pointer hover:border-[#2cecf7]/40 ${
                      isLight ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-100" : "bg-white/5 border-white/10 text-neutral-200 hover:bg-white/10"
                    }`}
                  >
                    Quick Update
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3.5. TODAY'S PERSONAL ACTIVITY TIMELINE
        ───────────────────────────────────────────────────────────── */}
        <div className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-xl space-y-4 transition-all shadow-xl ${
          isLight
            ? "bg-white border-slate-200/90 shadow-sm"
            : "bg-[#0a0f1d]/80 border-white/10 shadow-2xl"
        }`}>
          <div className={`flex items-center justify-between pb-3 border-b ${
            isLight ? "border-slate-100" : "border-white/5"
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 flex items-center justify-center">
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" />
                </svg>
              </span>
              <div>
                <h3 className={`text-base font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Today&apos;s Activity Timeline
                </h3>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                  Chronological record of your punches, breaks, report submissions, and shift milestones.
                </p>
              </div>
            </div>

            <span className={`text-[11px] font-mono font-medium ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
            {/* Event 1: Check In */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-slate-500" : "text-neutral-400"}`}>Clock-In Punch</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {todayAttendance?.clockInTime || "Not Clocked In"}
              </span>
              <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {todayAttendance ? "Verified on shift roster" : "Awaiting clock-in"}
              </span>
            </div>

            {/* Event 2: Breaks Taken */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-slate-500" : "text-neutral-400"}`}>Structured Breaks</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                </svg>
              </div>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {todayAttendance?.totalBreakMinutes ? `${todayAttendance.totalBreakMinutes} mins` : isOnBreak ? "Break in Progress" : "No Breaks Taken"}
              </span>
              <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {isOnBreak ? activeBreakText : `${todayAttendance?.breaks?.length || 0} total breaks logged`}
              </span>
            </div>

            {/* Event 3: Daily Work Report */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-slate-500" : "text-neutral-400"}`}>Engineering Report</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {todayWorkUpdate ? "Logged ✓" : "Pending Log"}
              </span>
              <span className={`text-[10px] block truncate ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                {todayWorkUpdate ? `${todayWorkUpdate.hoursWorked} hrs recorded` : "Due at end of shift"}
              </span>
            </div>

            {/* Event 4: Clock-Out */}
            <div className={`p-4 rounded-2xl border space-y-1.5 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-black/40 border-white/5"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isLight ? "text-slate-500" : "text-neutral-400"}`}>Shift Conclusion</span>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth={2}>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {todayAttendance?.clockOutTime || (isCheckedIn ? "Active Shift" : "Shift Not Started")}
              </span>
              <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
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
        <div className={`rounded-3xl border p-6 sm:p-7 backdrop-blur-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 transition-all shadow-xl relative overflow-hidden group ${
          isLight
            ? "bg-gradient-to-r from-cyan-50/70 via-white to-blue-50/40 border-cyan-200/80 shadow-[0_16px_36px_rgba(44,236,247,0.12)]"
            : "bg-gradient-to-r from-[#0a1426] via-[#080d1a] to-[#0a0f1d] border-[#2cecf7]/25 shadow-2xl"
        }`}>
          {/* Subtle Ambient Laser Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#2cecf7] to-transparent anim-sweep-laser opacity-70 pointer-events-none" />

          <div className="flex items-start sm:items-center gap-4 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 text-[#2cecf7] flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5 sm:mt-0">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Legally Binding // Active
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-white/5 border-white/10 text-neutral-400"
                }`}>
                  ID: DEV-ENG-CTR-{staffData.uid ? staffData.uid.slice(0, 6).toUpperCase() : "2026"}
                </span>
              </div>
              <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Employment Contract & Legal Agreement
              </h3>
              <p className={`text-xs ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
                Review your official compensation structure, retainer/hourly milestones, company shift terms, and download the stamped PDF dossier.
              </p>
            </div>
          </div>

          <Link
            href="/staff/agreement"
            className="w-full sm:w-auto px-5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 flex-shrink-0 cursor-pointer active:scale-[0.98] hover:scale-[1.02] hover:brightness-105 shadow-[0_3px_14px_rgba(44,236,247,0.3)] hover:shadow-[0_4px_22px_rgba(44,236,247,0.5)] border border-[#2cecf7]/60"
            style={{
              background: "#2cecf7",
              color: "#02040a",
            }}
          >
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>View & Download Contract</span>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODALS: BREAK, MISSED ATTENDANCE, WORK UPDATE, LEAVE, SWAP
        ───────────────────────────────────────────────────────────── */}

        {/* Modal 1: Take Break */}
        {showBreakModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2}>
                    <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
                  </svg>
                  <span>Select Break Type</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBreakModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {(["lunch", "tea", "meeting", "personal"] as BreakType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedBreakType(type)}
                    className={`p-3.5 rounded-2xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      selectedBreakType === type
                        ? "bg-amber-500/15 border-amber-500 text-amber-500 dark:text-amber-300 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        : "bg-black/30 border-white/10 text-neutral-400 hover:text-white"
                    }`}
                  >
                    <span className="block font-bold">{BREAK_TYPE_LABELS[type]}</span>
                    <span className={`text-[10px] block mt-1 ${isLight ? "text-slate-500" : "text-neutral-500"}`}>
                      {type === "lunch" ? "Up to 60 mins" : "Up to 20 mins"}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                  Optional Note / Reason
                </label>
                <input
                  type="text"
                  value={breakNote}
                  onChange={(e) => setBreakNote(e.target.value)}
                  placeholder="e.g. Grabbing lunch nearby..."
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                    isLight
                      ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      : "bg-black/40 border border-white/10 text-white focus:border-amber-500 outline-none"
                  }`}
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBreakModal(false)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                    isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartBreak}
                  disabled={isStartingBreak}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#02040a] font-bold text-xs transition-all shadow-[0_0_20px_rgba(245,158,11,0.35)] disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                >
                  {isStartingBreak ? "Starting..." : "Start Break Now"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Quick Task Update */}
        {quickTaskToUpdate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span>Update Task Progress</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setQuickTaskToUpdate(null)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className={`p-3 rounded-xl border ${isLight ? "bg-cyan-50/60 border-cyan-200" : "bg-[#2cecf7]/10 border-[#2cecf7]/25"}`}>
                <p className="text-xs font-bold line-clamp-1" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>
                  {quickTaskToUpdate.title}
                </p>
              </div>

              <form onSubmit={handleSaveQuickTask} className="space-y-4">
                <CustomSelectField<TaskStatus>
                  label="Status"
                  value={taskStatusChoice}
                  onChange={(val) => {
                    setTaskStatusChoice(val);
                    if (val === "completed" && taskProgressChoice < 100) {
                      setTaskProgressChoice(100);
                    }
                  }}
                  options={TASK_STATUS_OPTIONS}
                />

                <div>
                  <div className={`flex justify-between text-xs font-semibold mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    <span>Progress:</span>
                    <span className="font-extrabold" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>{taskProgressChoice}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={taskProgressChoice}
                    onChange={(e) => setTaskProgressChoice(Number(e.target.value))}
                    className="w-full accent-[#2cecf7] cursor-pointer"
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Progress Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={taskNotesChoice}
                    onChange={(e) => setTaskNotesChoice(e.target.value)}
                    placeholder="Short update on current milestone..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setQuickTaskToUpdate(null)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingTask}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                      boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)",
                    }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" />
                  </svg>
                  <span>Off-Day Swap Request</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowOffDaySwapModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitOffDaySwap} className="space-y-3.5">
                <CustomDatePickerField
                  label="Scheduled Off-Day to Work On"
                  required
                  value={swapForm.currentOffDate}
                  onChange={(val) => setSwapForm({ ...swapForm, currentOffDate: val })}
                  placeholder="Select scheduled off-day..."
                />

                <CustomDatePickerField
                  label="Requested Day Off Instead"
                  required
                  value={swapForm.requestedWorkDate}
                  onChange={(val) => setSwapForm({ ...swapForm, requestedWorkDate: val })}
                  placeholder="Select replacement day off..."
                />

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Reason for Swap
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={swapForm.reason}
                    onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                    placeholder="Explain why you need to swap this off-day..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                {swapSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold text-center">
                    {swapSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOffDaySwapModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSwap}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                      boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)",
                    }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" />
                  </svg>
                  <span>Missed Punch Regularization</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMissedAttendanceModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitMissedAttendance} className="space-y-3.5">
                <CustomDatePickerField
                  label="Past Date (Must be before today)"
                  required
                  maxDate={new Date(Date.now() - 86400000).toISOString().split("T")[0]}
                  value={missedForm.targetDate}
                  onChange={(val) => setMissedForm({ ...missedForm, targetDate: val })}
                  placeholder="Select past date to regularize..."
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Clock In Time</label>
                    <input
                      type="text"
                      required
                      value={missedForm.clockInTime}
                      onChange={(e) => setMissedForm({ ...missedForm, clockInTime: e.target.value })}
                      placeholder="09:30 AM"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                        isLight
                          ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                          : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Clock Out Time</label>
                    <input
                      type="text"
                      value={missedForm.clockOutTime}
                      onChange={(e) => setMissedForm({ ...missedForm, clockOutTime: e.target.value })}
                      placeholder="06:30 PM"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                        isLight
                          ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                          : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={missedForm.reason}
                    onChange={(e) => setMissedForm({ ...missedForm, reason: e.target.value })}
                    placeholder="Describe why attendance was missed..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                {missedSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold text-center">
                    {missedSuccessMsg}
                  </div>
                )}
                {missedErrorMsg && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 text-xs font-semibold text-center">
                    {missedErrorMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMissedAttendanceModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMissed}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                      boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)",
                    }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-3xl border p-6 sm:p-7 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Daily Work Update ({getTodayDateString()})</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitWorkUpdate} className="space-y-3.5">
                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Tasks Completed Today (Required)
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={workForm.tasksCompleted}
                    onChange={(e) => setWorkForm({ ...workForm, tasksCompleted: e.target.value })}
                    placeholder="• Implemented feature X&#10;• Fixed issue Y"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Tasks In Progress (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={workForm.tasksInProgress}
                    onChange={(e) => setWorkForm({ ...workForm, tasksInProgress: e.target.value })}
                    placeholder="Ongoing items carried forward..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Hours Worked</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="16"
                      value={workForm.hoursWorked}
                      onChange={(e) => setWorkForm({ ...workForm, hoursWorked: Number(e.target.value) })}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                        isLight
                          ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                          : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Blockers (if any)</label>
                    <input
                      type="text"
                      value={workForm.blockers}
                      onChange={(e) => setWorkForm({ ...workForm, blockers: e.target.value })}
                      placeholder="None"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                        isLight
                          ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                          : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Project / PR / Figma Links (Optional)
                  </label>
                  <input
                    type="text"
                    value={workForm.projectLinks}
                    onChange={(e) => setWorkForm({ ...workForm, projectLinks: e.target.value })}
                    placeholder="https://github.com/... or Figma link"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                <AttachmentPicker
                  label="Attachments (Optional)"
                  hint="PDF, images, documents (up to 10 MB, max 5)"
                  storageFolder={`work-updates/${staffData?.id || "general"}`}
                  value={workForm.attachments}
                  onChange={(attachments) => setWorkForm({ ...workForm, attachments })}
                />

                {workSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold text-center">
                    {workSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWorkUpdateModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWork}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                      boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)",
                    }}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 ${
              isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0b0f1a] border-white/10 text-white"
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <h3 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#2cecf7" strokeWidth={2}>
                    <path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span>Apply for Leave</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500" : "bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white"
                  }`}
                >
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmitLeave} className="space-y-3.5">
                <CustomSelectField
                  label="Leave Type"
                  required
                  value={leaveForm.leaveType}
                  onChange={(val) => setLeaveForm({ ...leaveForm, leaveType: val })}
                  options={LEAVE_OPTIONS}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <CustomDatePickerField
                    label="Start Date"
                    required
                    value={leaveForm.startDate}
                    onChange={(val) => setLeaveForm({ ...leaveForm, startDate: val })}
                    placeholder="Start date..."
                    align="left"
                  />
                  <CustomDatePickerField
                    label="End Date"
                    required
                    value={leaveForm.endDate}
                    minDate={leaveForm.startDate || undefined}
                    onChange={(val) => setLeaveForm({ ...leaveForm, endDate: val })}
                    placeholder="End date..."
                    align="right"
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>Reason</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Describe purpose of leave..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs resize-none outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                <div>
                  <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
                    Emergency Contact (Optional)
                  </label>
                  <input
                    type="text"
                    value={leaveForm.emergencyContact}
                    onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: e.target.value })}
                    placeholder="Phone number or alternative email"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs outline-none ${
                      isLight
                        ? "bg-slate-50 border border-slate-300 text-slate-900 focus:bg-white focus:border-[#2cecf7]"
                        : "bg-black/40 border border-white/10 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>

                {leaveSuccessMsg && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold text-center">
                    {leaveSuccessMsg}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveModal(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200" : "bg-white/5 border-white/10 text-neutral-300 hover:bg-white/10"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLeave}
                    className="flex-1 py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98]"
                    style={{
                      background: "#2cecf7",
                      color: "#02040a",
                      boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)",
                    }}
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
