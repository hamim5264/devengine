import React, { useState, useMemo, useRef } from "react";
import type { AttendanceRecord } from "@/types/staffEcoSystem";

interface HeatmapProps {
  records: AttendanceRecord[];
  year?: number;
  assignedOffDays?: string[]; // e.g. ["Friday", "Saturday"]
  onSelectDate?: (date: string, record?: AttendanceRecord) => void;
  className?: string;
}

interface DayCell {
  dateStr: string;
  dayOfWeek: number; // 0=Sun, 6=Sat
  isFuture: boolean;
  isOffDay: boolean;
  record?: AttendanceRecord;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceHeatmap({
  records,
  year = new Date().getFullYear(),
  assignedOffDays = ["Friday", "Saturday"],
  onSelectDate,
  className = "",
}: HeatmapProps) {
  // Filter View Mode: default is "today" as requested
  const [viewMode, setViewMode] = useState<"today" | "daily" | "monthly" | "yearly">("today");
  const [selectedYear, setSelectedYear] = useState<number>(year);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const [specificDateChoice, setSpecificDateChoice] = useState<string>(todayStr);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Floating hover popover coordinates & cell data
  const [hoveredCell, setHoveredCell] = useState<{
    cell: DayCell;
    centerX: number;
    top: number;
    bottom: number;
  } | null>(null);

  // Map records by date string "YYYY-MM-DD"
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    records.forEach((r) => {
      if (r.date) map.set(r.date, r);
    });
    return map;
  }, [records]);

  // Generate all 52 weeks of the given year for yearly grid
  const weeks = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);

    const startDayOfWeek = startDate.getDay();
    const currentIter = new Date(startDate);
    currentIter.setDate(currentIter.getDate() - startDayOfWeek);

    const generatedWeeks: DayCell[][] = [];
    let currentWeek: DayCell[] = [];

    while (currentIter <= endDate || currentWeek.length > 0) {
      const yearStr = currentIter.getFullYear();
      const monthStr = String(currentIter.getMonth() + 1).padStart(2, "0");
      const dateNumStr = String(currentIter.getDate()).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dateNumStr}`;
      const dayOfWeek = currentIter.getDay();
      const dayName = currentIter.toLocaleDateString("en-US", { weekday: "long" });

      const isCurrentYear = currentIter.getFullYear() === selectedYear;
      const isFuture = dateStr > todayStr;
      const isOffDay = assignedOffDays.includes(dayName);
      const record = recordMap.get(dateStr);

      if (isCurrentYear) {
        currentWeek.push({
          dateStr,
          dayOfWeek,
          isFuture,
          isOffDay,
          record,
        });
      } else {
        currentWeek.push({
          dateStr: "",
          dayOfWeek,
          isFuture: true,
          isOffDay: false,
          record: undefined,
        });
      }

      if (currentWeek.length === 7) {
        generatedWeeks.push(currentWeek);
        currentWeek = [];
        if (currentIter > endDate) break;
      }

      currentIter.setDate(currentIter.getDate() + 1);
    }

    return generatedWeeks;
  }, [selectedYear, recordMap, assignedOffDays, todayStr]);

  // Monthly Calendar cells for selected month
  const monthlyDays = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonthIndex, 1);
    const lastDay = new Date(selectedYear, selectedMonthIndex + 1, 0);

    const leadingBlanks = firstDay.getDay(); // 0-6
    const totalDays = lastDay.getDate();

    const cells: (DayCell | null)[] = [];

    for (let i = 0; i < leadingBlanks; i++) {
      cells.push(null);
    }

    for (let d = 1; d <= totalDays; d++) {
      const mStr = String(selectedMonthIndex + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      const dateStr = `${selectedYear}-${mStr}-${dStr}`;
      const dObj = new Date(selectedYear, selectedMonthIndex, d);
      const dayName = dObj.toLocaleDateString("en-US", { weekday: "long" });

      cells.push({
        dateStr,
        dayOfWeek: dObj.getDay(),
        isFuture: dateStr > todayStr,
        isOffDay: assignedOffDays.includes(dayName),
        record: recordMap.get(dateStr),
      });
    }

    return cells;
  }, [selectedYear, selectedMonthIndex, recordMap, assignedOffDays, todayStr]);

  // Statistics computation
  const stats = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let totalWorkHours = 0;

    recordMap.forEach((rec) => {
      const matchesYear = rec.date.startsWith(`${selectedYear}-`);
      const matchesMonth =
        viewMode === "monthly"
          ? rec.date.startsWith(
              `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, "0")}`
            )
          : true;

      if (matchesYear && matchesMonth) {
        if (rec.status === "present" || rec.status === "remote") presentCount++;
        if (rec.status === "late") {
          presentCount++;
          lateCount++;
        }
        if (rec.status === "on_leave") leaveCount++;
        totalWorkHours += rec.netWorkHours || rec.totalHours || 0;
      }
    });

    const onTimeRate =
      presentCount > 0
        ? Math.round(((presentCount - lateCount) / presentCount) * 100)
        : 100;

    return {
      presentCount,
      lateCount,
      leaveCount,
      totalWorkHours: Math.round(totalWorkHours * 10) / 10,
      onTimeRate,
    };
  }, [recordMap, selectedYear, selectedMonthIndex, viewMode]);

  // Color mapper for cells
  const getCellColor = (cell: DayCell): string => {
    if (!cell.dateStr) return "bg-transparent border-transparent";
    if (cell.record) {
      const hours = cell.record.netWorkHours !== undefined ? cell.record.netWorkHours : (cell.record.totalHours || 0);
      const effStatus = (cell.record.clockOutTime && hours < 5 && (cell.record.status === "present" || cell.record.status === "on_break"))
        ? "half_day"
        : cell.record.status;

      if (effStatus === "present") return "bg-emerald-500 hover:bg-emerald-400";
      if (effStatus === "late") return "bg-orange-500 hover:bg-orange-400 text-white";
      if (effStatus === "half_day") return "bg-yellow-400 hover:bg-yellow-300 text-slate-950";
      if (effStatus === "remote") return "bg-cyan-500 hover:bg-cyan-400";
      if (effStatus === "on_leave") return "bg-purple-500 hover:bg-purple-400";
      if (effStatus === "absent") return "bg-rose-500 hover:bg-rose-400";
      if (cell.record.isRegularized) return "bg-indigo-500 hover:bg-indigo-400";
      return "bg-emerald-600 hover:bg-emerald-500";
    }
    if (cell.isOffDay) {
      return "bg-slate-800/80 border border-slate-700/50 text-slate-500";
    }
    if (cell.isFuture) {
      return "bg-neutral-900/60 border border-neutral-800/40";
    }
    return "bg-neutral-800/60 border border-neutral-700/30 hover:border-neutral-500";
  };

  const getCellTitle = (cell: DayCell): string => {
    if (!cell.dateStr) return "";
    const rec = cell.record;
    if (rec) {
      return `${cell.dateStr}: ${rec.status.toUpperCase()} (In: ${rec.clockInTime || "N/A"}, Out: ${rec.clockOutTime || "Active"}, Work: ${rec.netWorkHours || rec.totalHours || 0}h)`;
    }
    if (cell.isOffDay) return `${cell.dateStr}: Scheduled Off-Day`;
    if (cell.isFuture) return `${cell.dateStr}: Upcoming`;
    return `${cell.dateStr}: No Record Logged`;
  };

  // Inspect target (either today or chosen date)
  const inspectTargetDate = viewMode === "today" ? todayStr : specificDateChoice;
  const inspectedRecord = recordMap.get(inspectTargetDate);
  const inspectedDayName = new Date(inspectTargetDate + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long" }
  );
  const isInspectedOffDay = assignedOffDays.includes(inspectedDayName);

  const handleOpenDatePicker = () => {
    setViewMode("daily");
    setTimeout(() => {
      if (dateInputRef.current) {
        try {
          if (typeof (dateInputRef.current as any).showPicker === "function") {
            (dateInputRef.current as any).showPicker();
          } else {
            dateInputRef.current.focus();
          }
        } catch {
          dateInputRef.current.focus();
        }
      }
    }, 50);
  };

  return (
    <div className={`rounded-3xl border border-white/10 bg-neutral-950/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-5 ${className}`}>
      {/* ── TOP CONTROLS & TIMEFRAME FILTERS ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-sm">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              Attendance Matrix & Health
            </h3>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
              {viewMode === "today"
                ? `Today: ${todayStr}`
                : viewMode === "daily"
                ? `Inspecting: ${specificDateChoice}`
                : viewMode === "monthly"
                ? `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`
                : `${selectedYear} Full Year`}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time punch records, shift health, monthly calendar grid, and annual attendance matrix
          </p>
        </div>

        {/* View Mode Filter Tabs with 'Today' as default */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-black/60 border border-white/10 self-start lg:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => {
              setViewMode("today");
              setSpecificDateChoice(todayStr);
              if (onSelectDate) onSelectDate(todayStr, recordMap.get(todayStr));
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "today"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
                : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">today</span>
            <span>Today</span>
          </button>

          <button
            type="button"
            onClick={handleOpenDatePicker}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "daily"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
                : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
            <span>Specific Date</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("monthly")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "monthly"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
                : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">calendar_view_month</span>
            <span>Monthly</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("yearly")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              viewMode === "yearly"
                ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/25"
                : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">grid_view</span>
            <span>Yearly</span>
          </button>
        </div>
      </div>

      {/* Hidden/Direct Date Picker Input */}
      <input
        ref={dateInputRef}
        type="date"
        value={specificDateChoice}
        onChange={(e) => {
          if (e.target.value) {
            setSpecificDateChoice(e.target.value);
            setViewMode("daily");
            if (onSelectDate) onSelectDate(e.target.value, recordMap.get(e.target.value));
          }
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* ── STATS CAPSULES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-neutral-400">Present:</span>
            <span className="text-white font-semibold">{stats.presentCount} days</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-neutral-400">Late:</span>
            <span className="text-white font-semibold">{stats.lateCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-neutral-400">Leaves:</span>
            <span className="text-white font-semibold">{stats.leaveCount}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400 text-[14px]">schedule</span>
            <span className="text-neutral-400">Work Hours:</span>
            <span className="text-cyan-300 font-semibold">{stats.totalWorkHours}h</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            {stats.onTimeRate}% On-Time Record
          </div>

          {/* Year selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="h-8 bg-black/60 border border-white/10 rounded-xl px-2.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
          </select>
        </div>
      </div>

      {/* ── VIEW A: TODAY / SPECIFIC DATE INSPECTOR CARD (DEFAULT) ── */}
      {(viewMode === "today" || viewMode === "daily") && (
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-neutral-900/90 to-purple-950/20 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center text-lg font-bold">
                📅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    {viewMode === "today" ? "Today's Verified Punch Record" : "Selected Date Inspection"}
                  </span>
                  {viewMode === "today" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/30">
                      LIVE
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-white mt-0.5">
                  {new Date(inspectTargetDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </h4>
              </div>
            </div>

            {/* Quick Picker Shortcut */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenDatePicker}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-cyan-300 font-medium transition cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                <span>Change Date</span>
              </button>
            </div>
          </div>

          {/* Dossier Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              {inspectedRecord ? (() => {
                const hours = inspectedRecord.netWorkHours !== undefined ? inspectedRecord.netWorkHours : (inspectedRecord.totalHours || 0);
                const effStatus: string = (inspectedRecord.clockOutTime && hours < 5 && (inspectedRecord.status === "present" || inspectedRecord.status === "on_break"))
                  ? "half_day"
                  : inspectedRecord.status;

                const statusColor =
                  effStatus === "half_day"
                    ? "text-yellow-400"
                    : effStatus === "late"
                    ? "text-orange-400"
                    : effStatus === "present"
                    ? "text-emerald-400"
                    : effStatus === "on_break"
                    ? "text-amber-400"
                    : effStatus === "remote"
                    ? "text-cyan-400"
                    : "text-purple-400";

                const dotColor =
                  effStatus === "half_day"
                    ? "bg-yellow-400"
                    : effStatus === "late"
                    ? "bg-orange-400"
                    : effStatus === "present"
                    ? "bg-emerald-400"
                    : "bg-cyan-400";

                return (
                  <span className={`inline-flex items-center gap-1.5 font-bold capitalize ${statusColor}`}>
                    <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
                    {effStatus.replace("_", " ")}
                  </span>
                );
              })() : isInspectedOffDay ? (
                <span className="text-slate-400 font-semibold">Scheduled Off-Day</span>
              ) : inspectTargetDate > todayStr ? (
                <span className="text-neutral-500 font-semibold">Upcoming Date</span>
              ) : (
                <span className="text-rose-400 font-semibold">No Punch Recorded</span>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Clock In</span>
              <span className="text-white font-bold block text-sm">
                {inspectedRecord?.clockInTime || "—"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Clock Out</span>
              <span className="text-white font-bold block text-sm">
                {inspectedRecord?.clockOutTime || (inspectedRecord ? "Active On Shift" : "—")}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Net Work Hours</span>
              <span className="text-cyan-300 font-bold block text-sm">
                {inspectedRecord ? `${inspectedRecord.netWorkHours || inspectedRecord.totalHours || 0} hrs` : "—"}
              </span>
            </div>
          </div>

          {/* Break and Extra Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <span className="text-neutral-400">Total Breaks Taken:</span>
              <span className="text-amber-300 font-bold">
                {inspectedRecord?.totalBreakMinutes ? `${inspectedRecord.totalBreakMinutes} mins` : "0 mins"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <span className="text-neutral-400">Regularization Status:</span>
              <span className="text-white font-bold">
                {inspectedRecord?.isRegularized ? (
                  <span className="text-indigo-300">Approved by Admin</span>
                ) : (
                  "Standard Biometric Punch"
                )}
              </span>
            </div>
          </div>

          {/* Remarks / Notes */}
          {inspectedRecord?.note && (
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-300 font-mono">
              <span className="text-gray-500 font-bold block text-[10px] uppercase">Notes / Remarks:</span>
              <p className="mt-0.5 text-white italic">&ldquo;{inspectedRecord.note}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* ── VIEW B: MONTHLY CALENDAR GRID ── */}
      {viewMode === "monthly" && (
        <div className="space-y-4">
          {/* Month selector pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 themed-scroll">
            {MONTH_NAMES.map((m, idx) => (
              <button
                key={m}
                type="button"
                onClick={() => setSelectedMonthIndex(idx)}
                className={`px-3 py-1 rounded-xl text-xs font-mono whitespace-nowrap transition cursor-pointer ${
                  selectedMonthIndex === idx
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* 7-column calendar grid */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-[11px] font-mono font-bold text-gray-400">
              {DAY_LABELS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {monthlyDays.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-white/[0.01]" />;
                }

                const dayNum = cell.dateStr.split("-")[2];
                const rec = cell.record;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    title={getCellTitle(cell)}
                    onClick={() => {
                      setSpecificDateChoice(cell.dateStr);
                      setViewMode("daily");
                      if (onSelectDate) onSelectDate(cell.dateStr, rec);
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredCell({
                        cell,
                        centerX: rect.left + rect.width / 2,
                        top: rect.top,
                        bottom: rect.bottom,
                      });
                    }}
                    onMouseLeave={() => setHoveredCell(null)}
                    className={`h-16 rounded-xl p-2 text-left flex flex-col justify-between transition-all border cursor-pointer hover:scale-[1.02] ${
                      rec
                        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400"
                        : cell.isOffDay
                        ? "bg-slate-900/40 border-slate-700/40 text-slate-400"
                        : "bg-white/[0.02] border-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-white">{dayNum}</span>
                      {rec && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </div>

                    <div className="text-[10px] font-mono truncate">
                      {rec ? (
                        <span className="text-emerald-300 font-semibold">
                          {rec.clockInTime?.replace(":00", "") || "Logged"}
                        </span>
                      ) : cell.isOffDay ? (
                        <span className="text-slate-500">Off</span>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW C: 52-WEEK CONTRIBUTION MATRIX (SHOWN IN YEARLY OR AS PERSISTENT EXPLORER) ── */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>52-Week Attendance Heatmap Matrix ({selectedYear})</span>
          </span>
          <span className="text-[10px] text-gray-500 font-mono">
            Hover over any cell to see status • Click cell to inspect date
          </span>
        </div>

        <div className="relative overflow-x-auto pb-2 themed-scroll">
          <div className="min-w-[780px]">
            {/* Months Header Labels */}
            <div className="flex pl-8 pr-2 justify-between text-[10px] text-gray-400 font-mono mb-1.5 select-none">
              {MONTH_SHORT.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day rows (Sun, Tue, Thu, Sat labels on left) */}
              <div className="flex flex-col justify-between py-1 text-[10px] text-neutral-500 w-7 select-none font-medium">
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>

              {/* 52-Week Matrix columns */}
              <div className="flex gap-1 flex-1">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1">
                    {week.map((cell, dIndex) => {
                      const colorClass = getCellColor(cell);
                      const isTargetSelected = cell.dateStr === inspectTargetDate;
                      return (
                        <button
                          key={`${wIndex}-${dIndex}`}
                          type="button"
                          aria-label={cell.dateStr || "Empty cell"}
                          title={getCellTitle(cell)}
                          disabled={!cell.dateStr}
                          onClick={() => {
                            if (cell.dateStr) {
                              setSpecificDateChoice(cell.dateStr);
                              setViewMode("daily");
                              if (onSelectDate) onSelectDate(cell.dateStr, cell.record);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (cell.dateStr) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                cell,
                                centerX: rect.left + rect.width / 2,
                                top: rect.top,
                                bottom: rect.bottom,
                              });
                            }
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={`w-3.5 h-3.5 rounded-[3px] transition-all duration-150 ${colorClass} ${
                            isTargetSelected ? "ring-2 ring-cyan-400 ring-offset-1 ring-offset-black scale-110" : ""
                          } ${
                            cell.dateStr ? "cursor-pointer" : "cursor-default opacity-0"
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── HIGH-PRECISION SMART HOVER POPOVER / TOOLTIP ── */}
      {hoveredCell && hoveredCell.cell.dateStr && (
        (() => {
          const isNearTop = hoveredCell.top < 180;
          const popoverTop = isNearTop ? hoveredCell.bottom + 8 : hoveredCell.top - 8;
          const safeWindowWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
          const clampedX = Math.max(140, Math.min(safeWindowWidth - 140, hoveredCell.centerX));

          return (
            <div
              className="fixed z-[99999] pointer-events-none bg-[#0a0f1d] border border-cyan-400/40 rounded-2xl p-3 text-xs shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(56,242,255,0.25)] backdrop-blur-2xl max-w-xs transition-opacity duration-150"
              style={{
                left: `${clampedX}px`,
                top: `${popoverTop}px`,
                transform: isNearTop ? "translateX(-50%)" : "translate(-50%, -100%)",
              }}
            >
              {/* Header */}
              <div className="font-semibold text-white flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 mb-1.5">
                <span className="font-mono text-cyan-300 text-[11px] font-bold">
                  {new Date(hoveredCell.cell.dateStr + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
                {hoveredCell.cell.record ? (
                  <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {hoveredCell.cell.record.status.replace("_", " ")}
                  </span>
                ) : hoveredCell.cell.isOffDay ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-700 text-slate-300 font-mono font-medium">
                    Off-Day
                  </span>
                ) : hoveredCell.cell.isFuture ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-neutral-800 text-neutral-400 font-mono">
                    Upcoming
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono">
                    No Record
                  </span>
                )}
              </div>

              {/* Record Content */}
              {hoveredCell.cell.record ? (
                <div className="space-y-1 text-neutral-300 text-[11px] font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-400">Clock In:</span>
                    <span className="text-white font-medium">{hoveredCell.cell.record.clockInTime}</span>
                  </div>
                  {hoveredCell.cell.record.clockOutTime && (
                    <div className="flex justify-between gap-4">
                      <span className="text-neutral-400">Clock Out:</span>
                      <span className="text-white font-medium">{hoveredCell.cell.record.clockOutTime}</span>
                    </div>
                  )}
                  {hoveredCell.cell.record.totalBreakMinutes ? (
                    <div className="flex justify-between gap-4">
                      <span className="text-neutral-400">Breaks:</span>
                      <span className="text-amber-300 font-medium">{hoveredCell.cell.record.totalBreakMinutes} mins</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span className="text-neutral-400">Net Active Work:</span>
                    <span className="text-emerald-300 font-bold">
                      {hoveredCell.cell.record.netWorkHours || hoveredCell.cell.record.totalHours || 0} hrs
                    </span>
                  </div>
                  {hoveredCell.cell.record.note && (
                    <p className="mt-1 text-neutral-300 italic text-[10px] border-t border-white/10 pt-1">
                      &ldquo;{hoveredCell.cell.record.note}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-[11px] font-mono text-gray-400">
                  {hoveredCell.cell.isOffDay
                    ? "Scheduled weekly rest day for team member."
                    : hoveredCell.cell.isFuture
                    ? "Upcoming shift date on work roster."
                    : "No check-in punch was logged for this date."}
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-[11px] text-neutral-400 font-mono">
        <span className="text-neutral-500">Scheduled Shifts: {assignedOffDays.join(", ")} Off</span>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
            <span>Present</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-orange-500" />
            <span>Late</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-yellow-400" />
            <span>Half Day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-cyan-500" />
            <span>Remote</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-purple-500" />
            <span>Leave</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-slate-800 border border-slate-700" />
            <span>Off-Day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
