import { CommunicationHeader } from "@/components/communication/CommunicationEntry";
import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { subscribeStudioAccess } from "@/lib/services/staffAuth";
import { STUDIO_MODULES, hasStudioModule } from "@/lib/staffModules";
import type { StaffMember } from "@/types/staff";
import { STAFF_TYPE_LABELS } from "@/types/staff";
import HelixLoader from "@/components/HelixLoader";
import HeaderControls from "@/components/HeaderControls";
import { useTheme } from "@/context/ThemeContext";
import LandingFooter from "@/components/landing/LandingFooter";
import styles from "@/components/staff/StaffLayout.module.css";

// ── Nav structure matching AdminLayout, keyed by module ──
interface NavItem {
  label: string;
  href: string;
  staffHref: string;
  badge?: string;
  desc?: string;
}

interface NavGroup {
  label: string;
  moduleKey: string;
  color: string;
  icon: React.ReactNode;
  items: NavItem[];
}

function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}

function IconBag({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}

function IconFolder({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  );
}

function IconEdit({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}

function IconShare({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}

function IconDoc({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 17.66l1.41-1.41"/>
    </svg>
  );
}

function IconUserCheck({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
    </svg>
  );
}

// Dedicated Workspace section available to all staff members
const STAFF_WORKSPACE_GROUP: NavGroup = {
  label: "My Workspace",
  moduleKey: "__workspace__",
  color: "#2cecf7",
  icon: <IconUserCheck />,
  items: [
    { label: "Dashboard", href: "/admin/dashboard", staffHref: "/staff/dashboard", desc: "Live hub, presence telemetry & shift status" },
    { label: "Attendance & Heatmap", href: "/admin/manage-attendance", staffHref: "/staff/attendance", desc: "Punch logs, work hours & yearly presence calendar" },
    { label: "Tasks & Deadlines", href: "/staff/tasks", staffHref: "/staff/tasks", desc: "Sprint backlog, active milestones & priorities" },
    { label: "My Agreement", href: "/staff/agreement", staffHref: "/staff/agreement", desc: "Official signed terms, compensation & legal contract" },
    { label: "Leaves & Off-Day Swap", href: "/admin/manage-leaves", staffHref: "/staff/leaves", desc: "Time-off applications & schedule swapping" },
    { label: "Daily Work Updates", href: "/admin/manage-work-updates", staffHref: "/staff/work-updates", desc: "EOD task logs, blockers & PR submissions" },
    { label: "Messages", href: "/staff/messages", staffHref: "/staff/messages", desc: "Private conversations and department channels" },
    { label: "Notifications", href: "/staff/notifications", staffHref: "/staff/notifications", desc: "Your requests, approvals and workspace activity" },
    { label: "Departments", href: "/staff/departments", staffHref: "/staff/departments", desc: "Explore teams and meet your colleagues" },
    { label: "Notice Board", href: "/staff/notices", staffHref: "/staff/notices", desc: "Company announcements, all in one place" },
  ],
};

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function StaffLayout({ children, title = "Employee Portal | DevEngine" }: StaffLayoutProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const filteredGroups = useMemo<NavGroup[]>(() => [STAFF_WORKSPACE_GROUP,
    ...STUDIO_MODULES.filter((module) => hasStudioModule(staffData, module.key)).map((module) => ({
      label: module.label, moduleKey: module.key, color: "#2cecf7",
      icon: <span className="material-symbols-outlined" aria-hidden="true">{module.icon}</span>,
      items: module.items.map((entry) => ({ ...entry, staffHref: entry.href, desc: module.description })),
    })),
  ], [staffData]);

  // ── Futuristic Bento Command Center & Profile Modal States ──
  const [commandCenterOpen, setCommandCenterOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [devKittyEnabled, setDevKittyEnabled] = useState(true);
  const [profileCopied, setProfileCopied] = useState(false);

  // ── Auth + Staff data ──
  useEffect(() => {
    const unsub = subscribeStudioAccess(undefined, ({ staff, authorized }) => {
      if (!authorized || !staff) {
        setStaffData(null);
        setAuthReady(false);
        void router.replace("/staff");
        return;
      }
      setStaffData(staff);

      // Check DevKitty preference for this employee
      try {
        const isHidden =
          localStorage.getItem(`devkitty_hidden_${staff.uid}`) === "true" ||
          (staff.id && localStorage.getItem(`devkitty_hidden_${staff.id}`) === "true");
        setDevKittyEnabled(!isHidden);
      } catch {}

      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Close Command Center on route change
  useEffect(() => {
    setCommandCenterOpen(false);
  }, [router.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCommandCenterOpen(false);
        setShowProfileModal(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleToggleDevKitty = () => {
    if (!staffData) return;
    const newEnabled = !devKittyEnabled;
    setDevKittyEnabled(newEnabled);
    try {
      if (newEnabled) {
        localStorage.removeItem(`devkitty_hidden_${staffData.uid}`);
        if (staffData.id) localStorage.removeItem(`devkitty_hidden_${staffData.id}`);
      } else {
        localStorage.setItem(`devkitty_hidden_${staffData.uid}`, "true");
        if (staffData.id) localStorage.setItem(`devkitty_hidden_${staffData.id}`, "true");
      }
      window.dispatchEvent(new Event("devkitty_visibility_change"));
    } catch (e) {
      console.error("Toggle devkitty visibility error:", e);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    setProfileCopied(true);
    setTimeout(() => setProfileCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    localStorage.removeItem("isStaff");
    localStorage.removeItem("staffUid");
    router.push("/staff");
  };

  // ── Loading state ──
  if (!authReady) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isLight ? "bg-[#f8fafc]" : "bg-[#07070f]"}`}>
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <style jsx global>{`
        html { scrollbar-gutter: stable; overflow-x: clip; }
        body { overflow-x: clip; }
      `}</style>

      <div className={`${styles.shell} flex flex-col font-sans relative selection:bg-[#2cecf7] selection:text-[#02040a] ${
        isLight ? "bg-[#f5fbff] text-slate-900" : "bg-[#02040a] text-white"
      }`}>
        {/* Ambient Animated Cyber Glow Orbs in Background */}
        <div className={styles.ambient} aria-hidden="true">
          <div className="absolute top-24 right-10 w-[450px] h-[450px] rounded-full bg-[#2cecf7]/5 blur-[120px] anim-float-orb" />
          <div className="absolute bottom-24 left-10 w-[450px] h-[450px] rounded-full bg-[#2cecf7]/5 blur-[120px] anim-float-orb" style={{ animationDuration: "9s" }} />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            1. FLOATING ROUNDED CAPSULE HEADER (Matching Global View Style)
        ───────────────────────────────────────────────────────────── */}
        <header
          className={`${styles.header} navbar staff-navbar fixed top-2 sm:top-4 left-0 right-0 z-40 px-2 sm:px-6 pointer-events-none duration-300 !bg-transparent !border-0 !shadow-none`}
          style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}
        >
          <div
            className={`${styles.headerCapsule} pointer-events-auto max-w-[1440px] mx-auto min-h-[52px] sm:min-h-[62px] px-2.5 sm:px-5 py-1.5 sm:py-2 rounded-full flex items-center justify-between gap-1.5 sm:gap-3 backdrop-blur-2xl duration-300 shadow-2xl anim-cyan-glow`}
            style={{
              background: isLight ? "rgba(255, 255, 255, 0.92)" : "rgba(10, 15, 29, 0.88)",
              border: isLight ? "1px solid rgba(44, 236, 247, 0.35)" : "1px solid rgba(44, 236, 247, 0.25)",
              boxShadow: isLight
                ? "0 14px 38px -10px rgba(44, 236, 247, 0.2), 0 4px 16px rgba(0, 0, 0, 0.05)"
                : "0 16px 40px -12px rgba(0, 0, 0, 0.75), 0 0 25px -5px rgba(44, 236, 247, 0.16)",
            }}
          >
            {/* Left: Command Center Button & DevEngine Logo */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setCommandCenterOpen((prev) => !prev)}
                aria-label="Toggle Command Center Menu"
                title="Open Command Center Menu"
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 group active:scale-95 flex-shrink-0 ${
                  commandCenterOpen
                    ? "bg-[#2cecf7] text-[#02040a] border border-[#2cecf7] shadow-[0_0_16px_#2cecf7]"
                    : isLight
                    ? "bg-slate-100 hover:bg-[#2cecf7] text-slate-700 hover:text-[#02040a] border border-slate-200 hover:border-[#2cecf7]"
                    : "bg-white/5 hover:bg-[#2cecf7] text-white hover:text-[#02040a] border border-white/10 hover:border-[#2cecf7]"
                }`}
              >
                <div className="flex flex-col gap-1 items-center justify-center w-3.5 h-3.5 sm:w-4 sm:h-4">
                  <span className={`w-3.5 sm:w-4 h-0.5 rounded-full bg-current transition-all ${commandCenterOpen ? "rotate-45 translate-y-1.5" : ""}`} />
                  <span className={`w-2.5 sm:w-3 group-hover:w-4 h-0.5 rounded-full bg-current transition-all ${commandCenterOpen ? "opacity-0" : ""}`} />
                  <span className={`w-3.5 sm:w-4 h-0.5 rounded-full bg-current transition-all ${commandCenterOpen ? "-rotate-45 -translate-y-1.5" : ""}`} />
                </div>
              </button>

              <Link href="/staff/dashboard" className="flex items-center gap-2 flex-shrink-0 group">
                <Image
                  src={isLight ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"}
                  alt="DevEngine"
                  width={130}
                  height={32}
                  priority
                  className="h-5 sm:h-7 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <span
                  className="hidden 2xl:inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wider uppercase"
                  style={{
                    background: isLight ? "rgba(44, 236, 247, 0.12)" : "rgba(44, 236, 247, 0.1)",
                    color: isLight ? "#0e7490" : "#2cecf7",
                    border: isLight ? "1px solid rgba(44, 236, 247, 0.35)" : "1px solid rgba(44, 236, 247, 0.25)",
                    boxShadow: isLight ? "none" : "0 0 10px rgba(44, 236, 247, 0.15)",
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Employee
                </span>
              </Link>
            </div>

            {/* Center Capsule Navigation Track (Shown on desktop >= 1280px to prevent crowding) */}
            <nav className="hidden xl:flex items-center justify-center flex-1 min-w-0 px-2" aria-label="Desktop menu">
              <div
                className="inline-flex items-center gap-1 p-1 rounded-full"
                style={{
                  background: isLight ? "rgba(44, 236, 247, 0.06)" : "rgba(44, 236, 247, 0.04)",
                  border: isLight ? "1px solid rgba(44, 236, 247, 0.22)" : "1px solid rgba(44, 236, 247, 0.12)",
                }}
              >
                {[
                  { label: "Dashboard", staffHref: "/staff/dashboard" },
                  { label: "Attendance", staffHref: "/staff/attendance" },
                  { label: "Tasks", staffHref: "/staff/tasks" },
                  { label: "Agreement", staffHref: "/staff/agreement" },
                  { label: "Leaves", staffHref: "/staff/leaves" },
                  { label: "Updates", staffHref: "/staff/work-updates" },
                ].map((item) => {
                  const isActive = router.pathname === item.staffHref;
                  return (
                    <Link
                      key={item.staffHref}
                      href={item.staffHref}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs transition-all duration-200 whitespace-nowrap ${
                        isActive
                          ? isLight
                            ? "font-bold text-[#0891b2] bg-[#2cecf7]/25 border border-[#2cecf7]/45 shadow-[0_0_12px_rgba(44,236,247,0.2)]"
                            : "font-bold text-[#2cecf7] bg-[#2cecf7]/15 border border-[#2cecf7]/35 shadow-[0_0_14px_rgba(44,236,247,0.22)]"
                          : isLight
                          ? "font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          : "font-medium text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] shadow-[0_0_8px_#2cecf7] animate-pulse" />}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Right: User Pill, HeaderControls, Global View & Sign Out */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Profile Pill Trigger */}
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="View Profile & Preferences"
                className={`flex items-center gap-1.5 p-1 sm:pr-2.5 sm:pl-1 rounded-full border transition-all cursor-pointer group active:scale-95 flex-shrink-0 ${
                  isLight
                    ? "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-cyan-300"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#2cecf7]/40"
                }`}
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 border border-[#2cecf7]/40 bg-[#2cecf7]/10 flex items-center justify-center"
                  style={{ width: "28px", height: "28px", minWidth: "28px", minHeight: "28px" }}
                >
                  {staffData?.avatarUrl ? (
                    <img src={staffData.avatarUrl} alt={staffData.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-[#2cecf7]">
                      {staffData?.name.charAt(0).toUpperCase() || "S"}
                    </span>
                  )}
                </div>
                <span className={`hidden 2xl:inline-block text-xs font-semibold truncate max-w-[70px] ${isLight ? "text-slate-900" : "text-white"}`}>
                  {staffData?.name?.split(" ")[0] || "Staff"}
                </span>
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                </span>
              </button>

              <CommunicationHeader />
              <HeaderControls />

              {/* Global View (Only on large screens) */}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden xl:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 flex-shrink-0"
                style={
                  isLight
                    ? { background: "#e5f8fc", border: "1px solid #bcecf6", color: "#0891b2" }
                    : { background: "rgba(44, 236, 247, 0.08)", border: "1px solid rgba(44, 236, 247, 0.25)", color: "#2cecf7", boxShadow: "0 0 12px rgba(44,236,247,0.15)" }
                }
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
                <span>Global View</span>
              </a>

              {/* Sign Out (Compact circular icon on mobile & laptops, full pill on 2xl) */}
              <button
                aria-label="Sign out"
                onClick={handleSignOut}
                title="Sign out of Employee Portal"
                className="w-8 h-8 2xl:w-auto 2xl:px-3 2xl:py-1.5 rounded-full transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 text-xs font-semibold flex-shrink-0"
                style={
                  isLight
                    ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }
                    : { background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#f87171" }
                }
              >
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden 2xl:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </header>

        {/* ─────────────────────────────────────────────────────────────
            2. FUTURISTIC BENTO COMMAND CENTER & DRAWER (Atom / SupaHero Inspired)
        ───────────────────────────────────────────────────────────── */}
        {commandCenterOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200"
            onClick={() => setCommandCenterOpen(false)}
          >
            <div
              className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[24px] sm:rounded-[32px] overflow-hidden border shadow-[0_25px_80px_rgba(0,0,0,0.85),0_0_50px_rgba(44,236,247,0.2)] animate-in zoom-in-95 duration-200 ${
                isLight ? "bg-white/95 text-slate-900 border-[#2cecf7]/40" : "bg-[#0a0f1d]/95 text-white border-[#2cecf7]/30"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top Bar (Pinned) */}
              <div className="flex items-center justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Image
                    src={isLight ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"}
                    alt="DevEngine"
                    width={120}
                    height={30}
                    priority
                    className="h-5 sm:h-7 w-auto object-contain"
                  />
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span><span className="hidden sm:inline">COMMAND CENTER // </span>ACTIVE</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCommandCenterOpen(false)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                    isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:rotate-90 hover:text-cyan-600 border-slate-300"
                      : "bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-[#2cecf7] hover:rotate-90 border-white/10"
                  }`}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Drawer Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 themed-scroll flex-1">

              {/* Employee Executive Identity Capsule */}
              {staffData && (
                <div className={`p-3.5 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 ${
                  isLight
                    ? "bg-gradient-to-r from-cyan-50/80 via-white to-blue-50/60 border-cyan-200/60"
                    : "bg-gradient-to-r from-[#2cecf7]/10 via-[#0d1629] to-blue-600/10 border-[#2cecf7]/25"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border-2 border-[#2cecf7] shadow-[0_0_18px_rgba(44,236,247,0.35)] flex items-center justify-center bg-[#2cecf7]/15 flex-shrink-0"
                        style={{ width: "52px", height: "52px", minWidth: "52px", minHeight: "52px" }}
                      >
                        {staffData.avatarUrl ? (
                          <img src={staffData.avatarUrl} alt={staffData.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-[#2cecf7]">
                            {staffData.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0f1d] shadow-[0_0_8px_#10b981]" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm sm:text-base font-bold leading-tight truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                          {staffData.name}
                        </h4>
                        <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30">
                          {STAFF_TYPE_LABELS[staffData.staffType] || staffData.staffType}
                        </span>
                      </div>
                      <p className={`text-[11px] sm:text-xs mt-0.5 font-mono truncate ${isLight ? "text-slate-600" : "text-gray-400"}`}>
                        {staffData.email}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCommandCenterOpen(false);
                      setShowProfileModal(true);
                    }}
                    className={`w-full sm:w-auto px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      isLight
                        ? "bg-white hover:bg-cyan-50 border-cyan-300 text-cyan-800 shadow-sm"
                        : "bg-white/5 hover:bg-white/10 border-white/15 text-[#2cecf7] hover:border-[#2cecf7]"
                    }`}
                  >
                    <IconSettings size={14} />
                    <span>Profile & Mascot Settings</span>
                  </button>
                </div>
              )}

              {/* Bento Workspace Navigation Cards (6 Rich Hub Cards) */}
              <div>
                <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#2cecf7] mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] shadow-[0_0_8px_#2cecf7]" />
                  <span>WORKSPACE NAVIGATION // ESSENTIAL HUBS</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {STAFF_WORKSPACE_GROUP.items.map((item) => {
                    const isActive = router.pathname === item.staffHref;
                    return (
                      <Link
                        key={item.staffHref}
                        href={item.staffHref}
                        onClick={() => setCommandCenterOpen(false)}
                        className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[110px] ${
                          isActive
                            ? isLight
                              ? "bg-gradient-to-br from-cyan-100/60 to-white border-[#2cecf7] shadow-[0_4px_20px_rgba(44,236,247,0.22)] -translate-y-0.5"
                              : "bg-gradient-to-br from-[#2cecf7]/15 to-[#0b1324] border-[#2cecf7] shadow-[0_0_24px_rgba(44,236,247,0.25)] -translate-y-0.5"
                            : isLight
                            ? "bg-slate-50/80 hover:bg-white border-slate-200 hover:border-cyan-400 hover:-translate-y-1 hover:shadow-md"
                            : "bg-white/[0.03] hover:bg-white/[0.07] border-white/10 hover:border-[#2cecf7]/50 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(44,236,247,0.15)]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            data-icon={item.staffHref.split("/").pop()}
                            data-active={isActive || undefined}
                            className={`${styles.paletteIcon} w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}
                          >
                            {item.label === "Dashboard" && <IconGrid size={18} />}
                            {item.label === "Attendance & Heatmap" && <IconUserCheck size={18} />}
                            {item.label === "Tasks & Deadlines" && <IconFolder size={18} />}
                            {item.label === "My Agreement" && <IconDoc size={18} />}
                            {item.label === "Leaves & Off-Day Swap" && <IconShare size={18} />}
                            {item.label === "Daily Work Updates" && <IconEdit size={18} />}
                            {["Messages", "Notifications", "Departments", "Notice Board"].includes(item.label) && <span className="material-symbols-outlined" aria-hidden="true">{({ Messages: "chat_bubble", Notifications: "notifications", Departments: "hub", "Notice Board": "campaign" } as Record<string, string>)[item.label]}</span>}
                          </div>

                          {isActive ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2cecf7] text-[#02040a] shadow-[0_0_10px_#2cecf7]">
                              ACTIVE
                            </span>
                          ) : (
                            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-gray-400 group-hover:text-[#2cecf7] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                              <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
                            </svg>
                          )}
                        </div>

                        <div className="mt-2.5">
                          <h5 className={`text-sm font-bold leading-tight group-hover:text-[#2cecf7] transition-colors ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}>
                            {item.label}
                          </h5>
                          <p className={`text-[11px] mt-1 leading-snug line-clamp-2 ${isLight ? "text-slate-600" : "text-gray-400"}`}>
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <section className={styles.assignedSection} aria-labelledby="assigned-studio-heading">
                <div className={styles.assignedHeading}>
                  <div><h3 id="assigned-studio-heading">Assigned Studio Modules</h3><p>Your admin-granted tools, ready to open.</p></div>
                  <span>{filteredGroups.length - 1} assigned</span>
                </div>
                {filteredGroups.length > 1 ? <div className={styles.moduleGrid}>
                  {filteredGroups.filter((group) => group.moduleKey !== "__workspace__").map((group) => (
                    <section key={group.moduleKey} className={styles.moduleCard}>
                      <div className={styles.moduleHeading}><span className={styles.paletteIcon} data-icon={group.moduleKey}>{group.icon}</span><div><h4>{group.label}</h4><p>{group.items.length} {group.items.length === 1 ? "tool" : "tools"} available</p></div></div>
                      <div className={styles.moduleLinks}>{group.items.map((entry) => <Link key={entry.staffHref} href={entry.staffHref}
                        onClick={() => setCommandCenterOpen(false)} aria-current={router.pathname === entry.staffHref ? "page" : undefined}>
                        <span>{entry.label}</span><span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
                      </Link>)}</div>
                    </section>
                  ))}
                </div> : <p className={styles.moduleEmpty}>No studio modules assigned yet. Your workspace tools above are always available.</p>}
              </section>

              </div>

              {/* Footer (Pinned) */}
              <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs flex-shrink-0">
                <div className="flex items-center gap-2 text-gray-400 font-mono text-[11px]">
                  <span>DevEngine Portal OS // 2026</span>
                  <span>•</span>
                  <span className="text-[#2cecf7]">Shift Synchronized</span>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl border border-[#2cecf7]/30 bg-[#2cecf7]/10 text-[#2cecf7] hover:bg-[#2cecf7] hover:text-[#02040a] font-semibold transition"
                  >
                    Global View
                  </a>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-3 py-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white font-semibold transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. MAIN CONTENT WRAPPER
        ───────────────────────────────────────────────────────────── */}
        <main className={`${styles.main} flex-1 min-w-0 pt-20 sm:pt-24 pb-12 relative z-10`}>
          {children}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            3.5. GLOBAL DEVENGINE FOOTER (Matching Global View)
        ───────────────────────────────────────────────────────────── */}
        <div className="relative z-10 w-full mt-auto">
          <LandingFooter />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            4. EMPLOYEE PROFILE & PREFERENCES MODAL
        ───────────────────────────────────────────────────────────── */}
        {showProfileModal && staffData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className={`w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border ${
              isLight ? "bg-white text-slate-900 border-slate-200" : "bg-[#0a0f1d] text-white border-white/10"
            }`}>
              {/* Header */}
              <div className={`relative p-6 border-b ${
                isLight ? "bg-gradient-to-r from-cyan-500/10 via-white to-blue-500/10 border-slate-200" : "bg-gradient-to-r from-[#2cecf7]/15 via-[#0a0f1d] to-blue-500/10 border-white/10"
              }`}>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                    isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900" : "bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white"
                  }`}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[#2cecf7]/15 border-2 border-[#2cecf7]/40 flex items-center justify-center flex-shrink-0 shadow-lg">
                    {staffData.avatarUrl ? (
                      <img src={staffData.avatarUrl} alt={staffData.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#2cecf7]">
                        {staffData.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#2cecf7] bg-[#2cecf7]/10 px-2.5 py-0.5 rounded-full border border-[#2cecf7]/25">
                      Employee Account Profile
                    </span>
                    <h3 className={`text-xl font-bold mt-1 truncate ${isLight ? "text-slate-900" : "text-white"}`}>{staffData.name}</h3>
                    <p className={`text-xs font-mono flex items-center gap-1.5 mt-0.5 ${isLight ? "text-slate-600" : "text-gray-400"}`}>
                      <span>{staffData.email}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(staffData.email)}
                        className="text-gray-400 hover:text-[#2cecf7] transition cursor-pointer p-0.5 rounded"
                        title="Copy email address"
                      >
                        {profileCopied ? (
                          <span className="text-emerald-500 font-bold text-xs">✓ Copied</span>
                        ) : (
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        )}
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto themed-scroll">
                {/* Employee Details Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <div className={`p-3.5 rounded-2xl border space-y-1 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Assigned Role</span>
                    <span className="text-[#2cecf7] font-semibold block capitalize">
                      {STAFF_TYPE_LABELS[staffData.staffType] || staffData.staffType}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-1 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Account Status</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active Member
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-1 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Shift Timings</span>
                    <span className={`font-semibold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      {staffData.shiftHours ? `${staffData.shiftHours.start} - ${staffData.shiftHours.end}` : "09:00 AM - 06:00 PM"}
                    </span>
                  </div>

                  <div className={`p-3.5 rounded-2xl border space-y-1 ${isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/5"}`}>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Weekly Off-Days</span>
                    <span className="text-[#2cecf7] font-semibold block">
                      {(staffData.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Agreement Shortcut */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.03] border-white/5"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#2cecf7]/10 text-[#2cecf7] flex items-center justify-center shrink-0 border border-[#2cecf7]/20">
                      <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Employment Agreement</p>
                      <p className="text-[11px] text-gray-400">View signed terms, compensation & legal contract</p>
                    </div>
                  </div>
                  <Link
                    href="/staff/agreement"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold transition"
                    style={{
                      background: isLight ? "#e5f8fc" : "rgba(44, 236, 247, 0.15)",
                      border: "1px solid rgba(44, 236, 247, 0.3)",
                      color: isLight ? "#0891b2" : "#2cecf7"
                    }}
                  >
                    View
                  </Link>
                </div>

                {/* DevKitty Mascot Widget Toggle */}
                <div className={`p-4 rounded-2xl border space-y-2 ${
                  isLight ? "bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200" : "bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-transparent border-cyan-500/20"
                }`}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-400 to-blue-500 p-[1px] shrink-0">
                        <div className={`w-full h-full rounded-xl flex items-center justify-center ${isLight ? "bg-white text-cyan-600" : "bg-[#080e1a] text-[#2cecf7]"}`}>
                          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path d="M12 2a4 4 0 0 0-4 4v1a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4z" />
                            <path d="M6 10v4a6 6 0 0 0 12 0v-4" />
                            <circle cx="9" cy="11" r="1" fill="currentColor" />
                            <circle cx="15" cy="11" r="1" fill="currentColor" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>DevKitty Mascot Widget</span>
                        <span className="text-[10px] text-gray-400">Floating assistant in workspace corner</span>
                      </div>
                    </div>

                    {/* Interactive Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={devKittyEnabled}
                      onClick={handleToggleDevKitty}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        devKittyEnabled ? "bg-[#2cecf7]" : (isLight ? "bg-slate-300" : "bg-neutral-800")
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          devKittyEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <p className={`text-[11px] leading-relaxed font-sans ${isLight ? "text-slate-600" : "text-gray-300"}`}>
                    {devKittyEnabled ? (
                      <span className="text-emerald-500 font-semibold">Active:</span>
                    ) : (
                      <span className="text-amber-500 font-semibold">Hidden:</span>
                    )}{" "}
                    DevKitty is currently {devKittyEnabled ? "visible" : "hidden"} for your account. You can toggle this anytime without affecting other team members.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className={`p-4 border-t flex items-center justify-between gap-3 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-white/[0.02] border-white/10"
              }`}>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 dark:text-rose-300 text-xs font-semibold transition cursor-pointer"
                >
                  Sign Out
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-6 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  style={{
                    background: "#2cecf7",
                    color: "#02040a",
                    boxShadow: "0 0 20px rgba(44, 236, 247, 0.35)"
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
