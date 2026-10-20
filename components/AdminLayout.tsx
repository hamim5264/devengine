import { useAdminProfile } from "@/lib/services/adminProfileService";
import LandingFooter from "@/components/landing/LandingFooter";
import { createPortal } from "react-dom";
import styles from "@/components/admin/AdminShell.module.css";
import Image from "next/image";
import { CommunicationHeader } from "@/components/communication/CommunicationEntry";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdminOrStaffAuth } from "@/lib/services/staffAuth";
import { modulesForAdminRoute } from "@/lib/staffModules";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import HeaderControls from "@/components/HeaderControls";
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
function IconContract({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15l2 2 4-4"/>
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    moduleKey: "overview",
    color: "#2cecf7",
    icon: <IconGrid />,
    items: [{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Project Overviews & Budgets", href: "/admin/project-briefs", badge: "new" }, { label: "My Profile", href: "/admin/profile" }],
  },
  {
    label: "Commerce",
    moduleKey: "commerce",
    color: "#2cecf7",
    icon: <IconBag />,
    items: [
      { label: "Orders & Payments", href: "/admin/manage-orders", badge: "live" },
      { label: "Invoice PDF Settings", href: "/admin/manage-pdf-settings", badge: "pdf" },
      { label: "Currencies", href: "/admin/manage-currencies" },
    ],
  },
  {
    label: "Contract Center",
    moduleKey: "contract_center",
    color: "#2cecf7",
    icon: <IconContract />,
    items: [
      { label: "Overview", href: "/admin/contract-center", badge: "new" },
      { label: "Clients", href: "/admin/contract-center/clients" },
      { label: "Projects", href: "/admin/contract-center/projects" },
      { label: "Quotations", href: "/admin/contract-center/quotations" },
      { label: "NDAs", href: "/admin/contract-center/ndas" },
      { label: "Agreements", href: "/admin/contract-center/agreements" },
      { label: "Statements of Work", href: "/admin/contract-center/sow" },
      { label: "Change Orders", href: "/admin/contract-center/change-orders" },
      { label: "Signatures", href: "/admin/contract-center/signatures" },
      { label: "Milestones", href: "/admin/contract-center/milestones" },
      { label: "Templates", href: "/admin/contract-center/templates" },
      { label: "Payments", href: "/admin/contract-center/payments" },
      { label: "Audit Trail", href: "/admin/contract-center/audit" },
      { label: "Settings", href: "/admin/contract-center/settings" },
    ],
  },
  {
    label: "Projects",
    moduleKey: "projects",
    color: "#2cecf7",
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
    color: "#2cecf7",
    icon: <IconEdit />,
    items: [
      { label: "Landing", href: "/admin/manage-landing" },
      { label: "Archive", href: "/admin/manage-archive" },
      { label: "Launchpad", href: "/admin/manage-launchpad" },
      { label: "App Collection", href: "/admin/app-lab/manage" },
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
    color: "#2cecf7",
    icon: <IconShare />,
    items: [
      { label: "Socials & Follow Us", href: "/admin/manage-socials" },
      { label: "Network Hubs", href: "/admin/manage-network" },
    ],
  },
  {
    label: "Legal",
    moduleKey: "legal",
    color: "#2cecf7",
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
    label: "People & Work",
    moduleKey: "staff_operations",
    color: "#2cecf7",
    icon: <IconUserCheck />,
    items: [
      { label: "Employees", href: "/admin/manage-staff" },
      { label: "Employee Roles", href: "/admin/manage-staff-roles" },
      { label: "Employee Attendance", href: "/admin/manage-attendance", badge: "new" },
      { label: "Work Updates", href: "/admin/manage-work-updates", badge: "new" },
      { label: "Leave Requests", href: "/admin/manage-leaves", badge: "new" },
      { label: "Certificates", href: "/admin/manage-certificates", badge: "new" },
    ],
  },
  {
    label: "Communication",
    moduleKey: "communication",
    color: "#2cecf7",
    icon: <IconShare />,
    items: [
      { label: "Messages", href: "/admin/messages" },
      { label: "Activity Inbox", href: "/admin/notifications" },
      { label: "Departments", href: "/admin/departments" },
      { label: "Notice Board", href: "/admin/notices" },
    ],
  },
  {
    label: "System",
    moduleKey: "system",
    color: "#2cecf7",
    icon: <IconSettings />,
    items: [
      { label: "Theme & Fonts", href: "/admin/manage-theme-settings", badge: "new" },
      { label: "Invoice & PDF Settings", href: "/admin/manage-pdf-settings" },
      { label: "Maintenance Mode", href: "/admin/manage-maintenance" },
      { label: "Recycle Bin", href: "/admin/manage-bin" },
    ],
  },
];

interface AdminLayoutProps { children: React.ReactNode; title?: string; }

const SCROLL_STORAGE_KEY = "admin_nav_scroll";
const EXPANDED_STORAGE_KEY = "admin_nav_expanded";

function routeIsWithin(path: string, href: string) {
  return path === href || path.startsWith(`${href}/`);
}

export default function AdminLayout({ children, title = "Admin Panel | DevEngine" }: AdminLayoutProps) {
  const router = useRouter();
  const profile = useAdminProfile();
  const { theme } = useTheme();
  const { authReady, isAuthorized, isStaff: isStaffUser } = useAdminOrStaffAuth(modulesForAdminRoute(router.pathname));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const [search, setSearch] = useState("");
  const [routing, setRouting] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const path = router.asPath.split(/[?#]/)[0];
  const activeItem = useMemo(() => {
    const items = NAV_GROUPS.flatMap(group => group.items);
    if (path.startsWith("/admin/app-lab/")) return items.find(item => item.href === "/admin/app-lab/manage");
    return items.sort((a, b) => b.href.length - a.href.length).find(item => routeIsWithin(path, item.href));
  }, [path]);
  const activeGroup = NAV_GROUPS.find(group => group.items.some(item => item.href === activeItem?.href));
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      try { const saved = sessionStorage.getItem(EXPANDED_STORAGE_KEY); if (saved) return new Set(JSON.parse(saved)); } catch {}
    }
    return new Set(["Overview"]);
  });
  const filteredGroups = useMemo(() => {
    const term = search.trim().toLowerCase();
    return NAV_GROUPS.map(group => ({ ...group, items: group.label.toLowerCase().includes(term) ? group.items : group.items.filter(item => item.label.toLowerCase().includes(term)) })).filter(group => group.items.length > 0);
  }, [search]);
  const saveGroups = (groups: Set<string>) => {
    setExpandedGroups(groups);
    try { sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...groups])); } catch {}
  };
  useEffect(() => {
    if (!activeGroup) return;
    setExpandedGroups(previous => {
      if (previous.has(activeGroup.label)) return previous;
      const next = new Set(previous).add(activeGroup.label);
      try { sessionStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [activeGroup?.label]);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 1099px)");
    const apply = () => { setIsMobile(media.matches); setSidebarOpen(!media.matches); };
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);
  useEffect(() => { if (isMobile) setSidebarOpen(false); setSearch(""); }, [router.pathname, isMobile]);
  useEffect(() => {
    if (!authReady || !isAuthorized || isStaffUser) return;
    const root = document.documentElement;
    root.setAttribute("data-admin-interface", "true");
    return () => root.removeAttribute("data-admin-interface");
  }, [authReady, isAuthorized, isStaffUser]);
  useEffect(() => {
    if (!authReady || !isAuthorized || isStaffUser) return;
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey || target?.closest('input,textarea,select,[contenteditable="true"],dialog')) return;
      event.preventDefault();
      setSidebarOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    };
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, [authReady, isAuthorized, isStaffUser]);
  useEffect(() => {
    const start = () => setRouting(true);
    const finish = () => setRouting(false);
    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", finish);
    router.events.on("routeChangeError", finish);
    return () => { router.events.off("routeChangeStart", start); router.events.off("routeChangeComplete", finish); router.events.off("routeChangeError", finish); };
  }, [router.events]);
  useEffect(() => {
    if (!sidebarOpen || !isMobile || isStaffUser) return;
    const overflow = document.body.style.overflow;
    const focus = document.activeElement;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setSidebarOpen(false); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled)') || []).filter(node => node.offsetParent !== null);
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); if (focus instanceof HTMLElement && focus.isConnected) focus.focus({ preventScroll: true }); };
  }, [sidebarOpen, isMobile, isStaffUser]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try { const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY); if (saved && navScrollRef.current) navScrollRef.current.scrollTop = Number(saved); } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, [router.pathname, authReady]);
  const rememberScroll = () => { try { if (navScrollRef.current) sessionStorage.setItem(SCROLL_STORAGE_KEY, String(navScrollRef.current.scrollTop)); } catch {} };
  const openSearch = () => { setSidebarOpen(true); requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true })); };
  const handleSignOut = async () => {
    await signOut(auth);
    if (isStaffUser) { localStorage.removeItem("isStaff"); localStorage.removeItem("staffUid"); router.push("/staff"); }
    else router.push("/login");
  };
  if (!authReady || !isAuthorized) return <div className={styles.loading}><HelixLoader size={44} color="#2cecf7" /></div>;
  if (isStaffUser) return <StaffLayout title={title}>{children}</StaffLayout>;
  return <>
    <Head><title>{title}</title><meta name="robots" content="noindex, nofollow" /></Head>
    <div className={styles.shell} data-nav-open={sidebarOpen}>
      <a className={styles.skipLink} href="#admin-main">Skip to content</a>
      {mounted && createPortal(<header className={`${styles.header} navbar admin-navbar`} inert={isMobile && sidebarOpen} aria-label="Admin toolbar">
        <div className={styles.headerCapsule} data-routing={routing || undefined}>
          <div className={styles.headerIdentity}>
            <button ref={menuRef} className={styles.iconButton} aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} aria-expanded={sidebarOpen} aria-controls="admin-navigation" onClick={() => setSidebarOpen(value => !value)}><span className="material-symbols-outlined" aria-hidden="true">{sidebarOpen ? "menu_open" : "menu"}</span></button>
            <Link href="/admin/dashboard" className={styles.logo} aria-label="DevEngine admin home"><Image src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"} alt="DevEngine" width={160} height={40} priority /><svg className={styles.logoMark} viewBox="0 0 32 36" fill="none" aria-hidden="true"><path d="M3 3 29 18 3 33V3Z" stroke="#2cecf7" strokeWidth="6" strokeLinejoin="round" /></svg></Link>
            <span className={styles.adminLabel}><i />Admin</span>
          </div>
          <div className={styles.breadcrumb}><span>{activeGroup?.label || "Workspace"}</span><span aria-hidden="true">/</span><strong>{activeItem?.label || "Studio administration"}</strong></div>
          <div className={styles.headerActions}>
            <button className={`${styles.iconButton} ${styles.searchToggle}`} onClick={openSearch} aria-label="Find an admin feature" title="Find a feature"><span className="material-symbols-outlined" aria-hidden="true">search</span></button>
            <CommunicationHeader /><HeaderControls />
            <a href="/" target="_blank" rel="noopener noreferrer" className={styles.publicLink}><span className="material-symbols-outlined" aria-hidden="true">north_east</span><span>Public view</span></a>
          </div>
        </div>
      </header>, document.body)}
      {sidebarOpen && isMobile && <button className={styles.backdrop} tabIndex={-1} aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <aside ref={drawerRef} id="admin-navigation" className={styles.drawer} aria-label="Admin navigation" role={isMobile ? "dialog" : undefined} aria-modal={isMobile && sidebarOpen ? true : undefined} aria-hidden={!sidebarOpen} inert={!sidebarOpen}>
        <div className={styles.drawerHeading}><div><p>CONTROL CENTER</p><strong>Your studio, in focus.</strong></div><button className={`${styles.iconButton} ${styles.drawerClose}`} aria-label="Close navigation" onClick={() => setSidebarOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
        <label className={styles.navSearch}><span className="material-symbols-outlined" aria-hidden="true">search</span><input ref={searchRef} data-admin-search className="transparent-input bg-transparent" type="search" value={search} onChange={event => setSearch(event.target.value)} aria-label="Search admin features" placeholder="Find a feature" /><kbd>/</kbd></label>
        <div className={styles.navCaption}><span>WORKSPACE</span><button onClick={() => saveGroups(new Set())} title="Collapse navigation groups">Collapse all</button></div>
        <div ref={navScrollRef} onScroll={rememberScroll} className={styles.navScroll}>
          <nav aria-label="Workspace features">{filteredGroups.map(group => {
            const expanded = !!search.trim() || expandedGroups.has(group.label);
            return <div className={styles.navGroup} key={group.label}>
              <button className={styles.groupToggle} aria-expanded={expanded} aria-controls={`admin-group-${group.moduleKey}`} onClick={() => { const next = new Set(expandedGroups); next.has(group.label) ? next.delete(group.label) : next.add(group.label); saveGroups(next); }}><span className={styles.groupIcon}>{group.icon}</span><span>{group.label}</span><svg className={styles.chevron} data-expanded={expanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m8 10 4 4 4-4" /></svg></button>
              <div id={`admin-group-${group.moduleKey}`} className={styles.groupItems} data-expanded={expanded} aria-hidden={!expanded} inert={!expanded}><div>{group.items.map(item => <Link key={item.href} href={item.href} onClick={rememberScroll} className={styles.navLink} data-active={item.href === activeItem?.href || undefined} aria-current={item.href === activeItem?.href ? "page" : undefined}><span>{item.label}</span>{item.href === activeItem?.href && <span className="material-symbols-outlined" aria-hidden="true">arrow_outward</span>}</Link>)}</div></div>
            </div>;
          })}</nav>
          {!filteredGroups.length && <div className={styles.navEmpty}><span className="material-symbols-outlined" aria-hidden="true">search_off</span><p>No matching features.</p><button onClick={() => setSearch("")}>Clear search</button></div>}
        </div>
        <div className={styles.drawerFooter}><Link href="/admin/profile" className={styles.account} aria-label={`View and edit ${profile.name}'s profile`} aria-current={router.pathname === "/admin/profile" ? "page" : undefined} onClick={() => setSidebarOpen(false)}><img src={profile.avatarUrl || "/assets/CEO.png"} alt="" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/assets/CEO.png"; }} /><div><strong>{profile.name}</strong><span>View &amp; edit profile</span></div><span className={styles.presence} aria-label="Signed in" /><svg className={styles.accountArrow} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m10 8 4 4-4 4" /></svg></Link><div className={styles.footerActions}><a href="/" target="_blank" rel="noopener noreferrer"><span className="material-symbols-outlined" aria-hidden="true">language</span>Public view</a><button className={styles.signOut} onClick={handleSignOut}><span className="material-symbols-outlined" aria-hidden="true">logout</span>Sign out</button></div></div>
      </aside>
      <div className={styles.workspace}>
        <div className={styles.main}>
          <main id="admin-main" className={styles.pageBody} tabIndex={-1}>
            <div className={styles.content}>
              {path !== "/admin/dashboard" && path !== "/admin" && <nav className={styles.backRow} aria-label="Page navigation">
                <button type="button" disabled={routing} onClick={() => { if (window.history.length > 1) router.back(); else void router.replace("/admin/dashboard"); }}><span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>Back</button>
                <span className={styles.backDivider} aria-hidden="true" />
                <Link href="/admin/dashboard">Dashboard</Link>
                <span className={styles.backSection}>{activeItem?.label || activeGroup?.label || "Studio workspace"}</span>
              </nav>}
              <div className="admin-content" data-admin-content><div data-admin-route>{children}</div></div>
            </div>
          </main>
          <div className={styles.pageFooter}><LandingFooter /></div>
        </div>
      </div>
    </div>
  </>;
}
