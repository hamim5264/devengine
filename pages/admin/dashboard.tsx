import AdminOverview from "@/components/admin/AdminOverview";
import { AdminDateInput } from "@/components/admin/AdminFormControls";
import { CommunicationDashboard } from "@/components/communication/CommunicationEntry";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/router";
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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setCount(target); return; }
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
    const unsub = onAdminPageAccess(router, async (user) => {
      setIsAdmin(true);
      setAuthReady(true);
    }, () => {
      setIsAdmin(false);
      setAuthReady(false);
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
        <HelixLoader size={48} color="#2cecf7" />
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout title="Dashboard | DevEngine Admin">
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)]">
          <div className="flex flex-col items-center gap-4">
            <HelixLoader size={48} color="#2cecf7" />
            <p className="text-xs text-gray-400 font-medium tracking-wide">
              Loading platform analytics...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return <AdminLayout title="Studio Overview | DevEngine Admin">
    <Head><title>Studio Overview | DevEngine Admin</title></Head>
    <AdminOverview
      orders={filteredOrders.map(order => ({ ...order, date: parseTimestamp(order.createdAt)?.toISOString() || null }))}
      revenue={totalBdtRevenue} usdRevenue={totalUsdRevenue} analytics={analytics}
      inventory={[
        { title: "Catalog projects", count: filteredProjects.length, total: rawProjects.length, icon: "folder", href: "/admin/manage-projects" },
        { title: "Services", count: filteredServices.length, total: rawServices.length, icon: "devices", href: "/admin/manage-services" },
        { title: "Lab projects", count: filteredLabProjects.length, total: rawLabProjects.length, icon: "science", href: "/admin/manage-lab" },
        { title: "Client reviews", count: filteredReviews.length, total: rawReviews.length, icon: "star", href: "/admin/manage-reviews" },
        { title: "Careers", count: filteredCareers.length, total: rawCareers.length, icon: "work", href: "/admin/manage-careers" },
      ]}
      activities={employeeActivities.map(activity => ({ id: activity.id, name: activity.staffName, action: activity.action, details: activity.details, time: formatRelativeTime(activity.rawTime) }))}
      events={recentActivities.map(event => ({ id: event.id, title: event.title, description: event.description, time: formatRelativeTime(event.timestamp) }))}
      period={filterMode} setPeriod={setFilterMode} periodLabel={activeFilterLabel}
      date={specificDate} setDate={setSpecificDate} month={specificMonth} setMonth={setSpecificMonth}
      start={rangeStart} setStart={setRangeStart} end={rangeEnd} setEnd={setRangeEnd}
      refreshing={isRefreshing} refreshedAt={lastRefreshed} refresh={handleManualRefresh}
      syncing={syncingAll} sync={handleSyncAllData} progress={syncProgress} notice={syncNotice}
    />
  </AdminLayout>;
}
