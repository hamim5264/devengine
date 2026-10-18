import React, { useState, useMemo, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

interface CustomDatePickerFieldProps {
  label?: string;
  value: string; // "YYYY-MM-DD"
  onChange: (val: string) => void;
  minDate?: string; // "YYYY-MM-DD"
  maxDate?: string; // "YYYY-MM-DD"
  placeholder?: string;
  required?: boolean;
  className?: string;
  align?: "left" | "right" | "auto";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CustomDatePickerField({
  label,
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Select date...",
  required = false,
  className = "",
  align = "auto",
}: CustomDatePickerFieldProps) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value or fallback to today
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [navYear, setNavYear] = useState<number>(() => {
    if (value) {
      const parts = value.split("-").map(Number);
      if (parts[0]) return parts[0];
    }
    return new Date().getFullYear();
  });

  const [navMonth, setNavMonth] = useState<number>(() => {
    if (value) {
      const parts = value.split("-").map(Number);
      if (parts[1]) return parts[1] - 1;
    }
    return new Date().getMonth();
  });

  // Sync nav month/year when value changes or when opened
  useEffect(() => {
    if (value) {
      const parts = value.split("-").map(Number);
      if (parts[0] && parts[1]) {
        setNavYear(parts[0]);
        setNavMonth(parts[1] - 1);
      }
    }
  }, [value, isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear((y) => y - 1);
    } else {
      setNavMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear((y) => y + 1);
    } else {
      setNavMonth((m) => m + 1);
    }
  };

  // Generate calendar days for navMonth & navYear
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(navYear, navMonth, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    const prevMonthDays = new Date(navYear, navMonth, 0).getDate();

    const days: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      isDisabled: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevM = navMonth === 0 ? 11 : navMonth - 1;
      const prevY = navMonth === 0 ? navYear - 1 : navYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: !!isDisabled,
      });
    }

    // Current month days
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${navYear}-${String(navMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
      days.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === value,
        isDisabled: !!isDisabled,
      });
    }

    // Next month padding to reach full 7-col row
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextM = navMonth === 11 ? 0 : navMonth + 1;
        const nextY = navMonth === 11 ? navYear + 1 : navYear;
        const dateStr = `${nextY}-${String(nextM + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate);
        days.push({
          day: d,
          dateStr,
          isCurrentMonth: false,
          isToday: dateStr === todayStr,
          isSelected: dateStr === value,
          isDisabled: !!isDisabled,
        });
      }
    }

    return days;
  }, [navYear, navMonth, todayStr, value, minDate, maxDate]);

  const formattedDisplay = useMemo(() => {
    if (!value) return "";
    try {
      const [y, m, d] = value.split("-").map(Number);
      if (!y || !m || !d) return value;
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }, [value]);

  const canSelectToday = useMemo(() => {
    if (minDate && todayStr < minDate) return false;
    if (maxDate && todayStr > maxDate) return false;
    return true;
  }, [minDate, maxDate, todayStr]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Input Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all cursor-pointer border outline-none ${
          isOpen
            ? "border-[#2cecf7] ring-2 ring-[#2cecf7]/20 shadow-[0_0_12px_rgba(44,236,247,0.18)]"
            : isLight
            ? "bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800"
            : "bg-black/40 border-white/10 hover:border-white/20 text-neutral-200"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className={`flex-shrink-0 ${value ? "text-[#2cecf7]" : isLight ? "text-slate-400" : "text-neutral-500"}`}
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={`truncate font-mono ${value ? "font-bold text-xs" : isLight ? "text-slate-400" : "text-neutral-500"}`}>
            {formattedDisplay || placeholder}
          </span>
        </div>

        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={`flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#2cecf7]" : "text-neutral-400"}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Floating Glassmorphic Custom Calendar Popover */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "left"
              ? "left-0 right-auto"
              : align === "right"
              ? "right-0 left-auto"
              : "left-0 sm:left-auto sm:right-0"
          } top-full mt-1.5 z-50 w-[285px] sm:w-[315px] max-w-[calc(100vw-32px)] p-3.5 rounded-3xl border shadow-2xl backdrop-blur-2xl transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? "bg-white/95 border-cyan-300 text-slate-900 shadow-[0_20px_50px_rgba(44,236,247,0.25),0_10px_25px_rgba(0,0,0,0.08)]"
              : "bg-[#090e1c]/95 border-[#2cecf7]/30 text-white shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_35px_rgba(44,236,247,0.25)]"
          }`}
        >
          {/* Header with Navigation */}
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/10">
            <button
              type="button"
              onClick={handlePrevMonth}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/5 hover:bg-white/15 text-white"
              }`}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <span className="text-xs font-mono font-bold tracking-wider" style={{ color: isLight ? "#0e7490" : "#2cecf7" }}>
              {MONTH_NAMES[navMonth]} {navYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className={`w-7 h-7 rounded-xl flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-white/5 hover:bg-white/15 text-white"
              }`}
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-mono font-bold text-neutral-400 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((dObj, idx) => {
              return (
                <button
                  key={`${dObj.dateStr}-${idx}`}
                  type="button"
                  disabled={dObj.isDisabled}
                  onClick={() => {
                    if (!dObj.isDisabled) {
                      onChange(dObj.dateStr);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-7 sm:h-8 rounded-xl flex items-center justify-center relative transition-all text-xs font-mono ${
                    dObj.isDisabled
                      ? "opacity-25 cursor-not-allowed text-neutral-500"
                      : dObj.isSelected
                      ? "bg-[#2cecf7] text-[#02040a] font-black shadow-[0_0_12px_rgba(44,236,247,0.6)] scale-105"
                      : dObj.isToday
                      ? isLight
                        ? "border border-[#2cecf7] text-[#0891b2] font-bold bg-cyan-50"
                        : "border border-[#2cecf7] text-[#2cecf7] font-bold bg-[#2cecf7]/10"
                      : !dObj.isCurrentMonth
                      ? isLight ? "text-slate-300" : "text-neutral-600"
                      : isLight
                      ? "hover:bg-slate-100 text-slate-800 cursor-pointer"
                      : "hover:bg-white/10 text-neutral-200 cursor-pointer"
                  }`}
                >
                  <span>{dObj.day}</span>
                </button>
              );
            })}
          </div>

          {/* Footer with Select Today and Close */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10 text-[11px] font-mono">
            {canSelectToday ? (
              <button
                type="button"
                onClick={() => {
                  onChange(todayStr);
                  setIsOpen(false);
                }}
                className="font-bold cursor-pointer transition-colors"
                style={{ color: isLight ? "#0891b2" : "#2cecf7" }}
              >
                Today
              </button>
            ) : <span />}

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={`hover:underline cursor-pointer ${isLight ? "text-slate-500" : "text-neutral-400"}`}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
