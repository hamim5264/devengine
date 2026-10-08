import React, { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getCachedStaffByUid } from "@/lib/services/staffAuth";
import type { StaffMember } from "@/types/staff";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";

interface NavItem { label: string; href: string; badge?: string; }
interface NavGroup {
  label: string;
  moduleKey?: string;
  color: string;        // accent color for the group
  icon: React.ReactNode;
  items: NavItem[];
}

function IconGrid({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function IconBag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconFolder({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
    </svg>
  );
}
function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
}
function IconShare({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function IconDoc({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );
}
function IconSettings({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 17.66l1.41-1.41"/>
    </svg>
  );
}

function IconUserCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    moduleKey: "overview",
    color: "#14b8a6",
    icon: <IconGrid />,
    items: [{ label: "Dashboard", href: "/admin/dashboard" }],
  },
  {
    label: "Commerce",
    moduleKey: "commerce",
    color: "#34d399",
    icon: <IconBag />,
    items: [
      { label: "Orders & Payments", href: "/admin/manage-orders", badge: "live" },
      { label: "Currencies", href: "/admin/manage-currencies" },
    ],
  },
  {
    label: "Projects",
    moduleKey: "projects",
    color: "#60a5fa",
    icon: <IconFolder />,
    items: [
      { label: "Add Project", href: "/admin/add-project" },
      { label: "Manage Projects", href: "/admin/manage-projects" },
      { label: "Manage Categories", href: "/admin/manage-categories" },
      { label: "Agreements", href: "/admin/agreements", badge: "new" },
      { label: "Manage Tags", href: "/admin/manage-tags" },
    ],
  },
  {
    label: "Content CMS",
    moduleKey: "content_cms",
    color: "#a78bfa",
    icon: <IconEdit />,
    items: [
      { label: "Landing", href: "/admin/manage-landing" },
      { label: "Archive", href: "/admin/manage-archive" },
      { label: "Launchpad", href: "/admin/manage-launchpad" },
      { label: "Services", href: "/admin/manage-services" },
      { label: "Blog", href: "/admin/manage-blog" },
      { label: "Reviews", href: "/admin/manage-reviews" },
      { label: "About & Team", href: "/admin/manage-about" },
      { label: "Careers", href: "/admin/manage-careers" },
      { label: "Docs & API", href: "/admin/manage-documentation" },
      { label: "Update Logs", href: "/admin/manage-update-logs" },
      { label: "Lab", href: "/admin/manage-lab" },
      { label: "Lab Categories", href: "/admin/manage-lab-categories" },
    ],
  },
  {
    label: "Social & Network",
    moduleKey: "social_network",
    color: "#38bdf8",
    icon: <IconShare />,
    items: [
      { label: "Socials & Follow Us", href: "/admin/manage-socials" },
      { label: "Network Hubs", href: "/admin/manage-network" },
    ],
  },
  {
    label: "Legal",
    moduleKey: "legal",
    color: "#fb923c",
    icon: <IconDoc />,
    items: [
      { label: "App Policies & Hub", href: "/admin/manage-app-legal", badge: "new" },
      { label: "Terms & Conditions", href: "/admin/manage-terms" },
      { label: "Privacy Policy", href: "/admin/manage-privacy" },
      { label: "License Agreement", href: "/admin/manage-license" },
      { label: "Refund Policy", href: "/admin/manage-refund" },
      { label: "Security Protocol", href: "/admin/manage-security" },
    ],
  },
  {
    label: "Employee Operations",
    moduleKey: "staff_operations",
    color: "#a855f7",
    icon: <IconUserCheck />,
    items: [
      { label: "Employees", href: "/admin/manage-staff" },
      { label: "Employee Roles", href: "/admin/manage-staff-roles" },
      { label: "Employee Attendance", href: "/admin/manage-attendance", badge: "new" },
      { label: "Work Updates", href: "/admin/manage-work-updates", badge: "new" },
      { label: "Leave Requests", href: "/admin/manage-leaves", badge: "new" },
    ],
  },
  {
    label: "System",
    moduleKey: "system",
    color: "#f59e0b",
    icon: <IconSettings />,
    items: [
      { label: "Active Theme Modes", href: "/admin/manage-theme-settings", badge: "new" },
      { label: "PDF Branding", href: "/admin/manage-pdf-settings" },
      { label: "Maintenance Mode", href: "/admin/manage-maintenance" },
      { label: "Recycle Bin", href: "/admin/manage-bin" },
    ],
  },
];

interface AdminLayoutProps { children: React.ReactNode; title?: string; }

const SCROLL_STORAGE_KEY = "admin_nav_scroll";
const EXPANDED_STORAGE_KEY = "admin_nav_expanded";

export default function AdminLayout({ children, title = "Admin Panel | DevEngine" }: AdminLayoutProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isStaffUser, setIsStaffUser] = useState(false);
  const [staffRecord, setStaffRecord] = useState<StaffMember | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsStaffUser(false);
        setStaffRecord(null);
        return;
      }
      const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com").toLowerCase();
      if (user.email?.toLowerCase() === adminEmail) {
        setIsStaffUser(false);
        setStaffRecord(null);
        return;
      }
      const staff = await getCachedStaffByUid(user.uid);
      if (staff && staff.status === "active") {
        setIsStaffUser(true);
        setStaffRecord(staff);
      }
    });
    return () => unsub();
  }, []);

  const visibleGroups = useMemo(() => {
    if (!isStaffUser || !staffRecord) return NAV_GROUPS;

    const workspaceGroup: NavGroup = {
      label: "My Workspace",
      color: "#a855f7",
      icon: <IconUserCheck />,
      items: [
        { label: "Dashboard", href: "/staff/dashboard" },
        { label: "My Attendance", href: "/staff/attendance" },
        { label: "Daily Work Updates", href: "/staff/work-updates" },
        { label: "Leave Applications", href: "/staff/leaves" },
      ],
    };

    const allowed = new Set(staffRecord.allowedModules || []);
    const allowedGroups = NAV_GROUPS.filter(
      (g) => g.moduleKey && (allowed.has(g.moduleKey) || allowed.has("all"))
    );

    return [workspaceGroup, ...allowedGroups];
  }, [isStaffUser, staffRecord]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set(NAV_GROUPS.map(g => g.label));
  });
  const [isMobile, setIsMobile] = useState(false);

  // Auto-expand group that contains current active page
  useEffect(() => {
    const activeGroup = visibleGroups.find(g => g.items.some(it => it.href === router.pathname));
    if (activeGroup) {
      setExpandedGroups(prev => {
        if (!prev.has(activeGroup.label)) {
          const next = new Set(prev);
          next.add(activeGroup.label);
          try {
            sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(next)));
          } catch {}
          return next;
        }
        return prev;
      });
    }
  }, [router.pathname, visibleGroups]);

  // Restore drawer scroll position on mount & after route transitions
  useEffect(() => {
    const restoreNavScroll = () => {
      if (!navScrollRef.current) return;
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved !== null) {
        navScrollRef.current.scrollTop = Number(saved);
      } else {
        const activeEl = navScrollRef.current.querySelector<HTMLElement>('[data-active="true"]');
        if (activeEl) {
          activeEl.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      }
    };

    restoreNavScroll();
    const animFrame = requestAnimationFrame(restoreNavScroll);
    return () => cancelAnimationFrame(animFrame);
  }, [router.pathname]);

  const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(e.currentTarget.scrollTop));
    } catch {}
  };

  const handleNavClick = () => {
    if (navScrollRef.current) {
      try {
        sessionStorage.setItem(SCROLL_STORAGE_KEY, String(navScrollRef.current.scrollTop));
      } catch {}
    }
  };

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { if (isMobile) setSidebarOpen(false); }, [router.pathname, isMobile]);

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      try {
        sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOut(auth);
    if (isStaffUser) {
      localStorage.removeItem("isStaff");
      localStorage.removeItem("staffUid");
      router.push("/staff");
    } else {
      router.push("/login");
    }
  };

  return (
    <>
      <Head><title>{title}</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div style={{ fontFamily: "'Poppins', sans-serif" }} className={`min-h-screen flex flex-col ${isLight ? "bg-[#f8fafc] text-slate-900" : "bg-[#07070f] text-white"}`}>

        {/* ── TOP HEADER ── */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
          style={{
            background: isLight ? "rgba(255,255,255,0.96)" : "rgba(7,7,15,0.96)",
            borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)"
          }}>
          <button onClick={() => setSidebarOpen(p => !p)}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isLight ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/5"
            }`}>
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          <Link href={isStaffUser ? "/staff/dashboard" : "/admin/dashboard"} className="flex items-center gap-2.5 flex-shrink-0">
            <span className="text-[15px] font-bold tracking-tight"
              style={{ background: "linear-gradient(90deg,#38f2ff,#14b8a6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              DevEngine
            </span>
            {isStaffUser ? (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-widest uppercase"
                style={{ background: isLight ? "#f3e8ff" : "rgba(168,85,247,0.15)", color: isLight ? "#7e22ce" : "#c084fc", border: isLight ? "1px solid #d8b4fe" : "1px solid rgba(168,85,247,0.3)" }}>
                Staff
              </span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-widest uppercase"
                style={{ background: isLight ? "#ccfbf1" : "rgba(56,242,255,0.12)", color: isLight ? "#0f766e" : "#38f2ff", border: isLight ? "1px solid #99f6e4" : "1px solid rgba(56,242,255,0.25)" }}>
                Admin
              </span>
            )}
          </Link>

          {isStaffUser && staffRecord && (
            <div className={`hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs ${
              isLight ? "bg-slate-100 border border-slate-200 text-slate-700" : "bg-white/[0.03] border border-white/[0.06] text-white/70"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className={`font-medium ${isLight ? "text-slate-900" : "text-white/90"}`}>{staffRecord.name}</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                {staffRecord.staffType}
              </span>
            </div>
          )}

          <div className="flex-1"/>

          {isStaffUser && (
            <Link href="/staff/dashboard"
              className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={isLight ? { background: "#f3e8ff", border: "1px solid #d8b4fe", color: "#7e22ce" } : { background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#c084fc" }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Staff Portal
            </Link>
          )}

          <ThemeToggle showLabel={false} />

          <a href="/" target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={isLight ? { background: "#f0fdfa", border: "1px solid #99f6e4", color: "#0f766e" } : { background: "rgba(56,242,255,0.07)", border: "1px solid rgba(56,242,255,0.15)", color: "#38f2ff" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
            Global View
          </a>

          <button onClick={handleSignOut}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={isLight ? { background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" } : { background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <div className="flex flex-1 pt-14">
          {isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}/>
          )}

          {/* ── SIDEBAR ── */}
          <aside className="fixed top-14 left-0 bottom-0 z-40 overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
            style={{
              width: sidebarOpen ? 240 : 0,
              background: isLight ? "#ffffff" : "#0b0b18",
              borderRight: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)"
            }}>

            {/* Scrollable nav */}
            <div
              ref={navScrollRef}
              onScroll={handleNavScroll}
              className="flex-1 overflow-y-auto themed-scroll py-3"
              style={{ width: 240 }}
            >
              {visibleGroups.map((group, gi) => {
                const isExpanded = expandedGroups.has(group.label);
                return (
                  <div key={group.label} className={gi > 0 ? "mt-1" : ""}>

                    {/* Section divider line (except first) */}
                    {gi > 0 && (
                      <div className="mx-3 mb-1" style={{ height: 1, background: isLight ? "#e2e8f0" : "rgba(255,255,255,0.05)" }}/>
                    )}

                    {/* Group Header Button */}
                    <button
                      onClick={() => toggleGroup(group.label)}
                      className="w-full flex items-center justify-between px-3 py-2 mx-0 text-left group"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Colored icon */}
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                          style={{ background: `${group.color}18`, color: group.color }}>
                          {group.icon}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em]"
                          style={{ color: isExpanded ? group.color : (isLight ? "#475569" : "rgba(156,163,175,0.7)") }}>
                          {group.label}
                        </span>
                      </div>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: isExpanded ? group.color : (isLight ? "#64748b" : "rgba(107,114,128,0.6)") }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>

                    {/* Nav Items */}
                    {isExpanded && (
                      <div className="pb-1">
                        {group.items.map(item => {
                          const isActive = router.pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              data-active={isActive ? "true" : undefined}
                              onClick={handleNavClick}
                              className="flex items-center justify-between mx-2 px-2.5 py-[7px] rounded-lg my-0.5 text-[13px] font-medium transition-all duration-150"
                              style={isActive ? {
                                background: `${group.color}18`,
                                color: group.color,
                                borderLeft: `2px solid ${group.color}`,
                                paddingLeft: "9px",
                                fontWeight: 600,
                              } : {
                                color: isLight ? "#334155" : "rgba(156,163,175,0.85)",
                                borderLeft: "2px solid transparent",
                                paddingLeft: "9px",
                              }}
                              onMouseEnter={e => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = isLight ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.04)";
                                  (e.currentTarget as HTMLElement).style.color = isLight ? "#0f172a" : "rgba(255,255,255,0.9)";
                                }
                              }}
                              onMouseLeave={e => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = "transparent";
                                  (e.currentTarget as HTMLElement).style.color = isLight ? "#334155" : "rgba(156,163,175,0.85)";
                                }
                              }}
                            >
                              <span className="leading-none">{item.label}</span>
                              {item.badge === "live" && (
                                <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: "#059669" }}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"/>
                                  LIVE
                                </span>
                              )}
                              {item.badge === "new" && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider"
                                  style={{
                                    background: isLight ? "#ccfbf1" : "rgba(56,242,255,0.12)",
                                    color: isLight ? "#0f766e" : "#38f2ff",
                                    border: isLight ? "1px solid #99f6e4" : "1px solid rgba(56,242,255,0.25)"
                                  }}>
                                  NEW
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer — Admin info */}
            <div className="flex-shrink-0 p-3" style={{ width: 240, borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl"
                style={{ background: isLight ? "#f8fafc" : "rgba(255,255,255,0.03)", border: isLight ? "1px solid #e2e8f0" : "none" }}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-teal-400/40 bg-teal-500/10 shadow-sm">
                  <img
                    src="/assets/CEO.png"
                    alt="Hamim Leon"
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[12px] font-semibold truncate leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>Hamim Leon</p>
                  <p className="text-[10px] truncate leading-tight mt-0.5 font-medium" style={{ color: isLight ? "#0d9488" : "#14b8a6" }}>Administrator</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 shadow-[0_0_6px_rgba(52,211,153,0.8)]"/>
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 transition-all duration-300 ease-in-out min-h-[calc(100vh-56px)]"
            style={{ marginLeft: !isMobile && sidebarOpen ? 240 : 0 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}