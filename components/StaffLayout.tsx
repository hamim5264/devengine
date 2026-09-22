import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import type { StaffMember } from "@/types/staff";
import { STAFF_TYPE_LABELS, MODULE_CONFIG } from "@/types/staff";
import HelixLoader from "@/components/HelixLoader";

// ── Nav structure matching AdminLayout, keyed by module ──
interface NavItem {
  label: string;
  href: string;
  staffHref: string; // the /staff/... path
  badge?: string;
}
interface NavGroup {
  label: string;
  moduleKey: string;
  color: string;
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

// All possible nav groups (same structure as admin but with staff paths)
const ALL_NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    moduleKey: "overview",
    color: "#14b8a6",
    icon: <IconGrid />,
    items: [{ label: "Dashboard", href: "/admin/dashboard", staffHref: "/staff/dashboard" }],
  },
  {
    label: "Commerce",
    moduleKey: "commerce",
    color: "#34d399",
    icon: <IconBag />,
    items: [
      { label: "Orders & Payments", href: "/admin/manage-orders", staffHref: "/staff/manage-orders" },
      { label: "Currencies", href: "/admin/manage-currencies", staffHref: "/staff/manage-currencies" },
    ],
  },
  {
    label: "Projects",
    moduleKey: "projects",
    color: "#60a5fa",
    icon: <IconFolder />,
    items: [
      { label: "Add Project", href: "/admin/add-project", staffHref: "/staff/add-project" },
      { label: "Manage Projects", href: "/admin/manage-projects", staffHref: "/staff/manage-projects" },
      { label: "Manage Categories", href: "/admin/manage-categories", staffHref: "/staff/manage-categories" },
      { label: "Agreements", href: "/admin/agreements", staffHref: "/staff/agreements" },
      { label: "Manage Tags", href: "/admin/manage-tags", staffHref: "/staff/manage-tags" },
    ],
  },
  {
    label: "Content CMS",
    moduleKey: "content_cms",
    color: "#a78bfa",
    icon: <IconEdit />,
    items: [
      { label: "Landing", href: "/admin/manage-landing", staffHref: "/staff/manage-landing" },
      { label: "Archive", href: "/admin/manage-archive", staffHref: "/staff/manage-archive" },
      { label: "Launchpad", href: "/admin/manage-launchpad", staffHref: "/staff/manage-launchpad" },
      { label: "Services", href: "/admin/manage-services", staffHref: "/staff/manage-services" },
      { label: "Blog", href: "/admin/manage-blog", staffHref: "/staff/manage-blog" },
      { label: "Reviews", href: "/admin/manage-reviews", staffHref: "/staff/manage-reviews" },
      { label: "About & Team", href: "/admin/manage-about", staffHref: "/staff/manage-about" },
      { label: "Careers", href: "/admin/manage-careers", staffHref: "/staff/manage-careers" },
      { label: "Docs & API", href: "/admin/manage-documentation", staffHref: "/staff/manage-documentation" },
      { label: "Update Logs", href: "/admin/manage-update-logs", staffHref: "/staff/manage-update-logs" },
      { label: "Lab", href: "/admin/manage-lab", staffHref: "/staff/manage-lab" },
      { label: "Lab Categories", href: "/admin/manage-lab-categories", staffHref: "/staff/manage-lab-categories" },
    ],
  },
  {
    label: "Social & Network",
    moduleKey: "social_network",
    color: "#38bdf8",
    icon: <IconShare />,
    items: [
      { label: "Socials & Follow Us", href: "/admin/manage-socials", staffHref: "/staff/manage-socials" },
      { label: "Network Hubs", href: "/admin/manage-network", staffHref: "/staff/manage-network" },
    ],
  },
  {
    label: "Legal",
    moduleKey: "legal",
    color: "#fb923c",
    icon: <IconDoc />,
    items: [
      { label: "Terms & Conditions", href: "/admin/manage-terms", staffHref: "/staff/manage-terms" },
      { label: "Privacy Policy", href: "/admin/manage-privacy", staffHref: "/staff/manage-privacy" },
      { label: "License Agreement", href: "/admin/manage-license", staffHref: "/staff/manage-license" },
      { label: "Refund Policy", href: "/admin/manage-refund", staffHref: "/staff/manage-refund" },
      { label: "Security Protocol", href: "/admin/manage-security", staffHref: "/staff/manage-security" },
    ],
  },
  {
    label: "System",
    moduleKey: "system",
    color: "#f59e0b",
    icon: <IconSettings />,
    items: [
      { label: "Maintenance Mode", href: "/admin/manage-maintenance", staffHref: "/staff/manage-maintenance" },
      { label: "Recycle Bin", href: "/admin/manage-bin", staffHref: "/staff/manage-bin" },
    ],
  },
];

interface StaffLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const SCROLL_STORAGE_KEY = "staff_nav_scroll";
const EXPANDED_STORAGE_KEY = "staff_nav_expanded";

export default function StaffLayout({ children, title = "Staff Portal | DevEngine" }: StaffLayoutProps) {
  const router = useRouter();
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [filteredGroups, setFilteredGroups] = useState<NavGroup[]>([]);

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(EXPANDED_STORAGE_KEY);
        if (saved) return new Set(JSON.parse(saved));
      } catch {}
    }
    return new Set(ALL_NAV_GROUPS.map((g) => g.label));
  });

  // ── Auth + Staff data ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        await signOut(auth);
        localStorage.removeItem("isStaff");
        localStorage.removeItem("staffUid");
        router.replace("/staff");
        return;
      }
      setStaffData(staff);
      // Filter nav groups by allowed modules
      const allowed = new Set(staff.allowedModules);
      setFilteredGroups(ALL_NAV_GROUPS.filter((g) => allowed.has(g.moduleKey)));
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // ── Auto-expand active group ──
  useEffect(() => {
    const activeGroup = filteredGroups.find((g) =>
      g.items.some((it) => it.staffHref === router.pathname),
    );
    if (activeGroup) {
      setExpandedGroups((prev) => {
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
  }, [router.pathname, filteredGroups]);

  // ── Scroll restore ──
  useEffect(() => {
    const restore = () => {
      if (!navScrollRef.current) return;
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved !== null) {
        navScrollRef.current.scrollTop = Number(saved);
      }
    };
    restore();
    const af = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(af);
  }, [router.pathname]);

  const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
    try { sessionStorage.setItem(SCROLL_STORAGE_KEY, String(e.currentTarget.scrollTop)); } catch {}
  };
  const handleNavClick = () => {
    if (navScrollRef.current) {
      try { sessionStorage.setItem(SCROLL_STORAGE_KEY, String(navScrollRef.current.scrollTop)); } catch {}
    }
  };

  // ── Responsive ──
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

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [router.pathname, isMobile]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      try { sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
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
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={{ fontFamily: "'Poppins', sans-serif" }} className="min-h-screen bg-[#07070f] text-white flex flex-col">

        {/* ── TOP HEADER ── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
          style={{ background: "rgba(7,7,15,0.96)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}
        >
          <button onClick={() => setSidebarOpen((p) => !p)} className="p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0 cursor-pointer">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <Link href="/staff/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <span
              className="text-[15px] font-bold tracking-tight"
              style={{ background: "linear-gradient(90deg,#a855f7,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              DevEngine
            </span>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tracking-widest uppercase"
              style={{ background: "rgba(168,85,247,0.12)", color: "#a855f7", border: "1px solid rgba(168,85,247,0.25)" }}
            >
              Staff
            </span>
          </Link>

          <div className="flex-1" />

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)", color: "#a855f7" }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            Global View
          </a>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        <div className="flex flex-1 pt-14">
          {isMobile && sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          )}

          {/* ── SIDEBAR ── */}
          <aside
            className="fixed top-14 left-0 bottom-0 z-40 overflow-hidden transition-all duration-300 ease-in-out flex flex-col"
            style={{ width: sidebarOpen ? 240 : 0, background: "#0b0b18", borderRight: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div ref={navScrollRef} onScroll={handleNavScroll} className="flex-1 overflow-y-auto themed-scroll py-3" style={{ width: 240 }}>
              {filteredGroups.map((group, gi) => {
                const isExpanded = expandedGroups.has(group.label);
                return (
                  <div key={group.label} className={gi > 0 ? "mt-1" : ""}>
                    {gi > 0 && (
                      <div className="mx-3 mb-1" style={{ height: 1, background: "rgba(255,255,255,0.05)" }} />
                    )}

                    <button onClick={() => toggleGroup(group.label)} className="w-full flex items-center justify-between px-3 py-2 mx-0 text-left group cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all" style={{ background: `${group.color}18`, color: group.color }}>
                          {group.icon}
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: isExpanded ? group.color : "rgba(156,163,175,0.7)" }}>
                          {group.label}
                        </span>
                      </div>
                      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                        className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        style={{ color: isExpanded ? group.color : "rgba(107,114,128,0.6)" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="pb-1">
                        {group.items.map((item) => {
                          const isActive = router.pathname === item.staffHref;
                          return (
                            <Link
                              key={item.staffHref}
                              href={item.staffHref}
                              data-active={isActive ? "true" : undefined}
                              onClick={handleNavClick}
                              className="flex items-center justify-between mx-2 px-2.5 py-[7px] rounded-lg my-0.5 text-[13px] font-medium transition-all duration-150"
                              style={
                                isActive
                                  ? { background: `${group.color}14`, color: group.color, borderLeft: `2px solid ${group.color}`, paddingLeft: "9px" }
                                  : { color: "rgba(156,163,175,0.85)", borderLeft: "2px solid transparent", paddingLeft: "9px" }
                              }
                              onMouseEnter={(e) => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                                  (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isActive) {
                                  (e.currentTarget as HTMLElement).style.background = "transparent";
                                  (e.currentTarget as HTMLElement).style.color = "rgba(156,163,175,0.85)";
                                }
                              }}
                            >
                              <span className="leading-none">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sidebar Footer — Staff info */}
            <div className="flex-shrink-0 p-3" style={{ width: 240, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-violet-400/40 bg-violet-500/10 shadow-sm flex items-center justify-center">
                  <span className="text-sm font-bold text-violet-300">
                    {staffData?.name.charAt(0).toUpperCase() || "S"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-white truncate leading-tight">
                    {staffData?.name || "Staff"}
                  </p>
                  <p className="text-[10px] truncate leading-tight mt-0.5" style={{ color: "#a855f7" }}>
                    {staffData ? STAFF_TYPE_LABELS[staffData.staffType] : "Staff Member"}
                  </p>
                </div>
                <div className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0 shadow-[0_0_6px_rgba(168,85,247,0.8)]" />
              </div>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 transition-all duration-300 ease-in-out min-h-[calc(100vh-56px)]" style={{ marginLeft: !isMobile && sidebarOpen ? 240 : 0 }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
