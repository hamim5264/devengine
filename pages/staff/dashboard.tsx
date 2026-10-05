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
  clockOutStaff,
  submitMissedAttendanceRequest,
  getStaffWorkUpdateForDate,
  submitDailyWorkUpdate,
  getStaffLeaveRequests,
  submitLeaveRequest,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import { STAFF_TYPE_LABELS, STAFF_TYPE_COLORS, MODULE_CONFIG } from "@/types/staff";
import type {
  AttendanceRecord,
  DailyWorkUpdate,
  LeaveRequest,
  LeaveType,
} from "@/types/staffEcoSystem";
import { LEAVE_TYPE_LABELS } from "@/types/staffEcoSystem";

export default function StaffDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  // Live Clock & Time of Day Greeting
  const [currentTime, setCurrentTime] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("Welcome");

  // Ecosystem state
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayWorkUpdate, setTodayWorkUpdate] = useState<DailyWorkUpdate | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);

  // Modals state
  const [showMissedAttendanceModal, setShowMissedAttendanceModal] = useState(false);
  const [showWorkUpdateModal, setShowWorkUpdateModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  // Form states
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

  // Live timer for elapsed shift
  const [elapsedShiftText, setElapsedShiftText] = useState<string>("");

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

      // Calculate elapsed shift if clocked in and not yet clocked out
      const inTime = todayAttendance?.clockInTimestamp || todayAttendance?.createdAt;
      if (inTime && todayAttendance && !todayAttendance.clockOutTime) {
        const inDate = new Date(inTime);
        const diffMs = Math.max(0, now.getTime() - inDate.getTime());
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);
        setElapsedShiftText(
          `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`
        );
      } else {
        setElapsedShiftText("");
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [todayAttendance]);

  // Calculate yesterday's date string for missed attendance max attribute
  const yesterdayDateString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const loadEcosystemData = async (staff: StaffMember) => {
    try {
      const today = getTodayDateString();
      const [att, work, leaves] = await Promise.all([
        getStaffAttendanceForDate(staff.id, today),
        getStaffWorkUpdateForDate(staff.id, today),
        getStaffLeaveRequests(staff.id),
      ]);
      setTodayAttendance(att);
      setTodayWorkUpdate(work);
      setLeaveRequests(leaves);
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

  // Handlers
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
    } catch (err) {
      console.error("Clock in failed:", err);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!staffData || isClockingOut) return;
    setIsClockingOut(true);
    try {
      const record = await clockOutStaff(staffData.id);
      if (record) setTodayAttendance(record);
    } catch (err) {
      console.error("Clock out failed:", err);
    } finally {
      setIsClockingOut(false);
    }
  };

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
      setLeaveSuccessMsg("Leave application submitted for approval!");
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
      }, 1200);
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
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  };

  const pendingLeaves = leaveRequests.filter((l) => l.status === "pending");
  const approvedLeaves = leaveRequests.filter((l) => l.status === "approved");

  // Build module cards
  const moduleCards = staffData.allowedModules
    .map((key) => {
      const cfg = MODULE_CONFIG[key];
      if (!cfg) return null;
      const routeMap: Record<string, string> = {
        overview: "/staff/dashboard",
        commerce: "/staff/manage-orders",
        projects: "/staff/manage-projects",
        content_cms: "/staff/manage-landing",
        social_network: "/staff/manage-socials",
        legal: "/staff/manage-terms",
        system: "/staff/manage-maintenance",
      };
      return { ...cfg, key, href: routeMap[key] || "/staff/dashboard" };
    })
    .filter(Boolean) as Array<{
    label: string;
    icon: string;
    color: string;
    description: string;
    key: string;
    href: string;
  }>;

  return (
    <StaffLayout title="Dashboard | Staff Portal">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8 space-y-6">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ─────────────────────────────────────────────────────────────
              1. CYBER HERO COCKPIT HEADER
          ───────────────────────────────────────────────────────────── */}
          <div
            className="rounded-3xl p-6 sm:p-8 border border-white/[0.08] backdrop-blur-2xl shadow-2xl relative overflow-hidden transition-all"
            style={{
              background:
                "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(14,165,233,0.06) 50%, rgba(12,12,22,0.95) 100%)",
            }}
          >
            {/* Ambient Lighting Orbs */}
            <div
              className="absolute -top-16 -right-16 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-40"
              style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)" }}
            />
            <div
              className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-20"
              style={{ background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)" }}
            />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Profile Section */}
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="relative">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border-2 border-violet-500/40 shadow-[0_0_25px_rgba(168,85,247,0.35)] flex items-center justify-center flex-shrink-0">
                    {staffData.avatarUrl ? (
                      <img
                        src={staffData.avatarUrl}
                        alt={staffData.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] text-violet-300">
                        {staffData.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {/* Status Indicator Pip */}
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0c0c16] shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
                      {greeting}
                    </span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs font-mono text-gray-400">DevEngine Operational Portal</span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold font-['Space_Grotesk'] text-white tracking-tight">
                    {staffData.name}
                  </h1>

                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono font-semibold shadow-sm ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}
                    >
                      <span className="material-symbols-outlined text-sm">badge</span>
                      {STAFF_TYPE_LABELS[staffData.staffType] || staffData.staffType}
                    </span>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active Staff
                    </span>

                    <span className="text-[11px] font-mono text-gray-500 hidden sm:inline-block">
                      {staffData.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Live Digital Clock & HUD Calendar */}
              <div className="flex items-center lg:items-end flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-black/40 border border-white/[0.08] backdrop-blur-md self-start lg:self-auto">
                <div className="flex items-center gap-2 text-violet-400">
                  <span className="material-symbols-outlined text-base animate-pulse">schedule</span>
                  <span className="text-lg sm:text-2xl font-mono font-bold text-white tracking-wider">
                    {currentTime || "00:00:00 AM"}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-gray-400 block">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                    UTC +06:00 (Standard Operations)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              2. CYBER METRICS QUICK-RIBBON (4 STAT CAPSULES)
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* 1. Shift Status */}
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider block">
                Today's Shift
              </span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {todayAttendance?.clockOutTime ? (
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-['Space_Grotesk']">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Shift Concluded
                    </span>
                  ) : todayAttendance ? (
                    <span className="text-sm font-bold text-cyan-400 flex items-center gap-1.5 font-['Space_Grotesk']">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      In Progress
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5 font-['Space_Grotesk']">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Not Started
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                    {todayAttendance ? `In @ ${todayAttendance.clockInTime}` : "Shift: 09:30 AM - 06:30 PM"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">alarm_on</span>
                </div>
              </div>
            </div>

            {/* 2. Active Session Timer */}
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-cyan-400 tracking-wider block">
                Elapsed Working Time
              </span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-sm sm:text-base font-bold font-mono text-white tracking-wide block">
                    {elapsedShiftText || (todayAttendance?.clockOutTime ? "8h Completed" : "00h 00m 00s")}
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                    {todayAttendance ? "Live counter active" : "Clock in to start tracking"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">timelapse</span>
                </div>
              </div>
            </div>

            {/* 3. Daily Work Update Status */}
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-gray-400 tracking-wider block">
                Work Report
              </span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  {todayWorkUpdate ? (
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm">verified</span>
                      Submitted
                    </span>
                  ) : (
                    <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5 font-['Space_Grotesk']">
                      <span className="material-symbols-outlined text-sm">pending_actions</span>
                      Pending EOD
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                    {todayWorkUpdate ? `${todayWorkUpdate.hoursWorked} hrs recorded` : "Due before shift checkout"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">edit_document</span>
                </div>
              </div>
            </div>

            {/* 4. Leave Allowance Balance */}
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
              <span className="text-[10px] font-mono uppercase text-amber-400 tracking-wider block">
                PTO Available
              </span>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-sm sm:text-base font-bold font-mono text-white tracking-wide block">
                    14 Days
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 block mt-0.5">
                    {pendingLeaves.length > 0 ? `${pendingLeaves.length} pending review` : "Casual / Sick / Emergency"}
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg">beach_access</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              3. HIGH-TECH 3 CORE INTERACTIVE WORKSPACE CARDS
          ───────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* ── CARD 1: DAILY ATTENDANCE ── */}
            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(168,85,247,0.12)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-44 h-44 bg-violet-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-violet-600/20 transition-all duration-500" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/30 text-violet-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">alarm_on</span>
                  </div>
                  <Link
                    href="/staff/attendance"
                    className="text-xs font-mono text-violet-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/40 transition-all"
                  >
                    View Logs
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>

                <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                  Daily Attendance
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Punch your daily presence for today. Backdated entries are restricted and require administrator approval.
                </p>

                {/* Status Box */}
                <div className="mt-5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Current Status:</span>
                    {todayAttendance ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        Clocked In
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        Not Clocked In
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.04] text-[11px] font-mono">
                    <div>
                      <span className="text-gray-500 block">Check In Time:</span>
                      <span className="text-white font-medium">
                        {todayAttendance?.clockInTime || "Pending"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Check Out Time:</span>
                      <span className="text-white font-medium">
                        {todayAttendance?.clockOutTime || "Pending"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2.5">
                {!todayAttendance ? (
                  <button
                    onClick={handleClockIn}
                    disabled={isClockingIn}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">login</span>
                    {isClockingIn ? "Clocking In..." : "Clock In for Today"}
                  </button>
                ) : !todayAttendance.clockOutTime ? (
                  <button
                    onClick={handleClockOut}
                    disabled={isClockingOut}
                    className="w-full py-3 px-4 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-200 text-xs font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    {isClockingOut ? "Clocking Out..." : "Clock Out for Today"}
                  </button>
                ) : (
                  <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-emerald-300 text-xs font-mono font-medium flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-base text-emerald-400">task_alt</span>
                    Attendance Completed for Today
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowMissedAttendanceModal(true)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-violet-500/30 text-gray-300 hover:text-white text-xs font-mono transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-sm text-violet-400">history_toggle_off</span>
                  Missed a Past Date? Send Request
                </button>
              </div>
            </div>

            {/* ── CARD 2: DAILY WORK UPDATE ── */}
            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.12)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-44 h-44 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-600/20 transition-all duration-500" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">edit_note</span>
                  </div>
                  <Link
                    href="/staff/work-updates"
                    className="text-xs font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                  >
                    All Reports
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>

                <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                  Daily Work Update
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Log your engineering achievements, in-progress tasks, blockers, and total hours dedicated today.
                </p>

                {/* Status Box */}
                <div className="mt-5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Submission Status:</span>
                    {todayWorkUpdate ? (
                      <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        Report Saved
                      </span>
                    ) : (
                      <span className="text-amber-400 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        Pending
                      </span>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/[0.04]">
                    {todayWorkUpdate ? (
                      <div className="text-[11px] font-mono text-gray-300">
                        <span className="text-gray-500">Logged:</span> {todayWorkUpdate.hoursWorked} hrs |{" "}
                        <span className="text-cyan-400">
                          {todayWorkUpdate.tasksCompleted.slice(0, 32)}...
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono text-gray-500">
                        No report recorded for today yet.
                      </span>
                    )}
                  </div>

                  {todayWorkUpdate?.adminFeedback && (
                    <div className="mt-2 p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-[11px] text-violet-200">
                      <span className="font-bold text-violet-300 block mb-0.5">Admin Review:</span>
                      {todayWorkUpdate.adminFeedback}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {todayWorkUpdate ? "edit" : "post_add"}
                  </span>
                  {todayWorkUpdate ? "Edit Today's Work Report" : "Submit Daily Work Report"}
                </button>
              </div>
            </div>

            {/* ── CARD 3: LEAVE APPLICATIONS ── */}
            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col justify-between hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.12)] transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-44 h-44 bg-amber-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-600/20 transition-all duration-500" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-2xl">beach_access</span>
                  </div>
                  <Link
                    href="/staff/leaves"
                    className="text-xs font-mono text-amber-300 hover:text-white flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                  >
                    Leave History
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>

                <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] tracking-tight">
                  Leave Applications
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Request planned casual time off, medical recovery, or urgent emergency absence with live tracking.
                </p>

                {/* Status Box */}
                <div className="mt-5 p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono block">Pending Review</span>
                    <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
                      {pendingLeaves.length}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-[10px] text-gray-400 uppercase font-mono block">Approved</span>
                    <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                      {approvedLeaves.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-rose-600 to-pink-600 hover:from-amber-500 hover:to-pink-500 text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">beach_access</span>
                  Apply for Leave
                </button>
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              4. ASSIGNED FUNCTIONAL MODULES (ELEVATED CARDS)
          ───────────────────────────────────────────────────────────── */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">apps</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold font-['Space_Grotesk'] text-white">
                    Assigned Operational Modules
                  </h2>
                  <p className="text-xs text-gray-400 font-mono">
                    Modules unlocked for your role by Administrator
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">
                {moduleCards.length} modules accessible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {moduleCards.map((mod) => (
                <Link
                  key={mod.key}
                  href={mod.href}
                  className="group flex items-center gap-4 p-5 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-violet-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300 relative overflow-hidden"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 shadow-md"
                    style={{ background: `${mod.color}18`, color: mod.color, border: `1px solid ${mod.color}35` }}
                  >
                    <span className="material-symbols-outlined text-2xl">{mod.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-white block group-hover:text-violet-300 transition-colors">
                      {mod.label}
                    </span>
                    <span className="text-xs text-gray-400 block mt-0.5 truncate">
                      {mod.description}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-gray-600 group-hover:text-violet-400 group-hover:translate-x-1 text-lg transition-all shrink-0">
                    arrow_forward
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: MISSED ATTENDANCE REQUEST
      ───────────────────────────────────────────────────────────── */}
      {showMissedAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">history_toggle_off</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Request Missed Attendance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMissedAttendanceModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitMissedAttendance} className="mt-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-300 leading-relaxed">
                Direct clock-in is only permitted for the current day. If you forgot or faced technical issues on a past date, submit this request for administrator review.
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
                    value={missedForm.clockOutTime}
                    onChange={(e) => setMissedForm({ ...missedForm, clockOutTime: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Reason for Missed Attendance *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Electricity outage at home office / Forgot to clock out before leaving"
                  value={missedForm.reason}
                  onChange={(e) => setMissedForm({ ...missedForm, reason: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              {missedSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  {missedSuccessMsg}
                </div>
              )}
              {missedErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
                  {missedErrorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowMissedAttendanceModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMissed}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingMissed ? "Submitting..." : "Send Request to Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: DAILY WORK UPDATE
      ───────────────────────────────────────────────────────────── */}
      {showWorkUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Submit Daily Work Update
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWorkUpdateModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitWorkUpdate} className="mt-5 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Tasks Completed Today *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="• Fixed auth state persistence bug&#10;• Implemented staff dashboard UI&#10;• Reviewed PR #42"
                  value={workForm.tasksCompleted}
                  onChange={(e) => setWorkForm({ ...workForm, tasksCompleted: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Tasks In Progress / Next Shift Focus
                </label>
                <textarea
                  rows={2}
                  placeholder="• Working on leave approval logic..."
                  value={workForm.tasksInProgress}
                  onChange={(e) => setWorkForm({ ...workForm, tasksInProgress: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Blockers / Impeding Issues (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Waiting for Stripe live webhook keys"
                  value={workForm.blockers}
                  onChange={(e) => setWorkForm({ ...workForm, blockers: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="18"
                    step="0.5"
                    value={workForm.hoursWorked}
                    onChange={(e) => setWorkForm({ ...workForm, hoursWorked: Number(e.target.value) })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Project / PR Links
                  </label>
                  <input
                    type="text"
                    placeholder="https://github.com/..."
                    value={workForm.projectLinks}
                    onChange={(e) => setWorkForm({ ...workForm, projectLinks: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                  />
                </div>
              </div>

              {workSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  {workSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowWorkUpdateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWork}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingWork ? "Saving..." : "Save Daily Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: LEAVE APPLICATION
      ───────────────────────────────────────────────────────────── */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">beach_access</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Apply for Leave
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Leave Type *
                </label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value as LeaveType })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="casual" className="bg-[#0e0e1a] text-white">Casual Leave</option>
                  <option value="sick" className="bg-[#0e0e1a] text-white">Sick / Medical Leave</option>
                  <option value="emergency" className="bg-[#0e0e1a] text-white">Emergency Absence</option>
                  <option value="maternity_paternity" className="bg-[#0e0e1a] text-white">Maternity / Paternity</option>
                  <option value="unpaid" className="bg-[#0e0e1a] text-white">Unpaid Leave</option>
                  <option value="other" className="bg-[#0e0e1a] text-white">Other</option>
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
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
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
                    min={leaveForm.startDate}
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
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
                  placeholder="Explain reason for time off..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Emergency Phone Contact (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+880 1..."
                  value={leaveForm.emergencyContact}
                  onChange={(e) => setLeaveForm({ ...leaveForm, emergencyContact: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              {leaveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                  {leaveSuccessMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLeave}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingLeave ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
