import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
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

  // Metrics state
  const [totalProjects, setTotalProjects] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalTags, setTotalTags] = useState(0);
  const [totalBlogPosts, setTotalBlogPosts] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [totalCareers, setTotalCareers] = useState(0);
  const [totalLabProjects, setTotalLabProjects] = useState(0);
  const [totalServices, setTotalServices] = useState(0);

  // Visitors & Analytics
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalViews: 0,
    todayViews: 0,
    uniqueVisitors: 0,
    todayDate: "",
  });

  // Recent data
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

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
      ]);

      setTotalProjects(projSnap.size);
      setTotalTags(tagSnap.size);
      setTotalBlogPosts(blogSnap.size);
      setTotalReviews(reviewSnap.size);
      setTotalCareers(careerSnap.size);
      setTotalLabProjects(labSnap.size);
      setTotalServices(servSnap.size);
      setAnalytics(analyticsData);
      setRecentActivities(activityList);

      let revenue = 0;
      const orders: OrderRow[] = orderSnap.docs.map((d) => {
        const data = d.data() as any;
        revenue += Number(data.amountUSD ?? data.amount ?? 0);
        return {
          id: d.id,
          buyerName: data.buyerName ?? data.fullName ?? "—",
          buyerEmail: data.buyerEmail ?? data.email ?? "—",
          projectTitle: data.projectTitle ?? data.productName ?? "—",
          amount: Number(data.amountUSD ?? data.amount ?? 0),
          currency: data.currency ?? "USD",
          status: data.status ?? "pending",
          createdAt: data.createdAt,
        };
      });

      setTotalOrders(orderSnap.size);
      setTotalRevenue(Math.round(revenue));

      const sorted = orders.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });
      setRecentOrders(sorted.slice(0, 6));
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && isAdmin) {
      loadDashboardData();
    }
  }, [authReady, isAdmin]);

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
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 space-y-7">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                System Overview
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Executive Dashboard
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Real-time platform traffic, commercial orders, and content metrics.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-400">
              <span className="material-symbols-outlined text-[15px] text-gray-500">
                calendar_today
              </span>
              <span>{formattedDate}</span>
            </div>

            <button
              onClick={loadDashboardData}
              title="Refresh Analytics"
              className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                refresh
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

        {/* ── SYNC ALERT (IF ANY) ── */}
        {syncNotice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
              syncNotice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {syncNotice.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{syncNotice.message}</span>
            </div>
            <button
              onClick={() => setSyncNotice(null)}
              className="text-gray-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── DATABASE STATUS & SYNC CONTROL (CLEAN & MINIMAL) ── */}
        <div className="rounded-xl p-4 bg-[#0d0d1a]/80 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <span className="material-symbols-outlined text-[18px]">
                dns
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  Database Synchronized
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-medium">
                  21 Modules Active
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                All public lab projects, services, catalog items, and team profiles are live in Firestore.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSyncAllData}
              disabled={syncingAll}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-gray-200 hover:text-white font-medium text-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px] text-teal-400">
                {syncingAll ? "sync" : "cloud_sync"}
              </span>
              <span>{syncingAll ? "Syncing..." : "Re-sync Database"}</span>
            </button>
            <button
              onClick={() => setShowSyncDetails(!showSyncDetails)}
              className="px-2.5 py-1.5 rounded-lg text-gray-400 hover:text-gray-200 text-xs transition"
            >
              {showSyncDetails ? "Hide" : "Details"}
            </button>
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
                {totalLabProjects} Live
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Services
              </span>
              <span className="text-white font-semibold text-sm">
                {totalServices} Active
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Catalog Projects
              </span>
              <span className="text-white font-semibold text-sm">
                {totalProjects} Live
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Client Reviews
              </span>
              <span className="text-white font-semibold text-sm">
                {totalReviews} Approved
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.04]">
              <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                Active Careers
              </span>
              <span className="text-white font-semibold text-sm">
                {totalCareers} Circular
              </span>
            </div>
          </div>
        )}

        {/* ── PRIMARY KPIS & TRAFFIC ANALYTICS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Revenue (USD)
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    payments
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 flex items-baseline text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <span className="text-2xl sm:text-3xl font-bold text-gray-500 mr-0.5">$</span>
                <AnimatedCounter target={totalRevenue} />
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-emerald-400 font-semibold">
                {totalOrders} Orders
              </span>
              <span className="text-gray-500">
                Verified transactions
              </span>
            </div>
          </div>

          {/* Today's Visitors (Requested by user) */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-teal-400/30 transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Today&apos;s Views
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
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
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Total Visitors
                </span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
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
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Catalog Projects
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    folder
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <AnimatedCounter target={totalProjects} />
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-blue-400 font-semibold">{totalTags} Tags</span>
              <span className="text-gray-500">Public archive store</span>
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
                  {totalLabProjects}
                </span>
                <span className="text-[10px] text-teal-400/90 font-medium ml-1.5">
                  Active
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
                  {totalServices}
                </span>
                <span className="text-[10px] text-blue-400/90 font-medium ml-1.5">
                  Available
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
                  {totalReviews}
                </span>
                <span className="text-[10px] text-amber-400/90 font-medium ml-1.5">
                  Ratings
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
                  {totalCareers}
                </span>
                <span className="text-[10px] text-violet-400/90 font-medium ml-1.5">
                  Circular
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
                  Latest customer orders and license acquisitions
                </p>
              </div>
              <Link
                href="/admin/manage-orders"
                className="text-xs text-teal-400 hover:text-teal-300 font-medium transition"
              >
                View all →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs">
                No orders recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-4 py-3">Project</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {recentOrders.map((o) => (
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
                        <td className="px-4 py-3.5 font-bold text-teal-300">
                          ${o.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activities Timeline (5 cols - Requested by User) */}
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