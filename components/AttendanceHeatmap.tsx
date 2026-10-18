import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
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
  const { theme } = useTheme();
  const isLight = theme === "light";

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

  // Custom Glass Date Picker State (replaces ugly browser popup)
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(() => new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(() => new Date().getMonth());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Custom Glass Year Dropdown State (replaces ugly native select)
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  // Close custom popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowCustomDatePicker(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target as Node)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

      if (effStatus === "present") return "bg-emerald-500 hover:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.35)]";
      if (effStatus === "late") return "bg-orange-500 hover:bg-orange-400 text-white shadow-[0_0_8px_rgba(249,115,22,0.35)]";
      if (effStatus === "half_day") return "bg-yellow-400 hover:bg-yellow-300 text-slate-950 shadow-[0_0_8px_rgba(234,179,8,0.35)]";
      if (effStatus === "remote") return "bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.35)]";
      if (effStatus === "on_leave") return "bg-purple-500 hover:bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.35)]";
      if (effStatus === "absent") return "bg-rose-500 hover:bg-rose-400";
      if (cell.record.isRegularized) return "bg-indigo-500 hover:bg-indigo-400";
      return "bg-emerald-600 hover:bg-emerald-500";
    }
    if (cell.isOffDay) {
      return isLight
        ? "bg-slate-200/90 border border-slate-300/80 text-slate-500"
        : "bg-slate-800/80 border border-slate-700/50 text-slate-500";
    }
    if (cell.isFuture) {
      return isLight
        ? "bg-slate-50/80 border border-slate-200/50"
        : "bg-neutral-900/60 border border-neutral-800/40";
    }
    return isLight
      ? "bg-slate-100/90 border border-slate-200/80 hover:border-slate-300"
      : "bg-neutral-800/60 border border-neutral-700/30 hover:border-neutral-500";
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

  // Custom Glass Date Picker handlers
  const handleOpenDatePicker = () => {
    const parts = (specificDateChoice || todayStr).split("-").map(Number);
    if (parts[0] && parts[1]) {
      setPickerYear(parts[0]);
      setPickerMonth(parts[1] - 1);
    }
    setShowCustomDatePicker((prev) => !prev);
  };

  const handlePrevPickerMonth = () => {
    if (pickerMonth === 0) {
      setPickerMonth(11);
      setPickerYear((y) => y - 1);
    } else {
      setPickerMonth((m) => m - 1);
    }
  };

  const handleNextPickerMonth = () => {
    if (pickerMonth === 11) {
      setPickerMonth(0);
      setPickerYear((y) => y + 1);
    } else {
      setPickerMonth((m) => m + 1);
    }
  };

  // Computed days for the custom glass Date Picker calendar
  const pickerDays = useMemo(() => {
    const firstDayIndex = new Date(pickerYear, pickerMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(pickerYear, pickerMonth + 1, 0).getDate();
    const prevMonthDays = new Date(pickerYear, pickerMonth, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isOffDay: boolean;
      record?: AttendanceRecord;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = pickerMonth === 0 ? 11 : pickerMonth - 1;
      const prevY = pickerMonth === 0 ? pickerYear - 1 : pickerYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === specificDateChoice,
        isOffDay: assignedOffDays.includes(new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })),
        record: recordMap.get(dateStr),
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${pickerYear}-${String(pickerMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === specificDateChoice,
        isOffDay: assignedOffDays.includes(new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })),
        record: recordMap.get(dateStr),
      });
    }

    // Next month padding to reach 7-day row completion
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextM = pickerMonth === 11 ? 0 : pickerMonth + 1;
        const nextY = pickerMonth === 11 ? pickerYear + 1 : pickerYear;
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        days.push({
          day: d,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === specificDateChoice,
          isOffDay: assignedOffDays.includes(new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" })),
          record: recordMap.get(dateStr),
        });
      }
    }

    return days;
  }, [pickerYear, pickerMonth, todayStr, specificDateChoice, assignedOffDays, recordMap]);

  return (
    <div className={`rounded-3xl border p-5 sm:p-7 backdrop-blur-xl shadow-xl space-y-6 transition-all ${
      isLight ? "bg-white border-slate-200/90 shadow-sm" : "border-white/10 bg-neutral-950/90 shadow-2xl"
    } ${className}`}>
      {/* ── TOP CONTROLS & TIMEFRAME FILTERS ── */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b relative ${
        isLight ? "border-slate-100" : "border-white/10"
      }`}>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border border-cyan-500/20 text-sm">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </span>
            <h3 className={`text-base sm:text-lg font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Attendance Matrix & Health
            </h3>
            <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 ${
              isLight ? "bg-cyan-50 text-cyan-800 border border-cyan-200" : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-pulse" />
              {viewMode === "today"
                ? `Today: ${todayStr}`
                : viewMode === "daily"
                ? `Inspecting: ${specificDateChoice}`
                : viewMode === "monthly"
                ? `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`
                : `${selectedYear} Full Year`}
            </span>
          </div>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-500" : "text-neutral-400"}`}>
            Real-time punch records, shift health, monthly calendar grid, and annual attendance matrix
          </p>
        </div>

        {/* View Mode Filter Tabs with 'Today' as default */}
        <div className="relative">
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl border self-start lg:self-auto flex-wrap ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-black/60 border-white/10"
          }`}>
            <button
              type="button"
              onClick={() => {
                setViewMode("today");
                setSpecificDateChoice(todayStr);
                setShowCustomDatePicker(false);
                if (onSelectDate) onSelectDate(todayStr, recordMap.get(todayStr));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "today"
                  ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/25"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/80"
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
                viewMode === "daily" || showCustomDatePicker
                  ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/25"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">edit_calendar</span>
              <span>Specific Date</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("monthly");
                setShowCustomDatePicker(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "monthly"
                  ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/25"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">calendar_view_month</span>
              <span>Monthly</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewMode("yearly");
                setShowCustomDatePicker(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "yearly"
                  ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/25"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-white/80"
                  : "text-gray-300 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">grid_view</span>
              <span>Yearly</span>
            </button>
          </div>

          {/* ── CUSTOM GLASS DATE PICKER POPOVER (Replacing Browser Ugly Native Popup) ── */}
          {showCustomDatePicker && (
            <div
              ref={datePickerRef}
              className={`absolute right-0 top-full mt-2 z-50 w-[300px] sm:w-[330px] p-4 rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all duration-200 animate-in fade-in zoom-in-95 ${
                isLight
                  ? "bg-white/95 border-cyan-300 text-slate-900 shadow-[0_20px_50px_rgba(44,236,247,0.25),0_10px_25px_rgba(0,0,0,0.08)]"
                  : "bg-[#090e1c]/95 border-[#2cecf7]/30 text-white shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(44,236,247,0.25)]"
              }`}
            >
              {/* Header with Prev/Next month */}
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/10">
                <button
                  type="button"
                  onClick={handlePrevPickerMonth}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/5 hover:bg-white/15 text-white"
                  }`}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                <span className="text-xs font-mono font-bold tracking-wider" style={{ color: isLight ? "#0e7490" : "#2cecf7" }}>
                  {MONTH_NAMES[pickerMonth]} {pickerYear}
                </span>

                <button
                  type="button"
                  onClick={handleNextPickerMonth}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/5 hover:bg-white/15 text-white"
                  }`}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>

              {/* Weekday Labels (Su, Mo, Tu, We, Th, Fr, Sa) */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-neutral-400 mb-1">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {pickerDays.map((dObj, idx) => {
                  return (
                    <button
                      key={`${dObj.dateStr}-${idx}`}
                      type="button"
                      onClick={() => {
                        setSpecificDateChoice(dObj.dateStr);
                        setViewMode("daily");
                        setShowCustomDatePicker(false);
                        if (onSelectDate) onSelectDate(dObj.dateStr, dObj.record);
                      }}
                      className={`h-8 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer text-xs font-mono ${
                        dObj.isSelected
                          ? "bg-[#2cecf7] text-[#02040a] font-black shadow-[0_0_12px_rgba(44,236,247,0.6)] scale-105"
                          : dObj.isToday
                          ? isLight
                            ? "border border-[#2cecf7] text-[#0891b2] font-bold bg-cyan-50"
                            : "border border-[#2cecf7] text-[#2cecf7] font-bold bg-[#2cecf7]/10"
                          : !dObj.isCurrentMonth
                          ? isLight ? "text-slate-300" : "text-neutral-600"
                          : isLight
                          ? "hover:bg-slate-100 text-slate-800"
                          : "hover:bg-white/10 text-neutral-200"
                      }`}
                    >
                      <span>{dObj.day}</span>
                      <div className="flex items-center gap-0.5 mt-[-2px]">
                        {dObj.record ? (
                          <span className={`w-1 h-1 rounded-full ${
                            dObj.isSelected ? "bg-[#02040a]" : dObj.record.status === "present" ? "bg-emerald-400" : "bg-amber-400"
                          }`} />
                        ) : dObj.isOffDay && dObj.isCurrentMonth ? (
                          <span className={`w-1 h-1 rounded-full ${dObj.isSelected ? "bg-[#02040a]" : "bg-neutral-500"}`} />
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Footer controls: Today button and Cancel button */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-white/10 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setSpecificDateChoice(todayStr);
                    setViewMode("today");
                    setShowCustomDatePicker(false);
                    if (onSelectDate) onSelectDate(todayStr, recordMap.get(todayStr));
                  }}
                  className="font-bold cursor-pointer transition-colors"
                  style={{ color: isLight ? "#0891b2" : "#2cecf7" }}
                >
                  Select Today
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomDatePicker(false)}
                  className={`hover:underline cursor-pointer ${isLight ? "text-slate-500" : "text-neutral-400"}`}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── STATS CAPSULES ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all hover:scale-102 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-white/5 border-white/10"
          }`}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Present:</span>
            <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{stats.presentCount} days</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all hover:scale-102 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-white/5 border-white/10"
          }`}>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Late:</span>
            <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{stats.lateCount}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all hover:scale-102 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-white/5 border-white/10"
          }`}>
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Leaves:</span>
            <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{stats.leaveCount}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all hover:scale-102 ${
            isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-white/5 border-white/10"
          }`}>
            <span className="material-symbols-outlined text-[#2cecf7] text-[14px]">schedule</span>
            <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Work Hours:</span>
            <span className="font-semibold" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>{stats.totalWorkHours}h</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{stats.onTimeRate}% On-Time Record</span>
          </div>

          {/* ── CUSTOM GLASS YEAR DROPDOWN (Replacing Browser Native Select) ── */}
          <div className="relative" ref={yearDropdownRef}>
            <button
              type="button"
              onClick={() => setShowYearDropdown((prev) => !prev)}
              className={`h-8 border rounded-xl px-3 text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                isLight
                  ? "bg-white border-slate-300 text-slate-800 hover:border-cyan-400 shadow-sm"
                  : "bg-black/60 border-white/10 text-white hover:border-[#2cecf7]/50"
              }`}
            >
              <span>{selectedYear}</span>
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className={`transition-transform duration-200 ${showYearDropdown ? "rotate-180" : ""}`}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {showYearDropdown && (
              <div className={`absolute right-0 top-full mt-1.5 z-40 w-28 p-1 rounded-2xl border backdrop-blur-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
                isLight ? "bg-white/95 border-slate-200 text-slate-900 shadow-lg" : "bg-[#0a0f1d]/95 border-white/10 text-white shadow-2xl"
              }`}>
                {[2026, 2025, 2024].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setSelectedYear(y);
                      setShowYearDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition flex items-center justify-between cursor-pointer ${
                      selectedYear === y
                        ? "bg-[#2cecf7]/15 text-[#0891b2] dark:text-[#2cecf7] font-bold"
                        : isLight
                        ? "hover:bg-slate-100 text-slate-700"
                        : "hover:bg-white/5 text-neutral-300"
                    }`}
                  >
                    <span>{y}</span>
                    {selectedYear === y && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] shadow-[0_0_6px_#2cecf7]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── VIEW A: TODAY / SPECIFIC DATE INSPECTOR CARD (DEFAULT) ── */}
      {(viewMode === "today" || viewMode === "daily") && (
        <div className={`rounded-2xl border p-5 sm:p-6 space-y-4 relative overflow-hidden backdrop-blur-xl transition-all ${
          isLight
            ? "border-cyan-200/80 bg-gradient-to-r from-cyan-50/60 via-white to-blue-50/25 text-slate-900 shadow-sm"
            : "border-[#2cecf7]/20 bg-gradient-to-r from-[#081224] via-[#0a0f1d] to-[#07111e] text-white shadow-xl"
        }`}>
          {/* Subtle Ambient Laser Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#2cecf7] to-transparent anim-sweep-laser opacity-60 pointer-events-none" />

          <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
            isLight ? "border-slate-200" : "border-white/10"
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 flex items-center justify-center text-lg font-bold shadow-sm">
                📅
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono uppercase tracking-wider font-bold" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>
                    {viewMode === "today" ? "Today's Verified Punch Record" : "Selected Date Inspection"}
                  </span>
                  {viewMode === "today" && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono text-[10px] border border-emerald-500/30 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  )}
                </div>
                <h4 className={`text-base font-bold mt-0.5 ${isLight ? "text-slate-900" : "text-white"}`}>
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
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                  isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-cyan-400 shadow-xs"
                    : "bg-white/5 hover:bg-white/10 border-white/10 text-cyan-300"
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                <span>Change Date</span>
              </button>
            </div>
          </div>

          {/* Dossier Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className={`p-3.5 rounded-xl border space-y-1 ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/40 border-white/5"
            }`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-gray-400"}`}>Presence Status</span>
              {inspectedRecord ? (() => {
                const hours = inspectedRecord.netWorkHours !== undefined ? inspectedRecord.netWorkHours : (inspectedRecord.totalHours || 0);
                const effStatus: string = (inspectedRecord.clockOutTime && hours < 5 && (inspectedRecord.status === "present" || inspectedRecord.status === "on_break"))
                  ? "half_day"
                  : inspectedRecord.status;

                const statusColor =
                  effStatus === "half_day"
                    ? "text-yellow-500"
                    : effStatus === "late"
                    ? "text-orange-500"
                    : effStatus === "present"
                    ? "text-emerald-500"
                    : effStatus === "on_break"
                    ? "text-amber-500"
                    : effStatus === "remote"
                    ? "text-cyan-500"
                    : "text-purple-500";

                const dotColor =
                  effStatus === "half_day"
                    ? "bg-yellow-400"
                    : effStatus === "late"
                    ? "bg-orange-400"
                    : effStatus === "present"
                    ? "bg-emerald-400"
                    : "bg-cyan-400";

                return (
                  <span className={`inline-flex items-center gap-1.5 font-bold capitalize text-sm ${statusColor}`}>
                    <span className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`} />
                    {effStatus.replace("_", " ")}
                  </span>
                );
              })() : isInspectedOffDay ? (
                <span className="text-slate-400 font-semibold block text-sm">Scheduled Off-Day</span>
              ) : inspectTargetDate > todayStr ? (
                <span className="text-neutral-500 font-semibold block text-sm">Upcoming Date</span>
              ) : (
                <span className="text-rose-400 font-semibold block text-sm">No Punch Recorded</span>
              )}
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/40 border-white/5"}`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-gray-400"}`}>Clock In</span>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {inspectedRecord?.clockInTime || "—"}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/40 border-white/5"}`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-gray-400"}`}>Clock Out</span>
              <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                {inspectedRecord?.clockOutTime || (inspectedRecord ? "Active On Shift" : "—")}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${isLight ? "bg-white border-slate-200 shadow-xs" : "bg-black/40 border-white/5"}`}>
              <span className={`text-[10px] uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-gray-400"}`}>Net Work Hours</span>
              <span className="font-bold block text-sm" style={{ color: isLight ? "#0891b2" : "#2cecf7" }}>
                {inspectedRecord ? `${inspectedRecord.netWorkHours || inspectedRecord.totalHours || 0} hrs` : "—"}
              </span>
            </div>
          </div>

          {/* Break and Extra Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isLight ? "bg-white/80 border-slate-200 shadow-xs" : "bg-white/[0.02] border-white/5"
            }`}>
              <span className={isLight ? "text-slate-600" : "text-neutral-400"}>Total Breaks Taken:</span>
              <span className="text-amber-500 dark:text-amber-300 font-bold">
                {inspectedRecord?.totalBreakMinutes ? `${inspectedRecord.totalBreakMinutes} mins` : "0 mins"}
              </span>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isLight ? "bg-white/80 border-slate-200 shadow-xs" : "bg-white/[0.02] border-white/5"
            }`}>
              <span className={isLight ? "text-slate-600" : "text-neutral-400"}>Regularization Status:</span>
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                {inspectedRecord?.isRegularized ? (
                  <span className="text-indigo-600 dark:text-indigo-300">Approved by Admin</span>
                ) : (
                  "Standard Biometric Punch"
                )}
              </span>
            </div>
          </div>

          {/* Remarks / Notes */}
          {inspectedRecord?.note && (
            <div className={`p-3 rounded-xl border text-xs font-mono ${
              isLight ? "bg-white/80 border-slate-200 text-slate-700" : "bg-white/[0.02] border-white/5 text-gray-300"
            }`}>
              <span className={`font-bold block text-[10px] uppercase ${isLight ? "text-slate-500" : "text-gray-500"}`}>Notes / Remarks:</span>
              <p className={`mt-0.5 italic ${isLight ? "text-slate-900" : "text-white"}`}>&ldquo;{inspectedRecord.note}&rdquo;</p>
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
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-bold flex items-center gap-2 ${isLight ? "text-slate-800" : "text-gray-200"}`}>
            <span className="w-2 h-2 rounded-full bg-[#2cecf7] shadow-[0_0_8px_#2cecf7] animate-pulse" />
            <span>52-Week Attendance Heatmap Matrix ({selectedYear})</span>
          </span>
          <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-neutral-500"}`}>
            Hover cell to inspect telemetry • Click to open record
          </span>
        </div>

        <div className="relative overflow-x-auto pb-2 themed-scroll">
          <div className="min-w-[820px] w-full">
            {/* Months Header Labels */}
            <div className={`flex pl-8 pr-2 justify-between text-[10px] font-mono mb-2 select-none font-semibold ${
              isLight ? "text-slate-500" : "text-gray-400"
            }`}>
              {MONTH_SHORT.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div className="flex gap-2">
              {/* Day rows (Sun, Tue, Thu, Sat labels on left) */}
              <div className={`flex flex-col justify-between py-1 text-[10px] w-7 select-none font-mono font-medium ${
                isLight ? "text-slate-400" : "text-neutral-500"
              }`}>
                <span>Sun</span>
                <span>Tue</span>
                <span>Thu</span>
                <span>Sat</span>
              </div>

              {/* 52-Week Matrix columns */}
              <div className="flex gap-1 sm:gap-1.5 flex-1 justify-between">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-1 sm:gap-1.5 flex-1 items-center">
                    {week.map((cell, dIndex) => {
                      const colorClass = getCellColor(cell);
                      const isToday = cell.dateStr === todayStr;
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
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] transition-all duration-150 ${colorClass} ${
                            isToday ? "ring-2 ring-[#2cecf7] animate-pulse shadow-[0_0_12px_#2cecf7] z-10 scale-110" : ""
                          } ${
                            isTargetSelected && !isToday ? "ring-2 ring-cyan-400 scale-110 z-10" : ""
                          } ${
                            cell.dateStr ? "cursor-pointer hover:scale-125" : "cursor-default opacity-0"
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
              className={`fixed z-[99999] pointer-events-none rounded-2xl p-3 text-xs backdrop-blur-2xl max-w-xs transition-opacity duration-150 border ${
                isLight
                  ? "bg-white/95 border-cyan-400/40 text-slate-900 shadow-[0_16px_36px_rgba(44,236,247,0.22),0_4px_12px_rgba(0,0,0,0.06)]"
                  : "bg-[#0a0f1d] border-cyan-400/40 text-white shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(56,242,255,0.25)]"
              }`}
              style={{
                left: `${clampedX}px`,
                top: `${popoverTop}px`,
                transform: isNearTop ? "translateX(-50%)" : "translate(-50%, -100%)",
              }}
            >
              {/* Header */}
              <div className="font-semibold flex items-center justify-between gap-3 border-b border-white/10 pb-1.5 mb-1.5">
                <span className="font-mono text-cyan-500 dark:text-cyan-300 text-[11px] font-bold">
                  {new Date(hoveredCell.cell.dateStr + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "short", month: "short", day: "numeric", year: "numeric" }
                  )}
                </span>
                {hoveredCell.cell.record ? (
                  <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-mono font-bold">
                    {hoveredCell.cell.record.status.replace("_", " ")}
                  </span>
                ) : hoveredCell.cell.isOffDay ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-500/20 text-slate-500 font-mono font-bold">
                    Off-Day
                  </span>
                ) : hoveredCell.cell.isFuture ? (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-500 font-mono font-bold">
                    Upcoming
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/15 text-rose-500 font-mono font-bold">
                    No Record
                  </span>
                )}
              </div>

              {/* Record Content */}
              {hoveredCell.cell.record ? (
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between gap-4">
                    <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Clock In:</span>
                    <span className={`font-medium ${isLight ? "text-slate-900" : "text-white"}`}>{hoveredCell.cell.record.clockInTime}</span>
                  </div>
                  {hoveredCell.cell.record.clockOutTime && (
                    <div className="flex justify-between gap-4">
                      <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Clock Out:</span>
                      <span className={`font-medium ${isLight ? "text-slate-900" : "text-white"}`}>{hoveredCell.cell.record.clockOutTime}</span>
                    </div>
                  )}
                  {hoveredCell.cell.record.totalBreakMinutes ? (
                    <div className="flex justify-between gap-4">
                      <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Breaks:</span>
                      <span className="text-amber-500 font-medium">{hoveredCell.cell.record.totalBreakMinutes} mins</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-4">
                    <span className={isLight ? "text-slate-500" : "text-neutral-400"}>Net Active Work:</span>
                    <span className="text-emerald-500 font-bold">
                      {hoveredCell.cell.record.netWorkHours || hoveredCell.cell.record.totalHours || 0} hrs
                    </span>
                  </div>
                  {hoveredCell.cell.record.note && (
                    <p className="mt-1 text-neutral-400 italic text-[10px] border-t border-white/10 pt-1">
                      &ldquo;{hoveredCell.cell.record.note}&rdquo;
                    </p>
                  )}
                </div>
              ) : (
                <div className={`text-[11px] font-mono ${isLight ? "text-slate-500" : "text-gray-400"}`}>
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
      <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-[11px] font-mono ${
        isLight ? "border-slate-200 text-slate-500" : "border-white/10 text-neutral-400"
      }`}>
        <span className={isLight ? "text-slate-500" : "text-neutral-500"}>Scheduled Shifts: {assignedOffDays.join(", ")} Off</span>
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
            <span className={`w-2.5 h-2.5 rounded-[2px] ${
              isLight ? "bg-slate-200 border border-slate-300" : "bg-slate-800 border border-slate-700"
            }`} />
            <span>Off-Day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
