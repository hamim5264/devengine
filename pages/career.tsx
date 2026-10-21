import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { JobCircular, JobApplication } from "@/types/career";
import {
  getActiveCirculars,
  submitJobApplication,
} from "@/lib/services/careerService";

function DeadlineCountdown({
  targetDate,
  compact,
}: {
  targetDate?: string;
  compact?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTime = () => {
      const target = targetDate
        ? new Date(targetDate).getTime()
        : new Date("2026-10-15T23:59:59Z").getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (timeLeft.isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-mono text-[10px] font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span>DEADLINE CLOSED</span>
      </span>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-50 dark:bg-[#2cecf7]/10 border border-cyan-200 dark:border-[#2cecf7]/30 font-mono text-[11px] text-[#0284c7] dark:text-[#2cecf7] font-semibold">
        <span className="material-symbols-outlined text-[14px] animate-pulse">timer</span>
        <span>
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#0a0f1d] border border-slate-200 dark:border-[#2cecf7]/30 font-mono text-xs text-slate-800 dark:text-[#2cecf7] shadow-xs">
      <span className="material-symbols-outlined text-[15px] animate-pulse text-[#0284c7] dark:text-[#2cecf7]">
        timer
      </span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mr-1 hidden sm:inline">
        DEADLINE IN:
      </span>
      <div className="flex items-center gap-1 font-bold tracking-wider">
        <span className="bg-white dark:bg-black/60 px-1.5 py-0.5 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-[11px]">
          {String(timeLeft.days).padStart(2, "0")}d
        </span>
        <span className="text-[#0284c7] dark:text-[#2cecf7]/60">:</span>
        <span className="bg-white dark:bg-black/60 px-1.5 py-0.5 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-[11px]">
          {String(timeLeft.hours).padStart(2, "0")}h
        </span>
        <span className="text-[#0284c7] dark:text-[#2cecf7]/60">:</span>
        <span className="bg-white dark:bg-black/60 px-1.5 py-0.5 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-white/10 text-[11px]">
          {String(timeLeft.minutes).padStart(2, "0")}m
        </span>
        <span className="text-[#0284c7] dark:text-[#2cecf7]/60">:</span>
        <span className="bg-cyan-100 dark:bg-[#2cecf7]/20 px-1.5 py-0.5 rounded text-[#0284c7] dark:text-[#2cecf7] border border-cyan-300 dark:border-[#2cecf7]/40 text-[11px]">
          {String(timeLeft.seconds).padStart(2, "0")}s
        </span>
      </div>
    </div>
  );
}

export default function CareerPage() {
  const [circulars, setCirculars] = useState<JobCircular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobCircular | null>(null);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Form State
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeDriveLink, setResumeDriveLink] = useState("");
  const [experienceYears, setExperienceYears] = useState("3+ Years");
  const [coverNote, setCoverNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Success Confirmation Modal
  const [successData, setSuccessData] = useState<{
    jobTitle: string;
    applicantName: string;
    refId: string;
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await getActiveCirculars();
        if (mounted) {
          setCirculars(data);
          if (data.length > 0) {
            setExpandedJobId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load career data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const openApplySheet = (job: JobCircular) => {
    if (job.status === "closed") {
      alert("This position has been closed.");
      return;
    }
    if (job.deadlineDate) {
      const target = new Date(job.deadlineDate).getTime();
      if (!isNaN(target) && target < Date.now()) {
        alert("The application deadline for this position has passed.");
        return;
      }
    }
    setSelectedJob(job);
    setIsApplyOpen(true);
  };

  const closeApplySheet = () => {
    setIsApplyOpen(false);
  };

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    if (
      selectedJob.status === "closed" ||
      (selectedJob.deadlineDate && new Date(selectedJob.deadlineDate).getTime() < Date.now())
    ) {
      alert("The application deadline for this position has passed. Applications are no longer accepted.");
      setIsApplyOpen(false);
      return;
    }

    if (!applicantName.trim() || !email.trim() || !resumeDriveLink.trim()) {
      alert("Please fill in your Full Name, Email, and Resume Google Drive Link.");
      return;
    }

    setSubmitting(true);
    try {
      const appId = await submitJobApplication({
        circularId: selectedJob.id,
        jobTitle: selectedJob.title,
        applicantName: applicantName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        portfolioUrl: portfolioUrl.trim() || undefined,
        resumeDriveLink: resumeDriveLink.trim(),
        experienceYears: experienceYears.trim(),
        coverNote: coverNote.trim() || undefined,
      });

      // Clear form & close sheet
      setApplicantName("");
      setEmail("");
      setPhone("");
      setPortfolioUrl("");
      setResumeDriveLink("");
      setCoverNote("");
      setIsApplyOpen(false);

      // Trigger formal confirmation modal
      setSuccessData({
        jobTitle: selectedJob.title,
        applicantName: applicantName.trim(),
        refId: appId.slice(0, 8).toUpperCase(),
      });
    } catch (err) {
      console.error("Error submitting application:", err);
      alert("Failed to transmit application. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Careers &amp; Engineering Vanguard | DevEngine Extreme</title>
        <meta
          name="description"
          content="Explore high-impact career opportunities at DevEngine. We are seeking elite software architects, systems engineers, and spatial UI/UX designers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="canonical" href="https://www.devenginehq.com/career" />

        {/* OpenGraph */}
        <meta property="og:site_name" content="DevEngine" />
        <meta property="og:title" content="Careers & Engineering Vanguard | DevEngine Extreme" />
        <meta
          property="og:description"
          content="Explore high-impact career opportunities at DevEngine. We are seeking elite software architects, systems engineers, and spatial UI/UX designers."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.devenginehq.com/career" />
        <meta property="og:image" content="https://www.devenginehq.com/dev_url_logo.png" />

        {/* Twitter Cards */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Careers & Engineering Vanguard | DevEngine Extreme" />
        <meta
          name="twitter:description"
          content="Explore high-impact career opportunities at DevEngine. We are seeking elite software architects, systems engineers, and spatial UI/UX designers."
        />
        <meta name="twitter:image" content="https://www.devenginehq.com/dev_url_logo.png" />
      </Head>

      <div className="min-h-screen bg-[var(--devengine-page)] text-[var(--devengine-text)] relative overflow-x-hidden transition-colors duration-300">
        {/* Ambient Cyber Canvas (Light & Dark Compatible) */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-[15%] -left-[10%] w-[min(60vw,750px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.18),transparent_70%)] blur-[90px] opacity-30 dark:opacity-45" />
          <div className="absolute top-[35%] -right-[10%] w-[min(55vw,680px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.14),transparent_70%)] blur-[90px] opacity-25 dark:opacity-35" />
          <div className="absolute bottom-[5%] left-[20%] w-[min(50vw,600px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.12),transparent_70%)] blur-[90px] opacity-20 dark:opacity-30" />
          <div className="absolute inset-0 bg-[linear-gradient(var(--devengine-border)_1px,transparent_1px),linear-gradient(90deg,var(--devengine-border)_1px,transparent_1px)] bg-[size:50px_50px] opacity-15 dark:opacity-25 [mask-image:radial-gradient(ellipse_90%_80%_at_50%_50%,#000_30%,transparent_85%)]" />
        </div>

        <LandingNavbar />

        <main className="relative z-10 w-full pt-28 sm:pt-36 pb-24 selection:bg-[#2cecf7] selection:text-[#02040a]">
          {/* HERO SECTION */}
          <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 text-center mb-16 sm:mb-20">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-50 dark:bg-[#2cecf7]/10 border border-cyan-200 dark:border-[#2cecf7]/30 text-[#0284c7] dark:text-[#2cecf7] mb-6 sm:mb-7 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#0284c7] dark:bg-[#2cecf7] animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-widest font-bold">
                  DEVENGINE TALENT ARCHITECTURE
                </span>
              </div>

              {/* Solid, Crisp High-Contrast Headline (Light & Dark) */}
              <h1 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight mb-5 leading-[1.12] max-w-5xl mx-auto">
                <span className="text-slate-950 dark:text-slate-50">Build Extreme Software.</span> <br />
                <span className="text-[#0284c7] dark:text-[#2cecf7]">Define The Vanguard.</span>
              </h1>

              <p className="font-sans text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
                DevEngine is not an ordinary software agency. We are an architectural collective building high-performance mobile engines, spatial dark-mode interfaces, and autonomous AI workflows. Join us to engineer products that command respect.
              </p>
            </motion.div>

            {/* Quick Pillars Grid (Theme-Adaptive & Responsive) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-14 max-w-6xl mx-auto text-left"
            >
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl">public</span>
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold font-[family-name:var(--font-site,'Poppins',sans-serif)] text-base">
                  100% Remote Freedom
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  Work from wherever you deliver your sharpest, most autonomous craft.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl">payments</span>
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold font-[family-name:var(--font-site,'Poppins',sans-serif)] text-base">
                  Competitive Retainers
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  Top-tier monthly compensation with direct performance milestone bonuses.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl">bolt</span>
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold font-[family-name:var(--font-site,'Poppins',sans-serif)] text-base">
                  Zero Bureaucracy
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  No endless meetings. Direct architectural collaboration with founders.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-[#0a0f1d] border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold font-[family-name:var(--font-site,'Poppins',sans-serif)] text-base">
                  Cinematic Standards
                </h4>
                <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                  Pixel perfection, strict modular clean code, and zero compromises.
                </p>
              </div>
            </motion.div>
          </section>

          {/* SECTION: OPEN JOB CIRCULARS */}
          <section id="openings" className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-12">
            <div className="bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 shadow-lg shadow-slate-200/40 dark:shadow-black/60 mb-10">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-[#2cecf7]/10 text-[#0284c7] dark:text-[#2cecf7] px-3 py-1 rounded-full font-jetbrains text-xs uppercase tracking-widest font-bold mb-2 border border-cyan-200 dark:border-[#2cecf7]/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#2cecf7]" />
                    ACTIVE RECRUITMENT
                  </div>
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)] tracking-tight">
                    Open Circulars &amp; Positions
                  </h2>
                </div>

                <div className="text-xs font-mono">
                  {circulars.length > 0 ? (
                    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>SHOWING {circulars.length} OPEN ARCHITECTURAL ROLE(S)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      RECRUITMENT PAUSED // 0 OPEN ROLES
                    </span>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center">
                <HelixLoader size={48} color="#2cecf7" />
                <p className="mt-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
                  Loading Active Circulars…
                </p>
              </div>
            ) : circulars.length === 0 ? (
              <div className="py-16 sm:py-20 px-6 sm:px-12 my-8 rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 bg-white dark:bg-[#0a0f1d] shadow-lg text-center max-w-4xl mx-auto relative overflow-hidden">
                <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-[#0284c7] dark:text-[#2cecf7] mb-6 shadow-xs">
                  <span className="material-symbols-outlined text-4xl select-none">
                    domain_verification
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/20 text-[11px] font-mono uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-4 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>Recruitment Status // All Positions Fully Staffed</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)] tracking-tight max-w-2xl mx-auto">
                  No Active Openings at This Time
                </h3>

                <div className="max-w-2xl mx-auto mt-3 space-y-2.5 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  <p>
                    All architectural, systems engineering, and design roles are currently filled. We are not actively recruiting for open circulars at the moment.
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    However, our talent desk continuously engages with exceptional engineers and spatial designers for future vanguard initiatives. If your craft meets zero-compromise architectural standards, you are welcome to send a spontaneous portfolio.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <a
                    href="mailto:devenginesoftsolution@gmail.com?subject=Spontaneous%20Application%20%2F%2F%20DevEngine%20Talent%20Architecture"
                    className="px-6 py-3 rounded-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-[#2cecf7]/25 flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">mail</span>
                    <span>Transmit Spontaneous CV</span>
                  </a>

                  <Link
                    href="/projects/all"
                    className="px-6 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs font-semibold tracking-wider transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">terminal</span>
                    <span>Explore Engineering Works</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {circulars.map((job) => {
                  const isExpanded = expandedJobId === job.id;

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4 }}
                      className="rounded-3xl bg-white dark:bg-[#0a0f1d] border border-slate-200/90 dark:border-cyan-500/20 hover:border-[#2cecf7] transition-all duration-300 overflow-hidden shadow-md shadow-slate-200/40 dark:shadow-black/60 group"
                    >
                      {/* Header Strip */}
                      <div className="p-6 sm:p-8 lg:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800/80">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-cyan-50 dark:bg-[#2cecf7]/10 text-[#0284c7] dark:text-[#2cecf7] border border-cyan-200 dark:border-[#2cecf7]/30 font-mono text-[10px] font-bold tracking-wider uppercase">
                                {job.department}
                              </span>
                              <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 font-mono text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>{job.employmentType}</span>
                              </span>
                              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px]">
                                {job.location}
                              </span>
                            </div>

                            {/* Live Dynamic Countdown */}
                            <DeadlineCountdown targetDate={job.deadlineDate} />
                          </div>

                          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)] tracking-tight group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors">
                            {job.title}
                          </h3>

                          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-4xl">
                            {job.overview}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1">
                            <span className="flex items-center gap-1.5 text-[#0284c7] dark:text-[#2cecf7]">
                              <span className="material-symbols-outlined text-[16px]">
                                paid
                              </span>
                              <strong className="text-slate-900 dark:text-white font-bold">{job.salaryRange}</strong>
                            </span>
                            <span className="text-slate-300 dark:text-white/20">•</span>
                            <span className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">
                                military_tech
                              </span>
                              <span>{job.experienceLevel}</span>
                            </span>
                            {job.deadline && (
                              <>
                                <span className="text-slate-300 dark:text-white/20">•</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[16px]">
                                    event
                                  </span>
                                  <span>Deadline: {job.deadline}</span>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobId(isExpanded ? null : job.id)
                            }
                            className="px-5 py-3 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-mono text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
                          >
                            <span>{isExpanded ? "COLLAPSE BRIEF" : "VIEW DETAILS"}</span>
                            <span className="material-symbols-outlined text-[16px]">
                              {isExpanded ? "expand_less" : "expand_more"}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openApplySheet(job)}
                            className="px-7 py-3 rounded-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-[#2cecf7]/25 hover:scale-105 flex items-center justify-center gap-2 flex-1 sm:flex-none cursor-pointer"
                          >
                            <span>APPLY NOW</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* Detailed Accordion Section with Smooth Framer Motion */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="p-6 sm:p-8 lg:p-10 bg-slate-50/70 dark:bg-[#070b16]/70 border-t border-slate-100 dark:border-slate-800/80 space-y-8"
                          >
                            {/* Responsibilities */}
                            <div>
                              <h4 className="font-mono text-xs uppercase tracking-widest text-[#0284c7] dark:text-[#2cecf7] font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  task_alt
                                </span>
                                <span>PRIMARY ARCHITECTURAL RESPONSIBILITIES</span>
                              </h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {job.responsibilities.map((item, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                                  >
                                    <span className="material-symbols-outlined text-[#0284c7] dark:text-[#2cecf7] text-[18px] flex-shrink-0 mt-0.5">
                                      check_circle
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Requirements */}
                            <div>
                              <h4 className="font-mono text-xs uppercase tracking-widest text-[#0284c7] dark:text-[#2cecf7] font-bold mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">
                                  psychology
                                </span>
                                <span>QUALIFICATIONS &amp; EXPERTISE</span>
                              </h4>
                              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {job.requirements.map((item, idx) => (
                                  <li
                                    key={idx}
                                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                                  >
                                    <span className="material-symbols-outlined text-[#0284c7] dark:text-[#2cecf7] text-[18px] flex-shrink-0 mt-0.5">
                                      arrow_right
                                    </span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Perks & Benefits */}
                            {job.benefits && job.benefits.length > 0 && (
                              <div>
                                <h4 className="font-mono text-xs uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-bold mb-4 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">
                                    card_giftcard
                                  </span>
                                  <span>PERKS, BENEFITS &amp; AUTONOMY</span>
                                </h4>
                                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                  {job.benefits.map((item, idx) => (
                                    <li
                                      key={idx}
                                      className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                                    >
                                      <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px] flex-shrink-0 mt-0.5">
                                        stars
                                      </span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Skills Cloud */}
                            {job.skills && job.skills.length > 0 && (
                              <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center gap-2">
                                <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-2 font-semibold">
                                  RELEVANT STACK:
                                </span>
                                {job.skills.map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-3 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 shadow-2xs"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="pt-4 flex justify-end">
                              <button
                                type="button"
                                onClick={() => openApplySheet(job)}
                                className="px-8 py-3.5 rounded-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-[#2cecf7]/25 flex items-center gap-2 cursor-pointer"
                              >
                                <span>APPLY FOR THIS ROLE</span>
                                <span className="material-symbols-outlined text-[16px]">
                                  arrow_forward
                                </span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* APPLICATION SLIDE-OVER SHEET (LIGHT/DARK ADAPTABLE) */}
          <AnimatePresence>
            {isApplyOpen && selectedJob && (
              <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 dark:bg-black/85 backdrop-blur-sm">
                {/* Backdrop click to dismiss */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                  onClick={closeApplySheet}
                  aria-hidden="true"
                />

                {/* Sheet Content Panel */}
                <motion.div
                  initial={{ x: "100%", opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: "100%", opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 220 }}
                  className="relative w-full max-w-2xl bg-white dark:bg-[#0a0f1d] text-slate-900 dark:text-white border-l border-slate-200 dark:border-cyan-500/30 h-full overflow-y-auto p-6 sm:p-10 space-y-6 shadow-2xl flex flex-col justify-between z-10"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-[#0284c7] dark:text-[#2cecf7] uppercase tracking-widest font-bold">
                            APPLICATION DOSSIER
                          </span>
                          <span className="text-slate-300 dark:text-white/20">•</span>
                          <DeadlineCountdown targetDate={selectedJob.deadlineDate} compact />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)] mt-0.5">
                          {selectedJob.title}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">
                          {selectedJob.department} · {selectedJob.employmentType} · {selectedJob.location}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={closeApplySheet}
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>

                    {/* Form Fields */}
                    <form
                      id="application-form"
                      onSubmit={handleApplicationSubmit}
                      className="space-y-4 pt-5"
                    >
                      <div>
                        <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={applicantName}
                          onChange={(e) => setApplicantName(e.target.value)}
                          placeholder="Alex Vance"
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@domain.com"
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                            Phone / WhatsApp *
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+880 1..."
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                            Portfolio / Figma Link
                          </label>
                          <input
                            type="url"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            placeholder="behance.net/... or figma.com/..."
                            className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                            Years of Experience
                          </label>
                          <div className="relative">
                            <select
                              value={experienceYears}
                              onChange={(e) => setExperienceYears(e.target.value)}
                              className="w-full appearance-none bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 pr-9 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner cursor-pointer"
                            >
                              <option value="1-2 Years">1 – 2 Years</option>
                              <option value="3-5 Years">3 – 5 Years (Senior)</option>
                              <option value="5-8 Years">5 – 8 Years (Lead)</option>
                              <option value="8+ Years">8+ Years (Principal)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none">
                              unfold_more
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RESUME GOOGLE DRIVE LINK FIELD */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[#0284c7] dark:text-[#2cecf7] text-[14px]">link</span>
                            <span>Resume Drive Link *</span>
                          </label>
                          <span className="text-[10px] font-mono text-slate-400">
                            (&quot;Anyone with link can view&quot;)
                          </span>
                        </div>
                        <input
                          type="url"
                          required
                          value={resumeDriveLink}
                          onChange={(e) => setResumeDriveLink(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition shadow-inner"
                        />
                      </div>

                      {/* COVER NOTE */}
                      <div>
                        <label className="text-[10px] font-mono text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold mb-1 block">
                          Architectural Pitch / Cover Note (Optional)
                        </label>
                        <textarea
                          rows={3}
                          value={coverNote}
                          onChange={(e) => setCoverNote(e.target.value)}
                          placeholder="Brief pitch or note..."
                          className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700 focus:border-[#2cecf7] rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2cecf7]/20 transition resize-none shadow-inner"
                        />
                      </div>
                    </form>
                  </div>

                  {/* Submission Footer */}
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={closeApplySheet}
                      className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-gray-300 text-xs font-mono font-semibold transition cursor-pointer"
                    >
                      CANCEL
                    </button>

                    <button
                      type="submit"
                      form="application-form"
                      disabled={submitting}
                      className="px-8 py-3.5 rounded-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-md shadow-[#2cecf7]/25 hover:scale-105 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {submitting ? "hourglass_top" : "send"}
                      </span>
                      <span>{submitting ? "TRANSMITTING…" : "TRANSMIT APPLICATION"}</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* FORMAL CONFIRMATION MODAL (LIGHT/DARK ADAPTABLE) */}
          <AnimatePresence>
            {successData && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="w-full max-w-xl bg-white dark:bg-[#0a0f1d] border border-slate-200 dark:border-cyan-500/30 rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl text-center relative overflow-hidden"
                >
                  <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center text-[#0284c7] dark:text-[#2cecf7] mx-auto shadow-xs">
                    <span className="material-symbols-outlined text-3xl">verified</span>
                  </div>

                  <div>
                    <span className="font-mono text-[11px] text-[#0284c7] dark:text-[#2cecf7] tracking-widest uppercase font-bold">
                      TRANSMISSION CONFIRMED // REF #{successData.refId}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)] mt-2">
                      Application Transmitted Successfully
                    </h3>
                  </div>

                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-800 text-left space-y-3 font-mono text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <p>
                      Dear <strong className="text-slate-900 dark:text-white">{successData.applicantName}</strong>,
                    </p>
                    <p>
                      Thank you for your application for the position of{" "}
                      <strong className="text-[#0284c7] dark:text-[#2cecf7]">{successData.jobTitle}</strong> at{" "}
                      <strong className="text-slate-900 dark:text-white">DevEngine Studio</strong>. Your submission and credentials dossier have been securely cataloged into our talent architecture system.
                    </p>
                    <p>
                      Our design and systems engineering leads will review your portfolio and resume link. If your architectural background and craft align with our studio requirements, an invitation for an architectural discussion will be dispatched to your registered email within <strong>5 to 7 business days</strong>.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSuccessData(null)}
                      className="px-8 py-3.5 rounded-full bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-mono text-xs font-bold tracking-widest uppercase transition-all shadow-md shadow-[#2cecf7]/25 hover:scale-105 cursor-pointer"
                    >
                      Acknowledge &amp; Return
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
