import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import dynamic from "next/dynamic";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { LabProject, LabProjectStatus } from "@/types/lab";
import {
  getPublicLabProjects,
  DEFAULT_LAB_PROJECTS,
} from "@/lib/services/labService";

const LabBackgroundAnimation = dynamic(
  () => import("@/components/lab/LabBackgroundAnimation"),
  { ssr: false }
);

/* ════════════════════════════════════════════════════════════════
   STATUS CONFIG — colors, labels, icons
   ════════════════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<
  LabProjectStatus,
  { label: string; color: string; bg: string; border: string; glow: string; icon: string }
> = {
  CONCEPT: {
    label: "Concept",
    color: "text-violet-300",
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_12px_rgba(139,92,246,0.3)]",
    icon: "lightbulb",
  },
  IN_DEVELOPMENT: {
    label: "In Development",
    color: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.3)]",
    icon: "engineering",
  },
  ALPHA: {
    label: "Alpha",
    color: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-500/30",
    glow: "shadow-[0_0_12px_rgba(14,165,233,0.3)]",
    icon: "science",
  },
  BETA: {
    label: "Beta",
    color: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
    icon: "bug_report",
  },
  LAUNCHING_SOON: {
    label: "Launching Soon",
    color: "text-rose-300",
    bg: "bg-rose-500/15",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_12px_rgba(244,63,94,0.3)]",
    icon: "rocket_launch",
  },
};

const STATUS_FILTERS: { key: string; label: string; icon: string }[] = [
  { key: "ALL", label: "All Projects", icon: "apps" },
  { key: "CONCEPT", label: "Concept", icon: "lightbulb" },
  { key: "IN_DEVELOPMENT", label: "In Development", icon: "engineering" },
  { key: "ALPHA", label: "Alpha", icon: "science" },
  { key: "BETA", label: "Beta", icon: "bug_report" },
  { key: "LAUNCHING_SOON", label: "Launching Soon", icon: "rocket_launch" },
];

/* ════════════════════════════════════════════════════════════════
   COUNTDOWN HOOK — live days/hours/mins/secs to release
   ════════════════════════════════════════════════════════════════ */
function useCountdown(dateStr: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const target = new Date(dateStr).getTime();
  const diff = Math.max(0, target - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const expired = diff <= 0;

  return { days, hours, mins, secs, expired };
}

/* ════════════════════════════════════════════════════════════════
   COUNTDOWN DISPLAY COMPONENT
   ════════════════════════════════════════════════════════════════ */
function CountdownTimer({ dateStr }: { dateStr: string }) {
  const { days, hours, mins, secs, expired } = useCountdown(dateStr);

  if (expired) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 font-space font-bold text-sm">
        <span className="material-symbols-outlined text-base">check_circle</span>
        <span>Ready for Launch</span>
      </div>
    );
  }

  const blocks = [
    { val: days, label: "DAYS" },
    { val: hours, label: "HRS" },
    { val: mins, label: "MIN" },
    { val: secs, label: "SEC" },
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {blocks.map((b, i) => (
        <React.Fragment key={b.label}>
          <div className="flex flex-col items-center min-w-[38px]">
            <span className="font-space font-bold text-base sm:text-lg text-white leading-none tabular-nums">
              {String(b.val).padStart(2, "0")}
            </span>
            <span className="font-jetbrains text-[8px] sm:text-[9px] text-gray-500 uppercase tracking-widest mt-0.5">
              {b.label}
            </span>
          </div>
          {i < blocks.length - 1 && (
            <span className="text-[#38f2ff]/40 font-bold text-sm mb-3">:</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   DEVICE MOCKUP — laptop + phone frame
   ════════════════════════════════════════════════════════════════ */
function DeviceMockup({
  laptopUrl,
  phoneUrl,
}: {
  laptopUrl: string;
  phoneUrl: string;
}) {
  return (
    <div className="relative w-full aspect-[16/10] flex items-end justify-center">
      {/* Laptop Frame */}
      <div className="relative w-[85%] h-full">
        {/* Screen bezel */}
        <div className="absolute inset-0 rounded-t-xl bg-[#1a1f2e] border-2 border-[#2a3040] overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)]">
          {/* Screen content */}
          <div className="absolute inset-[6px] rounded-lg overflow-hidden bg-[#0a0e18]">
            {laptopUrl ? (
              <img
                src={laptopUrl}
                alt="Laptop preview"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-gray-600">
                  laptop_mac
                </span>
              </div>
            )}
            {/* Screen glare overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
        {/* Laptop base */}
        <div className="absolute -bottom-[6px] left-1/2 -translate-x-1/2 w-[110%] h-[6px] bg-gradient-to-b from-[#2a3040] to-[#1a1f2e] rounded-b-lg" />
      </div>

      {/* Phone Frame — overlaps bottom-right */}
      <div className="absolute bottom-0 right-0 w-[22%] z-10 translate-x-[5%] translate-y-[8%]">
        <div className="rounded-2xl bg-[#1a1f2e] border-2 border-[#2a3040] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.9)] aspect-[9/19]">
          {/* Notch */}
          <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-[35%] h-[3px] bg-[#0a0e18] rounded-full z-20" />
          {/* Screen */}
          <div className="absolute inset-[4px] rounded-xl overflow-hidden bg-[#0a0e18]">
            {phoneUrl ? (
              <img
                src={phoneUrl}
                alt="Phone preview"
                className="w-full h-full object-cover opacity-90"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-xl text-gray-600">
                  smartphone
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ════════════════════════════════════════════════════════════════ */
export default function LabPage() {
  const [projects, setProjects] = useState<LabProject[]>(DEFAULT_LAB_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getPublicLabProjects();
        if (mounted && data.length > 0) {
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to load lab projects:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (selectedStatus === "ALL") return projects;
    return projects.filter((p) => p.status === selectedStatus);
  }, [projects, selectedStatus]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: projects.length };
    projects.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [projects]);

  return (
    <>
      <Head>
        <title>Lab — Upcoming & Ongoing Projects | DevEngine</title>
        <meta
          name="description"
          content="Explore DevEngine Lab — our proving ground for upcoming platforms, mobile apps, AI engines, and cloud services currently in development."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Global Background */}
      <div className="fixed inset-0 bg-[#060a12] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_15%,rgba(14,24,42,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-60" />

      {/* Ambient Lighting */}
      <div className="fixed top-20 left-1/4 w-[650px] h-[650px] bg-[#38f2ff]/6 rounded-full blur-[140px] pointer-events-none z-[-7]" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[130px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-24 left-4 z-40 lg:hidden w-10 h-10 rounded-xl bg-[#0e131f]/95 border border-white/10 backdrop-blur-xl flex items-center justify-center text-[#38f2ff] cursor-pointer shadow-lg"
      >
        <span className="material-symbols-outlined text-xl">
          {sidebarOpen ? "close" : "filter_list"}
        </span>
      </button>

      <div className="relative z-10 flex pt-20">
        {/* ═══════════════════════════════════════════
            SIDE PANEL — Status Filters & System Info
        ═══════════════════════════════════════════ */}
        <aside
          className={`fixed lg:sticky top-20 left-0 h-[calc(100vh-80px)] w-72 bg-[#080c16]/95 lg:bg-[#080c16]/60 backdrop-blur-2xl border-r border-white/[0.06] z-40 flex flex-col p-5 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          {/* Lab Identity */}
          <div className="mb-8 pt-2">
            <div className="font-jetbrains text-[10px] text-gray-500 uppercase tracking-widest mb-1">
              System Module
            </div>
            <div className="font-space font-bold text-xl text-white tracking-tight">
              DEVENGINE LAB
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse shadow-[0_0_8px_rgba(56,242,255,0.8)]" />
              <span className="font-jetbrains text-[10px] text-[#38f2ff] uppercase tracking-widest font-semibold">
                System Active
              </span>
            </div>
          </div>

          {/* Status Filter Navigation */}
          <nav className="flex flex-col gap-1 flex-1">
            <div className="font-jetbrains text-[10px] text-gray-500 uppercase tracking-widest mb-2 px-3">
              Filter by Status
            </div>
            {STATUS_FILTERS.map((f) => {
              const isActive = selectedStatus === f.key;
              const count = statusCounts[f.key] || 0;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    setSelectedStatus(f.key);
                    setSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-[#38f2ff]/10 text-[#38f2ff] border-l-[3px] border-l-[#38f2ff] font-semibold"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.04] border-l-[3px] border-l-transparent"
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">
                    {f.icon}
                  </span>
                  <span className="font-jetbrains text-xs uppercase tracking-wider flex-1">
                    {f.label}
                  </span>
                  {count > 0 && (
                    <span
                      className={`font-jetbrains text-[10px] px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-[#38f2ff]/20 text-[#38f2ff]"
                          : "bg-white/5 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* System Stats */}
          <div className="mt-auto pt-6 border-t border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-jetbrains text-[10px] text-gray-500 uppercase tracking-widest">
                Total Projects
              </span>
              <span className="font-space font-bold text-sm text-white">
                {projects.length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-jetbrains text-[10px] text-gray-500 uppercase tracking-widest">
                Active Builds
              </span>
              <span className="font-space font-bold text-sm text-[#38f2ff]">
                {projects.filter((p) => p.status === "IN_DEVELOPMENT" || p.status === "ALPHA" || p.status === "BETA").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-jetbrains text-[10px] text-gray-500 uppercase tracking-widest">
                System Status
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-jetbrains text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  Nominal
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════
            MAIN CONTENT
        ═══════════════════════════════════════════ */}
        <main className="flex-1 min-h-screen text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712] pb-24 relative overflow-hidden">
          {/* ── 3D LAB CORE BACKGROUND EFFECT (TOP-RIGHT CORNER) ── */}
          <div className="absolute -top-8 -right-12 sm:-right-4 lg:right-6 xl:right-16 w-[360px] sm:w-[500px] lg:w-[620px] xl:w-[680px] h-[360px] sm:h-[500px] lg:h-[620px] xl:h-[680px] pointer-events-none overflow-visible z-0 select-none opacity-90">
            <LabBackgroundAnimation />
            {/* Soft fade so it blends seamlessly */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060a12] pointer-events-none opacity-60" />
          </div>

          {/* ── HERO SECTION ── */}
          <section className="relative z-10 px-6 sm:px-10 lg:px-16 pt-16 sm:pt-20 pb-16 max-w-6xl mx-auto text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 mb-6 shadow-[0_0_20px_rgba(56,242,255,0.12)]">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse" />
              <span className="font-jetbrains text-[11px] text-[#38f2ff] uppercase tracking-widest font-bold">
                DevEngine Research & Development
              </span>
            </div>

            <h1 className="font-space font-bold text-4xl sm:text-5xl lg:text-6xl text-white mb-5 leading-tight tracking-tight">
              The Lab —{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#22d3ee] to-[#3495ea] drop-shadow-[0_0_35px_rgba(56,242,255,0.3)]">
                Building the Future
              </span>
            </h1>

            <p className="font-sans text-base sm:text-lg text-[#849495] max-w-3xl lg:max-w-2xl mb-10 leading-relaxed">
              Live diagnostics of ongoing architectural testing, platform prototyping, and next-generation product integration. Every project listed here is actively being engineered by DevEngine.
            </p>

            {/* Quick Metrics */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-10">
              <div>
                <div className="font-space font-bold text-2xl sm:text-3xl text-white">{projects.length}</div>
                <div className="font-jetbrains text-[10px] text-[#849495] uppercase tracking-widest mt-1">Active Projects</div>
              </div>
              <div>
                <div className="font-space font-bold text-2xl sm:text-3xl text-[#38f2ff]">
                  {projects.filter((p) => p.progressPercent >= 70).length}
                </div>
                <div className="font-jetbrains text-[10px] text-[#849495] uppercase tracking-widest mt-1">Near Launch</div>
              </div>
              <div>
                <div className="font-space font-bold text-2xl sm:text-3xl text-white">24/7</div>
                <div className="font-jetbrains text-[10px] text-[#849495] uppercase tracking-widest mt-1">Monitoring</div>
              </div>
            </div>
          </section>

          {/* ── LAB PROJECTS GRID ── */}
          <section className="px-6 sm:px-10 lg:px-16 max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8 pb-4 border-b border-white/[0.06]">
              <div>
                <div className="inline-flex items-center gap-2 mb-1.5">
                  <span className="w-4 h-[2px] bg-[#38f2ff]" />
                  <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                    Currently In The Lab
                  </span>
                </div>
                <h2 className="font-space font-bold text-2xl sm:text-3xl text-white tracking-tight">
                  {selectedStatus === "ALL"
                    ? "All Experiments"
                    : STATUS_CONFIG[selectedStatus as LabProjectStatus]?.label || selectedStatus}
                </h2>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-jetbrains text-gray-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{filtered.length} Experiment{filtered.length !== 1 ? "s" : ""} Active</span>
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <HelixLoader size={48} color="#38f2ff" />
                <p className="mt-4 font-jetbrains text-xs text-gray-400 uppercase tracking-widest">
                  Initializing Lab Telemetry…
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-600 mb-3 block">
                  science
                </span>
                <p className="font-space text-lg text-gray-400">
                  No experiments match this filter.
                </p>
                <button
                  onClick={() => setSelectedStatus("ALL")}
                  className="mt-4 font-jetbrains text-xs text-[#38f2ff] uppercase tracking-wider cursor-pointer hover:underline"
                >
                  View All Projects →
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {filtered.map((project) => {
                  const sc = STATUS_CONFIG[project.status] || STATUS_CONFIG.CONCEPT;
                  return (
                    <div
                      key={project.id}
                      className="relative rounded-3xl bg-gradient-to-b from-[#0e1526]/95 via-[#0a0f1d]/90 to-[#060a14] border border-white/[0.08] hover:border-[#38f2ff]/30 shadow-[0_8px_40px_rgba(0,0,0,0.7)] hover:shadow-[0_12px_50px_rgba(56,242,255,0.08)] transition-all duration-500 group overflow-hidden"
                    >
                      {/* Glowing Accent Line */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38f2ff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Corner Glow */}
                      <div className="absolute -top-16 -right-16 w-40 h-40 bg-[#38f2ff]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#38f2ff]/10 transition-colors" />

                      {/* Device Mockup Preview */}
                      <div className="px-6 sm:px-8 pt-6 sm:pt-8 pb-2">
                        <DeviceMockup
                          laptopUrl={project.laptopImageUrl}
                          phoneUrl={project.phoneImageUrl}
                        />
                      </div>

                      {/* Project Details */}
                      <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-4">
                        {/* Lab ID + Status Badge Row */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <span className="font-jetbrains text-[10px] text-[#38f2ff] bg-[#38f2ff]/10 px-2.5 py-1 rounded uppercase tracking-widest font-bold">
                            LAB-{String(project.order).padStart(3, "0")}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-jetbrains uppercase tracking-wider font-semibold ${sc.color} ${sc.bg} ${sc.border} border`}
                          >
                            <span className="material-symbols-outlined text-xs">
                              {sc.icon}
                            </span>
                            {sc.label}
                          </span>
                        </div>

                        {/* Title & Tagline */}
                        <h3 className="font-space font-bold text-xl sm:text-2xl text-white mb-2 group-hover:text-[#38f2ff] transition-colors leading-snug">
                          {project.title}
                        </h3>
                        <p className="font-sans text-xs sm:text-sm text-[#38f2ff]/70 font-medium mb-3 leading-snug line-clamp-1">
                          {project.tagline}
                        </p>
                        <p className="font-sans text-xs sm:text-sm text-[#849495] leading-relaxed line-clamp-3 mb-5">
                          {project.description}
                        </p>

                        {/* Progress Bar */}
                        <div className="mb-5">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-jetbrains text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                              Development Progress
                            </span>
                            <span className="font-space font-bold text-sm text-[#38f2ff]">
                              {project.progressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[#161c28] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#38f2ff] to-[#22d3ee] shadow-[0_0_12px_rgba(56,242,255,0.6)] relative transition-all duration-1000"
                              style={{ width: `${project.progressPercent}%` }}
                            >
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                            </div>
                          </div>
                        </div>

                        {/* Countdown Timer */}
                        <div className="flex items-center justify-between gap-4 mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                          <div>
                            <div className="font-jetbrains text-[9px] text-gray-500 uppercase tracking-widest mb-1">
                              Estimated Release
                            </div>
                            <div className="font-space text-xs text-gray-300">
                              {new Date(project.estimatedRelease).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>
                          <CountdownTimer dateStr={project.estimatedRelease} />
                        </div>

                        {/* Tech Stack + Tags */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {project.techStack.slice(0, 4).map((tech, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-jetbrains text-[10px] text-gray-300 group-hover:border-[#38f2ff]/20 transition-colors"
                            >
                              {tech}
                            </span>
                          ))}
                          {project.tags.slice(0, 2).map((tag, i) => (
                            <span
                              key={`t-${i}`}
                              className="px-2.5 py-1 rounded-lg bg-[#38f2ff]/[0.06] border border-[#38f2ff]/15 font-jetbrains text-[10px] text-[#38f2ff]/80"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── BOTTOM CTA ── */}
          <section className="px-6 sm:px-10 lg:px-16 max-w-6xl mx-auto mt-20">
            <div className="bg-gradient-to-br from-[#0e131f] via-[#161c28] to-[#080e1a] rounded-3xl p-8 sm:p-14 border border-[#38f2ff]/25 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1/2 h-full bg-[#38f2ff]/5 blur-[120px] rounded-full pointer-events-none" />
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
                <div className="max-w-xl">
                  <span className="px-3 py-1 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff] font-jetbrains text-[10px] uppercase tracking-widest font-bold inline-block mb-3">
                    Join The Experiment
                  </span>
                  <h3 className="font-space font-bold text-3xl sm:text-4xl text-white mb-3 tracking-tight">
                    That&apos;s Why We Experiment.
                  </h3>
                  <p className="font-sans text-sm text-[#849495] leading-relaxed">
                    Have a groundbreaking idea? Partner with DevEngine to bring your vision from concept to production-grade reality.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3.5 shrink-0">
                  <Link
                    href="/services"
                    className="relative group overflow-hidden bg-gradient-to-r from-[#38f2ff] via-[#22d3ee] to-[#00dbe8] text-[#030712] font-space font-bold text-xs sm:text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-[0_0_25px_rgba(56,242,255,0.35)] hover:shadow-[0_0_45px_rgba(56,242,255,0.6)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2.5 border-t border-white/40"
                  >
                    <span className="material-symbols-outlined text-base font-bold">
                      rocket_launch
                    </span>
                    <span>Explore DevEngine</span>
                  </Link>
                  <Link
                    href="/projects"
                    className="relative group overflow-hidden bg-[#0e131f]/90 hover:bg-[#162032] text-white font-space font-semibold text-xs sm:text-sm uppercase tracking-wider px-7 py-4 rounded-xl border border-white/15 hover:border-[#38f2ff]/60 backdrop-blur-xl transition-all duration-300 flex items-center justify-center gap-2.5"
                  >
                    <span>View Completed Projects</span>
                    <span className="material-symbols-outlined text-base text-[#38f2ff]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <LandingFooter />

      {/* Shimmer animation keyframes */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </>
  );
}
