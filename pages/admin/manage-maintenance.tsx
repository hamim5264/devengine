import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import { MaintenanceConfig, DEFAULT_MAINTENANCE_CONFIG } from "@/types/maintenance";
import {
  getMaintenanceConfig,
  updateMaintenanceConfig,
} from "@/lib/services/maintenanceService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageMaintenancePage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Maintenance Config State
  const [config, setConfig] = useState<MaintenanceConfig>(DEFAULT_MAINTENANCE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Live seconds ticker for countdown
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const ticker = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-maintenance");
    });
    return () => unsub();
  }, [router]);

  // Fetch initial maintenance configuration
  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await getMaintenanceConfig();
      setConfig(data);
    } catch (err: any) {
      console.error("Failed to load maintenance config:", err);
      setNotice({
        text: err?.message || "Failed to load live maintenance configuration.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadConfig();
    }
  }, [isAdmin]);

  // Quick Preset Handlers for Countdown Timer
  const handleAddMinutes = (minsToAdd: number) => {
    const nextDate = new Date(Date.now() + minsToAdd * 60 * 1000);
    setConfig((prev) => ({
      ...prev,
      targetEndTime: nextDate.toISOString(),
    }));
  };

  const handleAddHours = (hoursToAdd: number) => {
    const nextDate = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
    setConfig((prev) => ({
      ...prev,
      targetEndTime: nextDate.toISOString(),
    }));
  };

  const handleAddDays = (daysToAdd: number) => {
    const nextDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    setConfig((prev) => ({
      ...prev,
      targetEndTime: nextDate.toISOString(),
    }));
  };

  const handleSetNow = () => {
    setConfig((prev) => ({
      ...prev,
      targetEndTime: new Date().toISOString(),
    }));
  };

  // Convert ISO string to datetime-local value (YYYY-MM-DDTHH:mm)
  const formatDatetimeLocal = (isoString: string) => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return "";
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const handleDatetimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const dateObj = new Date(val);
    setConfig((prev) => ({
      ...prev,
      targetEndTime: dateObj.toISOString(),
    }));
  };

  // Save Configuration to Firestore
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      await updateMaintenanceConfig(config);
      setNotice({
        text: config.isEnabled
          ? "LOCKDOWN ACTIVE! Public site is locked to maintenance screen. Admin panel remains accessible."
          : "SYSTEM OPERATIONAL! Maintenance mode deactivated. Public site is live to all visitors.",
        type: config.isEnabled ? "warning" : "success",
      });
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      console.error("Error saving maintenance configuration:", err);
      setNotice({
        text: err?.message || "Failed to update maintenance settings.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle maintenance switch
  const handleToggleMaintenance = async () => {
    const nextState = !config.isEnabled;
    const updated = {
      ...config,
      isEnabled: nextState,
      updatedAt: new Date().toISOString(),
      updatedBy: ADMIN_EMAIL,
    };
    setConfig(updated);

    try {
      setSaving(true);
      await updateMaintenanceConfig(updated);
      setNotice({
        text: nextState
          ? "GLOBAL LOCKDOWN ENGAGED! Visitors are now held on the maintenance screen."
          : "LOCKDOWN LIFTED! Public access restored across all routes.",
        type: nextState ? "warning" : "success",
      });
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      console.error("Error toggling maintenance mode:", err);
      setNotice({
        text: "Failed to toggle maintenance state. Check network connectivity.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default preset
  const handleResetDefaults = () => {
    if (confirm("Reset maintenance configuration to factory defaults? You must click Save to persist.")) {
      setConfig({
        ...DEFAULT_MAINTENANCE_CONFIG,
        isEnabled: config.isEnabled, // preserve lockdown status
      });
      setNotice({
        text: "Preset restored to default settings. Click 'Save Changes' to apply.",
        type: "warning",
      });
    }
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [config]);

  // Live countdown calculation
  const countdown = useMemo(() => {
    const targetMs = config.targetEndTime ? new Date(config.targetEndTime).getTime() : 0;
    const diffMs = Math.max(0, targetMs - currentTime);

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
    const seconds = Math.floor((diffMs / 1000) % 60);

    return {
      days,
      hours,
      minutes,
      seconds,
      diffMs,
      isExpired: diffMs === 0,
      formattedText: `${String(days).padStart(2, "0")}d : ${String(hours).padStart(2, "0")}h : ${String(minutes).padStart(2, "0")}m : ${String(seconds).padStart(2, "0")}s`,
    };
  }, [config.targetEndTime, currentTime]);

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#38f2ff" />
        <p className="mt-4 font-mono text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Authorization…
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 bg-[#07070d] text-white">
          <HelixLoader size={48} color="#38f2ff" />
          <div className="text-center">
            <h3 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">
              Loading Infrastructure Engine
            </h3>
            <p className="text-xs text-gray-400 mt-1">Connecting to Firestore maintenance telemetry…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>System Maintenance Mode CMS — DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          
          {/* Top Header & Breadcrumbs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-[#38f2ff] transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span>System Infrastructure</span>
                <span>/</span>
                <span className="text-[#38f2ff] font-bold">Maintenance CMS</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-cyan-500/10 border border-white/[0.08] flex items-center justify-center text-amber-400 shadow-lg">
                  <span className="material-symbols-outlined text-[22px]">engineering</span>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    System Maintenance & Lockdown CMS
                  </h1>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-mono text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  Live Firestore Telemetry
                </div>
              </div>

              <p className="text-sm text-gray-400 mt-2 max-w-3xl">
                Configure the global maintenance lockdown, scheduled downtime countdown, deployment progress telemetry, and public announcements.
              </p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-[#38f2ff] text-xs font-mono font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                <span>Preview Screen</span>
              </button>

              <Link
                href="/maintenance"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/[0.2] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-gray-300 hover:text-white transition-all flex items-center gap-2"
              >
                <span>Open Screen</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>

              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Deploying…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">bolt</span>
                    <span>Save & Deploy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Flash Feedback Banner */}
          {notice && (
            <div
              className={`p-4 sm:p-5 rounded-2xl flex items-center justify-between gap-4 text-xs sm:text-sm font-mono border backdrop-blur-xl shadow-xl transition-all ${
                notice.type === "warning"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : notice.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[22px] shrink-0">
                  {notice.type === "warning" ? "warning" : notice.type === "error" ? "error" : "check_circle"}
                </span>
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-gray-400 hover:text-white p-1"
                aria-label="Dismiss"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          )}

          {/* 4 Quick Metric Cards: Immediate understanding of system status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Lockdown Status */}
            <div className={`p-5 rounded-2xl border backdrop-blur-xl shadow-xl transition-all ${
              config.isEnabled
                ? "bg-amber-500/[0.06] border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.12)]"
                : "bg-[#0c0c16]/95 border-white/[0.08]"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">
                  Access State
                </span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  config.isEnabled ? "bg-amber-400 animate-ping" : "bg-emerald-400 shadow-[0_0_8px_#10b981]"
                }`} />
              </div>
              <p className={`text-base font-mono font-bold truncate ${
                config.isEnabled ? "text-amber-400" : "text-emerald-400"
              }`}>
                {config.isEnabled ? "LOCKED (MAINTENANCE)" : "OPERATIONAL (LIVE)"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                {config.isEnabled ? "Public traffic intercepted" : "All routes open to visitors"}
              </p>
            </div>

            {/* Card 2: Countdown Window */}
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
                  Target Deadline
                </span>
                <span className="material-symbols-outlined text-cyan-400 text-sm">timer</span>
              </div>
              <p className="text-base font-mono font-bold text-white truncate">
                {countdown.isExpired ? "Deadline Reached" : `${countdown.days}d : ${countdown.hours}h : ${countdown.minutes}m`}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">
                {config.targetEndTime ? new Date(config.targetEndTime).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Not scheduled"}
              </p>
            </div>

            {/* Card 3: Deployment Progress */}
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-indigo-400 uppercase tracking-wider">
                  Deployment Meter
                </span>
                <span className="material-symbols-outlined text-indigo-400 text-sm">trending_up</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold font-mono text-white">
                  {config.progressPercentage}%
                </p>
                <span className="text-[11px] font-mono text-gray-400">Complete</span>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, config.progressPercentage))}%` }}
                />
              </div>
            </div>

            {/* Card 4: Subsystem Health */}
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider">
                  Subsystems
                </span>
                <span className="material-symbols-outlined text-teal-400 text-sm">dns</span>
              </div>
              <p className="text-sm font-mono font-bold text-white truncate">
                {config.coreServicesStatus || "Operational"}
              </p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">
                DB: {config.databaseStatus || "Synchronized"}
              </p>
            </div>
          </div>

          {/* MASTER LOCKDOWN SWITCH CARD */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border transition-all duration-300 backdrop-blur-xl shadow-2xl relative overflow-hidden ${
              config.isEnabled
                ? "bg-gradient-to-br from-amber-500/[0.08] via-[#0c0c16]/95 to-amber-950/[0.2] border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.15)]"
                : "bg-gradient-to-br from-emerald-500/[0.05] via-[#0c0c16]/95 to-slate-950 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
            }`}
          >
            {/* Top decorative badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      config.isEnabled
                        ? "bg-amber-400 shadow-[0_0_12px_#f59e0b] animate-ping"
                        : "bg-emerald-400 shadow-[0_0_10px_#10b981]"
                    }`}
                  />
                  <span className="font-mono text-xs font-bold tracking-widest uppercase">
                    SYSTEM STATUS:{" "}
                    <span className={config.isEnabled ? "text-amber-400" : "text-emerald-400"}>
                      {config.isEnabled ? "GLOBAL LOCKDOWN ENGAGED" : "STANDARD PRODUCTION ROUTING"}
                    </span>
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-white font-['Space_Grotesk']">
                  {config.isEnabled
                    ? "Maintenance Screen is Live to Public Traffic"
                    : "DevEngine is Operating Normally"}
                </h2>

                <p className="text-sm text-gray-300 leading-relaxed">
                  {config.isEnabled ? (
                    <>
                      <strong className="text-amber-300 font-semibold">Caution:</strong> All regular visitor routes (<code className="text-xs bg-black/40 px-1 py-0.5 rounded text-amber-200">/</code>, <code className="text-xs bg-black/40 px-1 py-0.5 rounded text-amber-200">/about</code>, <code className="text-xs bg-black/40 px-1 py-0.5 rounded text-amber-200">/careers</code>, etc.) are currently locked. Visitors are shown the maintenance screen with live countdown and upgrade logs. The admin workspace remains completely accessible to you.
                    </>
                  ) : (
                    <>
                      The public site is live and fully accessible to all visitors. When you activate maintenance mode, public traffic will immediately be held on the upgrade screen.
                    </>
                  )}
                </p>

                {/* Safety Scope Checklist */}
                <div className="flex flex-wrap gap-2 pt-1 text-xs font-mono">
                  <span className={`px-2.5 py-1 rounded-lg border ${
                    config.isEnabled ? "bg-amber-500/10 border-amber-500/30 text-amber-300" : "bg-white/[0.03] border-white/10 text-gray-400"
                  }`}>
                    {config.isEnabled ? "⛔ Public Routes: LOCKED" : "✓ Public Routes: LIVE"}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                    ✓ Admin Panel: ALWAYS ACCESSIBLE
                  </span>
                  <span className="px-2.5 py-1 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-300">
                    ✓ Realtime Sync: INSTANT
                  </span>
                </div>
              </div>

              {/* Polished Master Control Switch */}
              <div className="flex flex-col items-center sm:items-end gap-3 shrink-0">
                {/* Mode Indicator Pill */}
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider border shadow-sm transition-all ${
                    config.isEnabled
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      config.isEnabled ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  <span>{config.isEnabled ? "LOCKDOWN ENGAGED" : "PUBLIC ACCESS LIVE"}</span>
                </div>

                {/* Tactile Hardware Master Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMaintenance}
                  disabled={saving}
                  className={`group relative inline-flex h-11 w-[86px] shrink-0 cursor-pointer items-center rounded-full border-2 p-[3px] transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    config.isEnabled
                      ? "bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] focus-visible:ring-amber-400 hover:brightness-105"
                      : "bg-[#0b101d] border-white/[0.14] hover:border-emerald-500/40 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] focus-visible:ring-emerald-400"
                  } active:scale-95`}
                  aria-label="Toggle Global Maintenance Mode"
                >
                  <span className="sr-only">Toggle maintenance mode</span>

                  {/* Background Track Label (Left: LOCK, Right: LIVE) */}
                  <div className="absolute inset-0 flex items-center justify-between px-3 pointer-events-none select-none">
                    <span
                      className={`text-[9px] font-mono font-black tracking-widest transition-opacity duration-200 ${
                        config.isEnabled ? "text-black/80 opacity-100" : "opacity-0"
                      }`}
                    >
                      LOCK
                    </span>
                    <span
                      className={`text-[9px] font-mono font-bold tracking-widest transition-opacity duration-200 ${
                        !config.isEnabled ? "text-gray-400 opacity-100" : "opacity-0"
                      }`}
                    >
                      LIVE
                    </span>
                  </div>

                  {/* Sliding Knob */}
                  <span
                    className={`pointer-events-none relative inline-flex h-8 w-8 transform items-center justify-center rounded-full transition-transform duration-300 ease-out ${
                      config.isEnabled
                        ? "translate-x-[42px] bg-gradient-to-b from-white to-amber-50 border border-amber-200 shadow-[0_4px_12px_rgba(0,0,0,0.4),0_0_12px_rgba(245,158,11,0.5)]"
                        : "translate-x-0 bg-gradient-to-b from-[#242b3d] to-[#121624] border border-white/20 shadow-[0_4px_10px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.3)]"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[17px] transition-colors duration-200 ${
                        config.isEnabled ? "text-amber-700 font-bold" : "text-emerald-400"
                      }`}
                    >
                      {config.isEnabled ? "lock" : "lock_open"}
                    </span>
                  </span>
                </button>

                {/* Micro Action Helper */}
                <span className="text-[11px] font-mono text-gray-400 text-center sm:text-right">
                  {config.isEnabled ? "Click to deactivate lockdown" : "Click to activate lockdown"}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN FORM CONTAINER */}
          <form onSubmit={handleSave} className="space-y-8">

            {/* 1. SCHEDULED DOWNTIME & COUNTDOWN */}
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#38f2ff] text-[22px]">
                      timer
                    </span>
                    <span>1. Scheduled Downtime & Countdown Deadline</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Set the exact deadline when services are expected to resume. The public page computes and displays a live countdown.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/10 text-[11px] font-mono text-gray-400 self-start sm:self-auto">
                  Local Timezone Aware
                </span>
              </div>

              {/* Quick Duration Presets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Quick Duration Presets (Offsets deadline from current time)
                  </label>
                  <button
                    type="button"
                    onClick={handleSetNow}
                    className="text-[11px] font-mono text-gray-500 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    Set to Right Now (0m)
                  </button>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddMinutes(30)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +30 Mins
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddHours(1)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +1 Hour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddHours(2)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +2 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddHours(6)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +6 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddHours(12)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +12 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddHours(24)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +24 Hours
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDays(2)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDays(3)}
                    className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-[#38f2ff]/10 hover:border-[#38f2ff]/50 border border-white/[0.08] text-xs font-mono text-gray-300 hover:text-[#38f2ff] transition-all cursor-pointer text-center font-medium"
                  >
                    +3 Days
                  </button>
                </div>
              </div>

              {/* Exact Datetime Input & Live Cyber HUD Display */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* Left: Datetime picker */}
                <div className="lg:col-span-6 space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Target Resume Date & Time (Local Time) *
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      required
                      value={formatDatetimeLocal(config.targetEndTime)}
                      onChange={handleDatetimeChange}
                      className="w-full h-12 bg-black/40 border border-white/[0.12] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-[#38f2ff] font-mono shadow-inner transition-colors"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono px-1">
                    <span>ISO: {config.targetEndTime || "Unset"}</span>
                    <span>Format: YYYY-MM-DD HH:MM</span>
                  </div>
                </div>

                {/* Right: Live Digital Countdown HUD Tile */}
                <div className="lg:col-span-6 rounded-2xl bg-black/40 border border-white/[0.08] p-5 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${countdown.isExpired ? "bg-rose-500" : "bg-cyan-400 animate-pulse"}`} />
                      Live Countdown Telemetry HUD
                    </span>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      countdown.isExpired
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                    }`}>
                      {countdown.isExpired ? "TARGET EXPIRED" : "ACTIVE TICKING"}
                    </span>
                  </div>

                  {/* 4 Digital Segments */}
                  <div className="grid grid-cols-4 gap-2 text-center py-1">
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5">
                      <div className="text-xl sm:text-2xl font-black font-mono text-[#38f2ff] tracking-tight">
                        {String(countdown.days).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">Days</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5">
                      <div className="text-xl sm:text-2xl font-black font-mono text-[#38f2ff] tracking-tight">
                        {String(countdown.hours).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">Hours</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5">
                      <div className="text-xl sm:text-2xl font-black font-mono text-[#38f2ff] tracking-tight">
                        {String(countdown.minutes).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">Mins</div>
                    </div>
                    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5">
                      <div className="text-xl sm:text-2xl font-black font-mono text-cyan-200 tracking-tight">
                        {String(countdown.seconds).padStart(2, "0")}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase tracking-wider mt-0.5">Secs</div>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-gray-400 text-center mt-3">
                    {countdown.isExpired
                      ? "Deadline has elapsed. Countdown on maintenance screen shows 00:00:00."
                      : "Public screen shows this ticking clock counting down to estimated restoration."}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. PUBLIC ANNOUNCEMENT & MESSAGING */}
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#38f2ff] text-[22px]">
                    campaign
                  </span>
                  <span>2. Public Announcement & Notice Messaging</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Customize the headline, glowing badge, and explanatory message shown on the public maintenance screen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Glowing Badge Text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Glowing Badge Pill Text *
                    </label>
                  </div>
                  <input
                    type="text"
                    required
                    value={config.badge}
                    onChange={(e) => setConfig({ ...config, badge: e.target.value })}
                    placeholder="e.g. SYSTEM UPGRADE IN PROGRESS"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-[#38f2ff] rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                  />
                  {/* Quick Badge Suggestions */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["SYSTEM UPGRADE IN PROGRESS", "SCHEDULED MAINTENANCE", "DATABASE MIGRATION V2", "INFRASTRUCTURE POLISH"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConfig({ ...config, badge: preset })}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-cyan-300 transition-colors border border-white/[0.06] cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hero Headline */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Hero Headline Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.title}
                    onChange={(e) => setConfig({ ...config, title: e.target.value })}
                    placeholder="e.g. We're Building Something Better."
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-[#38f2ff] rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                  />
                  {/* Quick Title Suggestions */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["We're Building Something Better.", "Scheduled Core Maintenance", "Platform Upgrades Underway"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setConfig({ ...config, title: preset })}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-cyan-300 transition-colors border border-white/[0.06] cursor-pointer"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Descriptive Explanation Message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Descriptive Explanation Notice *
                  </label>
                  <span className="text-[11px] font-mono text-gray-500">
                    {config.message.length} chars
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  value={config.message}
                  onChange={(e) => setConfig({ ...config, message: e.target.value })}
                  placeholder="Explain why the system is under maintenance and when it is expected to return..."
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-[#38f2ff] rounded-xl p-4 text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>

              {/* Realtime Mini Preview Card: Shows exact public appearance */}
              <div className="mt-4 rounded-2xl bg-black/60 border border-white/[0.08] p-5 sm:p-6 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">tv</span>
                    Live Announcement Preview (What Visitors See)
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Interactive Render</span>
                </div>

                <div className="text-center py-4 px-2 space-y-3 max-w-xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>{config.badge || "STATUS BADGE"}</span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-white font-['Space_Grotesk'] tracking-tight">
                    {config.title || "Headline Goes Here"}
                  </h4>
                  <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg mx-auto">
                    {config.message || "Your descriptive notice text will appear here."}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. PROGRESS & TELEMETRY */}
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="border-b border-white/[0.08] pb-4">
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk'] flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#38f2ff] text-[22px]">
                    tune
                  </span>
                  <span>3. Deployment Progress & Subsystem Telemetry</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Adjust the overall completion percentage and subsystem status badges displayed to public visitors.
                </p>
              </div>

              {/* Progress Slider */}
              <div className="space-y-4 rounded-2xl bg-black/40 border border-white/[0.08] p-5">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-mono text-gray-300 uppercase tracking-wider font-semibold">
                      Overall Deployment Progress Meter
                    </label>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                      Slide or click preset buttons to update public progress bar
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black font-mono text-[#38f2ff]">
                      {config.progressPercentage}%
                    </span>
                  </div>
                </div>

                {/* Styled Range Slider */}
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.progressPercentage}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        progressPercentage: Number(e.target.value),
                      })
                    }
                    className="w-full h-2.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#38f2ff]"
                  />
                  
                  {/* Preset Percentage Buttons */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: "25% (Architecture)", val: 25 },
                      { label: "50% (Database)", val: 50 },
                      { label: "75% (Security)", val: 75 },
                      { label: "90% (Testing)", val: 90 },
                      { label: "100% (Ready)", val: 100 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setConfig({ ...config, progressPercentage: p.val })}
                        className={`text-xs font-mono px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          config.progressPercentage === p.val
                            ? "bg-[#38f2ff]/20 border-[#38f2ff] text-[#38f2ff] font-bold"
                            : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subsystem Telemetry Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Core Services Status Text
                  </label>
                  <input
                    type="text"
                    value={config.coreServicesStatus}
                    onChange={(e) =>
                      setConfig({ ...config, coreServicesStatus: e.target.value })
                    }
                    placeholder="e.g. Updating Modules..."
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-[#38f2ff] rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                  />
                  {/* Quick pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Updating Modules...", "All Services Operational", "Migrating Microservices"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setConfig({ ...config, coreServicesStatus: s })}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-cyan-300 transition-colors border border-white/[0.06] cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Database Status Text
                  </label>
                  <input
                    type="text"
                    value={config.databaseStatus}
                    onChange={(e) =>
                      setConfig({ ...config, databaseStatus: e.target.value })
                    }
                    placeholder="e.g. Optimizing Indexes"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-[#38f2ff] rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                  />
                  {/* Quick pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["Optimizing Indexes", "Schema Upgrades Complete", "Replicating Node Clusters"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setConfig({ ...config, databaseStatus: s })}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-cyan-300 transition-colors border border-white/[0.06] cursor-pointer"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SUBMIT / ACTION BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="text-xs font-mono text-gray-500 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">restart_alt</span>
                  <span>Reset to Factory Defaults</span>
                </button>
                <span className="text-gray-700 hidden sm:inline">|</span>
                <span className="text-[11px] font-mono text-gray-500 hidden sm:inline">
                  Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">Ctrl+S</kbd> to save anytime
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(true)}
                  className="px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white font-mono text-xs font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Preview Screen</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/25 active:scale-[0.98] cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Applying…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">cloud_sync</span>
                      <span>Save & Apply to System</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </main>

        {/* FULLSCREEN PREVIEW MODAL */}
        {previewModalOpen && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col overflow-hidden animate-fadeIn">
            <div className="bg-[#0b0f19] border-b border-white/10 px-6 py-3.5 flex items-center justify-between z-50 shrink-0">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <div>
                  <span className="font-mono text-xs text-white font-bold tracking-widest uppercase">
                    MAINTENANCE SCREEN PREVIEW MODE
                  </span>
                  <span className="text-[11px] font-mono text-gray-400 ml-2 hidden sm:inline">
                    (Simulating user experience in real-time)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Close Preview</span>
                <span className="font-bold">✕</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MaintenanceScreen config={config} isAdminPreview />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
