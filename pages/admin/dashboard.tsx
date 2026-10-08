import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { seedAllUserSideData } from "@/lib/services/masterSeedService";
import {
  getSiteAnalytics,
  getRecentActivities,
  AnalyticsSummary,
  ActivityLog,
} from "@/lib/services/analyticsService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

// Exchange rate constant: 1 USD ≈ 120 BDT
const USD_TO_BDT_RATE = 120;

export interface EmployeeActivityItem {
  id: string;
  staffName: string;
  type: "punch_in" | "punch_out" | "break" | "work_update" | "task";
  action: string;
  details: string;
  rawTime: any;
}

interface OrderRow {
  id: string;
  buyerName: string;
  buyerEmail: string;
  projectTitle: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: any;
}

interface ItemRecord {
  id: string;
  createdAt?: any;
}

type FilterMode = "all" | "today" | "date" | "month" | "range";

function parseTimestamp(raw: any): Date | null {
  if (!raw) return null;
  if (typeof raw.toDate === "function") return raw.toDate();
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (typeof raw === "number") return new Date(raw);
  if (typeof raw === "string") {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }
  if (raw.seconds) return new Date(raw.seconds * 1000);
  return null;
}

function parseOrderAmount(rawAmount: any): number {
  if (typeof rawAmount === "number") return isNaN(rawAmount) ? 0 : rawAmount;
  if (!rawAmount) return 0;
  const cleaned = String(rawAmount).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function isDateInRange(
  dateVal: any,
  mode: FilterMode,
  specificDate: string,
  specificMonth: string,
  rangeStart: string,
  rangeEnd: string
): boolean {
  if (mode === "all") return true;
  const d = parseTimestamp(dateVal);
  if (!d) return false;

  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  const dateStr = `${year}-${month}-${day}`;
  const monthStr = `${year}-${month}`;

  if (mode === "today") {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return dateStr === todayStr;
  }

  if (mode === "date") {
    return dateStr === specificDate;
  }

  if (mode === "month") {
    return monthStr === specificMonth;
  }

  if (mode === "range") {
    if (!rangeStart && !rangeEnd) return true;
    if (rangeStart && !rangeEnd) return dateStr >= rangeStart;
    if (!rangeStart && rangeEnd) return dateStr <= rangeEnd;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  }

  return true;
}

function AnimatedCounter({
  target,
  duration = 1000,
}: {
  target: number;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{count.toLocaleString("en-US")}</>;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toLowerCase() || "pending";
  if (normalized === "verified" || normalized === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Verified
      </span>
    );
  }
  if (normalized === "rejected" || normalized === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
      Pending Verification
    </span>
  );
}

function formatRelativeTime(dateInput: any): string {
  if (!dateInput) return "Recently";
  const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Raw data records from Firestore
  const [rawOrders, setRawOrders] = useState<OrderRow[]>([]);
  const [rawProjects, setRawProjects] = useState<ItemRecord[]>([]);
  const [rawTagsCount, setRawTagsCount] = useState(0);
  const [rawReviews, setRawReviews] = useState<ItemRecord[]>([]);
  const [rawCareers, setRawCareers] = useState<ItemRecord[]>([]);
  const [rawLabProjects, setRawLabProjects] = useState<ItemRecord[]>([]);
  const [rawServices, setRawServices] = useState<ItemRecord[]>([]);

  // Visitors & Analytics
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalViews: 0,
    todayViews: 0,
    uniqueVisitors: 0,
    todayDate: "",
  });

  // Recent activities
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  // Filter state
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = new Date();
  const defaultDateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const defaultMonthStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [specificDate, setSpecificDate] = useState<string>(defaultDateStr);
  const [specificMonth, setSpecificMonth] = useState<string>(defaultMonthStr);
  const [rangeStart, setRangeStart] = useState<string>(defaultDateStr);
  const [rangeEnd, setRangeEnd] = useState<string>(defaultDateStr);

  // Employee Activities State
  const [employeeActivities, setEmployeeActivities] = useState<EmployeeActivityItem[]>([]);

  // Master sync panel state
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{
    step: string;
    current: number;
    total: number;
  } | null>(null);
  const [syncNotice, setSyncNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showSyncDetails, setShowSyncDetails] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      const [
        projSnap,
        tagSnap,
        orderSnap,
        blogSnap,
        reviewSnap,
        careerSnap,
        labSnap,
        servSnap,
        analyticsData,
        activityList,
        attSnap,
        workSnap,
        taskSnap,
      ] = await Promise.all([
        getDocs(collection(db, "projects")),
        getDocs(collection(db, "tags")),
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "blogs")),
        getDocs(collection(db, "reviews")),
        getDocs(collection(db, "job_circulars")),
        getDocs(collection(db, "lab_projects")),
        getDocs(collection(db, "services")),
        getSiteAnalytics(),
        getRecentActivities(7),
        getDocs(query(collection(db, "staff_attendance"), limit(12))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, "staff_work_updates"), limit(12))).catch(() => ({ docs: [] } as any)),
        getDocs(query(collection(db, "employee_tasks"), limit(12))).catch(() => ({ docs: [] } as any)),
      ]);

      setRawTagsCount(tagSnap.size);
      setAnalytics(analyticsData);
      setRecentActivities(activityList);

      // Map Employee Activities
      const empLogs: EmployeeActivityItem[] = [];

      attSnap.docs.forEach((d: any) => {
        const data = d.data();
        if (data.clockOutTime) {
          empLogs.push({
            id: `att-out-${d.id}`,
            staffName: data.staffName || "Employee",
            type: "punch_out",
            action: "Shift Concluded",
            details: `Logged out at ${data.clockOutTime} (${data.netWorkHours || data.totalHours || 0} hrs net work)`,
            rawTime: data.updatedAt || data.createdAt,
          });
        } else if (data.clockInTime) {
          empLogs.push({
            id: `att-in-${d.id}`,
            staffName: data.staffName || "Employee",
            type: "punch_in",
            action: "Checked In",
            details: `Shift check-in at ${data.clockInTime} for date ${data.date || "today"}`,
            rawTime: data.createdAt,
          });
        }
      });

      workSnap.docs.forEach((d: any) => {
        const data = d.data();
        empLogs.push({
          id: `work-${d.id}`,
          staffName: data.staffName || "Employee",
          type: "work_update",
          action: "Daily Work Report",
          details: `${data.tasksCompleted?.slice(0, 90) || "Engineering tasks logged"} (${data.hoursWorked || 8} hrs)`,
          rawTime: data.createdAt || data.date,
        });
      });

      taskSnap.docs.forEach((d: any) => {
        const data = d.data();
        empLogs.push({
          id: `task-${d.id}`,
          staffName: data.assignedToName || "Employee",
          type: "task",
          action: `Sprint: ${data.status ? data.status.replace("_", " ").toUpperCase() : "PROGRESS"}`,
          details: `${data.title} (${data.progressPercent || 0}% completed)`,
          rawTime: data.updatedAt || data.createdAt,
        });
      });

      empLogs.sort((a, b) => {
        const tA = parseTimestamp(a.rawTime)?.getTime() || 0;
        const tB = parseTimestamp(b.rawTime)?.getTime() || 0;
        return tB - tA;
      });

      setEmployeeActivities(empLogs.slice(0, 8));

      // Projects
      const projs: ItemRecord[] = projSnap.docs.map((d) => ({
        id: d.id,
        createdAt: (d.data() as any).createdAt,
      }));
      setRawProjects(projs);

      // Reviews
      const revs: ItemRecord[] = reviewSnap.docs.map((d) => ({
        id: d.id,
        createdAt: (d.data() as any).createdAt,
      }));
      setRawReviews(revs);

      // Careers
      const careers: ItemRecord[] = careerSnap.docs.map((d) => ({
        id: d.id,
        createdAt: (d.data() as any).createdAt,
      }));
      setRawCareers(careers);

      // Lab projects
      const labs: ItemRecord[] = labSnap.docs.map((d) => ({
        id: d.id,
        createdAt: (d.data() as any).createdAt,
      }));
      setRawLabProjects(labs);

      // Services
      const servs: ItemRecord[] = servSnap.docs.map((d) => ({
        id: d.id,
        createdAt: (d.data() as any).createdAt,
      }));
      setRawServices(servs);

      // Orders
      const orders: OrderRow[] = orderSnap.docs.map((d) => {
        const data = d.data() as any;
        const amt = parseOrderAmount(data.amount ?? data.amountUSD ?? 0);
        return {
          id: d.id,
          buyerName: data.customerName ?? data.buyerName ?? data.fullName ?? "—",
          buyerEmail: data.customerEmail ?? data.buyerEmail ?? data.email ?? "—",
          projectTitle: data.projectTitle ?? data.productName ?? "—",
          amount: amt,
          currency: (data.currency ?? "BDT").toUpperCase(),
          status: data.status ?? "pending",
          createdAt: data.createdAt,
        };
      });

      setRawOrders(orders);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (authReady && isAdmin) {
      loadDashboardData();
    }
  }, [authReady, isAdmin]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
  };

  // Filtered computations
  const filteredOrders = useMemo(() => {
    return rawOrders.filter((o) =>
      isDateInRange(o.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawOrders, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const filteredProjects = useMemo(() => {
    if (filterMode === "all") return rawProjects;
    return rawProjects.filter((p) =>
      isDateInRange(p.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawProjects, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const filteredReviews = useMemo(() => {
    if (filterMode === "all") return rawReviews;
    return rawReviews.filter((r) =>
      isDateInRange(r.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawReviews, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const filteredCareers = useMemo(() => {
    if (filterMode === "all") return rawCareers;
    return rawCareers.filter((c) =>
      isDateInRange(c.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawCareers, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const filteredLabProjects = useMemo(() => {
    if (filterMode === "all") return rawLabProjects;
    return rawLabProjects.filter((l) =>
      isDateInRange(l.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawLabProjects, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const filteredServices = useMemo(() => {
    if (filterMode === "all") return rawServices;
    return rawServices.filter((s) =>
      isDateInRange(s.createdAt, filterMode, specificDate, specificMonth, rangeStart, rangeEnd)
    );
  }, [rawServices, filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  // Compute total Revenue in BDT (Base) and USD (Converted)
  const { totalBdtRevenue, totalUsdRevenue } = useMemo(() => {
    let bdtSum = 0;
    let usdSum = 0;

    for (const order of filteredOrders) {
      if (order.currency === "USD") {
        usdSum += order.amount;
        bdtSum += order.amount * USD_TO_BDT_RATE;
      } else {
        // Base BDT
        bdtSum += order.amount;
        usdSum += order.amount / USD_TO_BDT_RATE;
      }
    }

    return {
      totalBdtRevenue: Math.round(bdtSum),
      totalUsdRevenue: Math.round(usdSum * 100) / 100,
    };
  }, [filteredOrders]);

  // Recent transactions to display (sorted descending)
  const recentOrdersToDisplay = useMemo(() => {
    const list = [...filteredOrders].sort((a, b) => {
      const ta = parseTimestamp(a.createdAt)?.getTime() ?? 0;
      const tb = parseTimestamp(b.createdAt)?.getTime() ?? 0;
      return tb - ta;
    });
    return list.slice(0, 8);
  }, [filteredOrders]);

  // Active filter label string
  const activeFilterLabel = useMemo(() => {
    if (filterMode === "all") return "All Time";
    if (filterMode === "today") return "Today";
    if (filterMode === "date") {
      try {
        const [y, m, d] = specificDate.split("-");
        const dt = new Date(Number(y), Number(m) - 1, Number(d));
        return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      } catch {
        return specificDate;
      }
    }
    if (filterMode === "month") {
      try {
        const [y, m] = specificMonth.split("-");
        const dt = new Date(Number(y), Number(m) - 1, 1);
        return dt.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } catch {
        return specificMonth;
      }
    }
    if (filterMode === "range") {
      return `${rangeStart} to ${rangeEnd}`;
    }
    return "Custom Filter";
  }, [filterMode, specificDate, specificMonth, rangeStart, rangeEnd]);

  const handleSyncAllData = async () => {
    if (
      !confirm(
        "MASTER DATABASE SYNC:\n\nThis will synchronize or restore all 21 user-side data modules into Firestore.\nExisting records will be safely updated in place. Proceed?"
      )
    ) {
      return;
    }

    setSyncingAll(true);
    setSyncNotice(null);
    try {
      const res = await seedAllUserSideData(
        (step: string, current: number, total: number) => {
          setSyncProgress({ step, current, total });
        }
      );
      setSyncNotice({
        type: "success",
        message: `Database synchronized! Verified ${res.successCount} of ${res.totalModules} modules.`,
      });
      await loadDashboardData();
    } catch (err: any) {
      console.error("Sync all data failed:", err);
      setSyncNotice({
        type: "error",
        message: "Failed to synchronize: " + (err?.message || "Unknown error"),
      });
    } finally {
      setSyncingAll(false);
      setSyncProgress(null);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={48} color="#14b8a6" />
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard | DevEngine Admin">
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
          <div className="flex flex-col items-center gap-4">
            <HelixLoader size={48} color="#14b8a6" />
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              Loading platform analytics...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const now = new Date();
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <AdminLayout title="Dashboard | DevEngine Admin">
      <Head>
        <title>Executive Dashboard | DevEngine Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-7">
        {/* ── STREAMLINED EXECUTIVE HEADER & LIVE CONTROLS ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Executive Dashboard
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-mono border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Operational
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Real-time commercial revenue, visitor metrics, and active employee operations.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Live date badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-400 font-mono">
              <span className="material-symbols-outlined text-[15px] text-gray-500">
                calendar_today
              </span>
              <span>{formattedDate}</span>
            </div>

            {/* Refresh Button with full feedback & animation */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              title={`Last updated: ${lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Click to reload data.`}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[17px] text-teal-400 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span className="text-xs font-medium">
                {isRefreshing ? "Updating..." : "Refresh"}
              </span>
            </button>

            <Link
              href="/admin/manage-orders"
              className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-semibold text-gray-200 hover:text-white transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">
                shopping_bag
              </span>
              <span>Orders</span>
            </Link>

            <Link
              href="/admin/add-project"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-xs font-bold text-slate-950 transition flex items-center gap-1.5 shadow-lg shadow-teal-500/10"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Project</span>
            </Link>
          </div>
        </div>

        {/* ── SLEEK TIMEFRAME FILTER TOOLBAR (ZERO CLUTTER) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#0c0c17] border border-white/[0.08] shadow-lg">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider px-2 hidden sm:inline">
              Filter:
            </span>

            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "all"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">all_inclusive</span>
              <span>All Time</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("today")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "today"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">today</span>
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("date")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "date"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">event</span>
              <span>By Date</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("month")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "month"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              <span>By Month</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMode("range")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                filterMode === "range"
                  ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20 font-bold"
                  : "bg-white/[0.03] text-gray-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">date_range</span>
              <span>Specific Range</span>
            </button>

            {/* Dynamic Controls based on selected mode */}
            {filterMode === "date" && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="h-8 bg-black/60 border border-teal-500/50 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-teal-400 font-mono ml-1"
              />
            )}

            {filterMode === "month" && (
              <input
                type="month"
                value={specificMonth}
                onChange={(e) => setSpecificMonth(e.target.value)}
                className="h-8 bg-black/60 border border-teal-500/50 rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-teal-400 font-mono ml-1"
              />
            )}

            {filterMode === "range" && (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="h-8 bg-black/60 border border-teal-500/50 rounded-xl px-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                />
                <span className="text-gray-500 text-xs font-mono">→</span>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="h-8 bg-black/60 border border-teal-500/50 rounded-xl px-2 text-xs text-white focus:outline-none focus:border-teal-400 font-mono"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20">
              Active: {activeFilterLabel}
            </span>
            {filterMode !== "all" && (
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-[11px] text-gray-400 hover:text-white transition px-2 py-0.5 rounded cursor-pointer"
                title="Reset to All Time"
              >
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        {/* Real-time sync progress bar if running */}
        {syncingAll && syncProgress && (
          <div className="p-3.5 rounded-xl bg-teal-500/5 border border-teal-500/20 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-teal-300">
              <span>Synchronizing: {syncProgress.step}</span>
              <span>
                {syncProgress.current} / {syncProgress.total} modules
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-400 transition-all duration-300"
                style={{
                  width: `${(syncProgress.current / syncProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Collapsible sync details */}
        {showSyncDetails && (
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs text-gray-300">
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Lab Projects
              </span>
              <span className="text-white font-semibold text-sm">
                {rawLabProjects.length} Live
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Services
              </span>
              <span className="text-white font-semibold text-sm">
                {rawServices.length} Active
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Catalog Projects
              </span>
              <span className="text-white font-semibold text-sm">
                {rawProjects.length} Live
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Client Reviews
              </span>
              <span className="text-white font-semibold text-sm">
                {rawReviews.length} Approved
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Active Careers
              </span>
              <span className="text-white font-semibold text-sm">
                {rawCareers.length} Circular
              </span>
            </div>
          </div>
        )}

        {/* ── PRIMARY KPIS & TRAFFIC ANALYTICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue: Prominent BDT value with small Dollar (USD) conversion */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 block">
                    Total Revenue
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">
                    BDT Base (৳)
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    payments
                  </span>
                </div>
              </div>

              {/* Main Prominent BDT Amount */}
              <div className="my-2.5 sm:my-3 flex items-baseline text-2xl sm:text-3xl lg:text-[38px] font-black text-white tracking-tight leading-none">
                <span className="text-xl sm:text-2xl font-bold text-emerald-400 mr-1">৳</span>
                <AnimatedCounter target={totalBdtRevenue} />
              </div>

              {/* Small Dollar Value */}
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-gray-400 font-mono uppercase">USD Value:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-mono font-bold text-xs">
                  ${totalUsdRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-emerald-400 font-semibold">
                {filteredOrders.length} {filteredOrders.length === 1 ? "Order" : "Orders"}
              </span>
              <span className="text-gray-500">
                {filterMode === "all" ? "Verified transactions" : "Filtered period"}
              </span>
            </div>
          </div>

          {/* Today's Visitors / Filtered Period Traffic */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-teal-400/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 block">
                    {filterMode === "today" || filterMode === "all" ? "Today's Views" : "Live Traffic"}
                  </span>
                  <span className="text-[9px] text-teal-400 font-mono">
                    {filterMode === "all" ? "Active 24h" : activeFilterLabel}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    today
                  </span>
                </div>
              </div>

              <div className="my-3 sm:my-3.5 flex items-center gap-2.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <AnimatedCounter target={analytics.todayViews} />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-teal-400 font-semibold">Live Traffic</span>
              <span className="text-gray-500">Updated on visit</span>
            </div>
          </div>

          {/* Total Visitors / Page Views */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-cyan-400/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 block">
                    Total Visitors
                  </span>
                  <span className="text-[9px] text-cyan-400 font-mono">
                    All-time Platform
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    visibility
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <AnimatedCounter target={analytics.totalViews} />
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-cyan-400 font-semibold">
                {analytics.uniqueVisitors} Unique
              </span>
              <span className="text-gray-500">All-time pageviews</span>
            </div>
          </div>

          {/* Catalog Projects */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-blue-400/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400 block">
                    Catalog Projects
                  </span>
                  <span className="text-[9px] text-blue-400 font-mono">
                    {filterMode === "all" ? "Live Catalog" : "Period / Total"}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">
                    folder
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <AnimatedCounter
                  target={filterMode === "all" ? rawProjects.length : filteredProjects.length}
                />
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-blue-400 font-semibold">
                {rawTagsCount} Tags
              </span>
              <span className="text-gray-500">
                {filterMode === "all" ? "Public archive store" : `Total: ${rawProjects.length} live`}
              </span>
            </div>
          </div>
        </div>

        {/* ── SECONDARY MINI METRICS STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            href="/admin/manage-lab"
            className="rounded-xl p-3 sm:p-3.5 bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] transition flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-teal-400/10 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">
                science
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider block mb-0.5">
                Lab Experiments
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  {filterMode === "all" ? rawLabProjects.length : filteredLabProjects.length}
                </span>
                <span className="text-[10px] text-teal-400/90 font-medium ml-1.5">
                  {filterMode === "all" ? "Active" : `of ${rawLabProjects.length}`}
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/manage-services"
            className="rounded-xl p-3 sm:p-3.5 bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] transition flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-400/10 text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">
                devices
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider block mb-0.5">
                Services
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  {filterMode === "all" ? rawServices.length : filteredServices.length}
                </span>
                <span className="text-[10px] text-blue-400/90 font-medium ml-1.5">
                  {filterMode === "all" ? "Available" : `of ${rawServices.length}`}
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/manage-reviews"
            className="rounded-xl p-3 sm:p-3.5 bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] transition flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">
                star
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider block mb-0.5">
                Reviews
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  {filterMode === "all" ? rawReviews.length : filteredReviews.length}
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium ml-1.5">
                  {filterMode === "all" ? "Ratings" : `of ${rawReviews.length}`}
                </span>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/manage-careers"
            className="rounded-xl p-3 sm:p-3.5 bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.06] transition flex items-center gap-3 group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-400/10 text-violet-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[18px]">
                work
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-gray-400 uppercase font-semibold tracking-wider block mb-0.5">
                Career Openings
              </span>
              <div className="flex items-baseline">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                  {filterMode === "all" ? rawCareers.length : filteredCareers.length}
                </span>
                <span className="text-[10px] text-violet-400/90 font-medium ml-1.5">
                  {filterMode === "all" ? "Circular" : `of ${rawCareers.length}`}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* ── 2-COLUMN SECTION: RECENT ORDERS (LEFT) & RECENT ACTIVITIES (RIGHT) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Orders Table (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl bg-[#0c0c16] border border-white/[0.07] overflow-hidden flex flex-col">
            <div className="p-4 sm:px-6 sm:py-4.5 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Recent Commercial Transactions
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {filterMode === "all"
                    ? "Latest customer orders and license acquisitions"
                    : `Filtered by: ${activeFilterLabel} (${filteredOrders.length} total)`}
                </p>
              </div>
              <Link
                href="/admin/manage-orders"
                className="text-xs text-teal-400 hover:text-teal-300 font-medium transition"
              >
                View all →
              </Link>
            </div>

            {recentOrdersToDisplay.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No orders recorded for the selected period ({activeFilterLabel}).
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Amount (BDT / USD)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {recentOrdersToDisplay.map((o) => {
                      const isUsd = o.currency === "USD";
                      const bdtVal = isUsd ? Math.round(o.amount * USD_TO_BDT_RATE) : o.amount;
                      const usdVal = isUsd ? o.amount : Math.round((o.amount / USD_TO_BDT_RATE) * 100) / 100;

                      return (
                        <tr
                          key={o.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-white truncate max-w-[140px]">
                              {o.buyerName}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-[140px]">
                              {o.buyerEmail}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-300 font-medium truncate max-w-[150px]">
                            {o.projectTitle}
                          </td>
                          {/* Amount with prominent BDT and small USD */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-teal-300">
                              ৳{bdtVal.toLocaleString("en-US")}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                              ≈ ${usdVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={o.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right text-[11px] text-gray-400 whitespace-nowrap">
                            {o.createdAt?.toDate
                              ? o.createdAt
                                  .toDate()
                                  .toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activities Timeline (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-[#0c0c16] border border-white/[0.07] p-5 flex flex-col">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Recent Activities
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Live audit log & platform events
                </p>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div className="space-y-4 flex-1">
              {recentActivities.map((act, i) => {
                let iconColor = "text-teal-400 bg-teal-400/10";
                if (act.type === "order") iconColor = "text-emerald-400 bg-emerald-400/10";
                if (act.type === "project") iconColor = "text-blue-400 bg-blue-400/10";
                if (act.type === "visit") iconColor = "text-cyan-400 bg-cyan-400/10";

                return (
                  <div key={act.id || i} className="flex items-start gap-3 text-xs">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {act.icon || "notifications"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-white truncate">
                          {act.title}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
                        {act.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── EMPLOYEE OPERATIONS & ACTIVITY STREAM (NEW REQUESTED FEATURE) ── */}
        <div className="rounded-2xl bg-[#0c0c16] border border-white/[0.07] overflow-hidden shadow-xl">
          <div className="p-4 sm:px-6 sm:py-4.5 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">badge</span>
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span>Employee Team Operations & Live Activity</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Real-time punches, breaks, daily work update submissions, and sprint deliverables
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <Link
                href="/admin/manage-attendance"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition flex items-center gap-1"
              >
                <span>Attendance Roster</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <span className="text-gray-600">•</span>
              <Link
                href="/admin/manage-staff"
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition flex items-center gap-1"
              >
                <span>Manage Employees</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
            </div>
          </div>

          {employeeActivities.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 font-mono">
              No employee activities logged today. Punches, breaks, and task updates will populate here automatically.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {employeeActivities.map((act) => {
                const isPunchIn = act.type === "punch_in";
                const isPunchOut = act.type === "punch_out";
                const isWork = act.type === "work_update";
                const isTask = act.type === "task";

                const badgeBg = isPunchIn
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : isPunchOut
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : isWork
                  ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                  : "bg-purple-500/10 text-purple-400 border-purple-500/20";

                const iconName = isPunchIn
                  ? "login"
                  : isPunchOut
                  ? "logout"
                  : isWork
                  ? "edit_note"
                  : "task_alt";

                return (
                  <div
                    key={act.id}
                    className="p-4 sm:px-6 hover:bg-white/[0.02] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {act.staffName.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">
                            {act.staffName}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${badgeBg}`}
                          >
                            <span className="material-symbols-outlined text-[12px]">{iconName}</span>
                            <span>{act.action}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-xl font-mono">
                          {act.details}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-500 font-mono whitespace-nowrap shrink-0">
                      {formatRelativeTime(act.rawTime)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── QUICK DIRECTORY / SYSTEM HUB ── */}
        <div className="rounded-2xl bg-[#0c0c16] border border-white/[0.07] p-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.06] mb-4">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                CMS Quick Access
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Direct shortcuts to configure content and system modules
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {[
              { label: "Lab Projects", href: "/admin/manage-lab", icon: "science" },
              { label: "Launchpad", href: "/admin/manage-launchpad", icon: "rocket_launch" },
              { label: "Services", href: "/admin/manage-services", icon: "devices" },
              { label: "Projects Catalog", href: "/admin/manage-projects", icon: "folder" },
              { label: "Client Reviews", href: "/admin/manage-reviews", icon: "star" },
              { label: "About & Team", href: "/admin/manage-about", icon: "groups" },
              { label: "Blog & Stories", href: "/admin/manage-blog", icon: "edit_note" },
              { label: "Careers", href: "/admin/manage-careers", icon: "work" },
              { label: "Landing CMS", href: "/admin/manage-landing", icon: "view_quilt" },
              { label: "Archive Config", href: "/admin/manage-archive", icon: "inventory_2" },
              { label: "Social Links", href: "/admin/manage-socials", icon: "share" },
              { label: "Network Hubs", href: "/admin/manage-network", icon: "hub" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.05] hover:border-white/[0.12] transition flex items-center gap-2.5 text-xs text-gray-300 hover:text-white"
              >
                <span className="material-symbols-outlined text-[17px] text-teal-400">
                  {link.icon}
                </span>
                <span className="truncate font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}