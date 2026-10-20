import FloatingControlPanel from "@/components/admin/FloatingControlPanel";
import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  iconColor?: string;
  badge?: string;
  disabled?: boolean;
}

interface CustomSelectFieldProps<T extends string = string> {
  label?: string;
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  floating?: boolean;
  id?: string;
  ariaLabel?: string;
}

export default function CustomSelectField<T extends string = string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  required = false,
  className = "",
  disabled = false,
  floating = false,
  id,
  ariaLabel,
}: CustomSelectFieldProps<T>) {
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicked outside
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className={`text-xs font-semibold block mb-1.5 ${isLight ? "text-slate-700" : "text-neutral-300"}`}>
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel || label || placeholder}
        onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); setIsOpen(true); requestAnimationFrame(() => { const choices = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'); const index = event.key === "End" || event.key === "ArrowUp" ? (choices?.length || 1) - 1 : 0; choices?.[index]?.focus(); }); } }}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between gap-2.5 transition-all cursor-pointer border outline-none ${
          isOpen
            ? "border-[#2cecf7] ring-2 ring-[#2cecf7]/20 shadow-[0_0_14px_rgba(44,236,247,0.22)]"
            : isLight
            ? "bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-100/60"
            : "bg-black/40 border-white/10 hover:border-white/20 text-neutral-200 hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {selectedOption?.icon && (
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform ${
                selectedOption.iconBg || (isLight ? "bg-cyan-100" : "bg-[#2cecf7]/15")
              } ${selectedOption.iconColor || (isLight ? "text-cyan-800" : "text-[#2cecf7]")}`}
            >
              {selectedOption.icon}
            </span>
          )}
          <div className="flex flex-col text-left truncate">
            <span className={`truncate font-semibold text-xs ${
              selectedOption
                ? isLight ? "text-slate-900" : "text-white"
                : isLight ? "text-slate-400" : "text-neutral-500"
            }`}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
        </div>

        <svg
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className={`flex-shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#2cecf7]" : isLight ? "text-slate-400" : "text-neutral-400"
          }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Floating Glassmorphic Dropdown Menu */}
      {isOpen && (
        <FloatingControlPanel
          anchor={containerRef}
          floating={floating}
          role="listbox"
          aria-label={ariaLabel || label || placeholder}
          onKeyDown={(event) => { if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) { event.preventDefault(); const choices = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)') || []); const index = choices.indexOf(document.activeElement as HTMLButtonElement); const next = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length; choices[next]?.focus(); } if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setIsOpen(false); containerRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')?.focus(); } }}
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl max-h-64 overflow-y-auto space-y-1 transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isLight
              ? "bg-white/95 border-cyan-200 text-slate-900 shadow-[0_18px_45px_rgba(44,236,247,0.18),0_8px_20px_rgba(0,0,0,0.06)]"
              : "bg-[#0a0f1d]/95 border-[#2cecf7]/30 text-white shadow-[0_20px_60px_rgba(0,0,0,0.85),0_0_30px_rgba(44,236,247,0.2)]"
          }`}
          style={{
            scrollbarWidth: "thin",
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                disabled={option.disabled}
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  containerRef.current?.querySelector<HTMLButtonElement>('[aria-haspopup="listbox"]')?.focus();
                }}
                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer group ${
                  isSelected
                    ? isLight
                      ? "bg-cyan-50/90 border border-cyan-200/80 text-cyan-950 font-bold shadow-sm"
                      : "bg-[#2cecf7]/12 border border-[#2cecf7]/35 text-white font-bold shadow-[0_0_12px_rgba(44,236,247,0.18)]"
                    : isLight
                    ? "hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 border border-transparent"
                    : "hover:bg-white/[0.07] text-neutral-300 hover:text-white border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {option.icon && (
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                        option.iconBg || (isLight ? "bg-slate-100" : "bg-white/5")
                      } ${option.iconColor || (isLight ? "text-slate-600" : "text-neutral-300")}`}
                    >
                      {option.icon}
                    </span>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs truncate block font-semibold leading-tight">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className={`text-[10px] block mt-0.5 truncate font-normal ${
                        isSelected
                          ? isLight ? "text-cyan-800" : "text-[#2cecf7]"
                          : isLight ? "text-slate-500" : "text-neutral-400"
                      }`}>
                        {option.description}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {option.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider ${
                      isLight
                        ? "bg-slate-100 text-slate-600 border border-slate-200"
                        : "bg-white/10 text-neutral-300 border border-white/5"
                    }`}>
                      {option.badge}
                    </span>
                  )}
                  {isSelected && (
                    <svg
                      width={14}
                      height={14}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#2cecf7"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#2cecf7] drop-shadow-[0_0_6px_rgba(44,236,247,0.6)]"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </FloatingControlPanel>
      )}
    </div>
  );
}
