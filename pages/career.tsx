import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { JobCircular, JobApplication } from "@/types/career";
import {
  getActiveCirculars,
  submitJobApplication,
  INITIAL_SENIOR_UI_UX_CIRCULAR,
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-jetbrains text-[10px] font-semibold">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
        <span>DEADLINE CLOSED</span>
      </span>
    );
  }

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#38F2FF]/10 border border-[#38F2FF]/30 font-jetbrains text-[11px] text-[#38F2FF]">
        <span className="material-symbols-outlined text-[14px] animate-pulse">timer</span>
        <span>
          {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s left
        </span>
      </span>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#08111F] border border-[#38F2FF]/30 font-jetbrains text-xs text-[#38F2FF] shadow-[0_0_15px_rgba(56,242,255,0.15)]">
      <span className="material-symbols-outlined text-[15px] animate-pulse text-[#38F2FF]">
        timer
      </span>
      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mr-1 hidden sm:inline">
        DEADLINE IN:
      </span>
      <div className="flex items-center gap-1 font-bold tracking-wider">
        <span className="bg-black/60 px-1.5 py-0.5 rounded text-white border border-white/10 text-[11px]">
          {String(timeLeft.days).padStart(2, "0")}d
        </span>
        <span className="text-[#38F2FF]/60">:</span>
        <span className="bg-black/60 px-1.5 py-0.5 rounded text-white border border-white/10 text-[11px]">
          {String(timeLeft.hours).padStart(2, "0")}h
        </span>
        <span className="text-[#38F2FF]/60">:</span>
        <span className="bg-black/60 px-1.5 py-0.5 rounded text-white border border-white/10 text-[11px]">
          {String(timeLeft.minutes).padStart(2, "0")}m
        </span>
        <span className="text-[#38F2FF]/60">:</span>
        <span className="bg-[#38F2FF]/20 px-1.5 py-0.5 rounded text-[#38F2FF] border border-[#38F2FF]/40 text-[11px]">
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
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
      </Head>

      <LandingNavbar />

      <main className="min-h-screen bg-[#02040A] text-[#DDE2F3] font-sans selection:bg-[#38F2FF]/20 selection:text-[#38F2FF] overflow-x-hidden relative">
        {/* Global Ambient Background Grid & Volumetric Glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
            }}
          />
          <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-[850px] h-[850px] bg-[#38F2FF]/5 rounded-full blur-[150px] mix-blend-screen" />
          <div className="absolute bottom-1/3 right-0 w-[650px] h-[650px] bg-[#5448DC]/10 rounded-full blur-[170px] mix-blend-screen" />
        </div>

        {/* HERO SECTION */}
        <section className="relative pt-36 pb-20 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-jetbrains text-[#38F2FF] tracking-widest uppercase backdrop-blur-md mb-6 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-[#38F2FF] animate-pulse" />
            <span>DEVENGINE TALENT ARCHITECTURE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] leading-[1.08] max-w-5xl mx-auto">
            Build Extreme Software. <br />
            <span className="bg-gradient-to-r from-[#38F2FF] via-[#78F5FF] to-[#9ECAFF] bg-clip-text text-transparent italic">
              Define The Vanguard.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-[#BAC9CB] max-w-3xl mx-auto mt-6 leading-relaxed font-normal">
            DevEngine is not an ordinary software agency. We are an architectural collective
            building high-performance mobile engines, spatial dark-mode interfaces, and
            autonomous AI workflows. Join us to engineer products that command respect.
          </p>

          {/* Quick Pillars Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-5xl mx-auto text-left">
            <div className="p-6 rounded-2xl bg-[#08111F]/60 border border-white/10 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[#38F2FF] text-2xl mb-2 block">
                public
              </span>
              <h4 className="text-white font-bold font-['Space_Grotesk'] text-sm sm:text-base">
                100% Remote Freedom
              </h4>
              <p className="text-gray-400 text-xs mt-1">
                Work from wherever you deliver your sharpest, most autonomous craft.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#08111F]/60 border border-white/10 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[#38F2FF] text-2xl mb-2 block">
                payments
              </span>
              <h4 className="text-white font-bold font-['Space_Grotesk'] text-sm sm:text-base">
                Competitive Retainers
              </h4>
              <p className="text-gray-400 text-xs mt-1">
                Top-tier monthly compensation with direct performance milestone bonuses.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#08111F]/60 border border-white/10 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[#38F2FF] text-2xl mb-2 block">
                bolt
              </span>
              <h4 className="text-white font-bold font-['Space_Grotesk'] text-sm sm:text-base">
                Zero Bureaucracy
              </h4>
              <p className="text-gray-400 text-xs mt-1">
                No endless meetings. Direct architectural collaboration with founders.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#08111F]/60 border border-white/10 backdrop-blur-xl">
              <span className="material-symbols-outlined text-[#38F2FF] text-2xl mb-2 block">
                verified
              </span>
              <h4 className="text-white font-bold font-['Space_Grotesk'] text-sm sm:text-base">
                Cinematic Standards
              </h4>
              <p className="text-gray-400 text-xs mt-1">
                Pixel perfection, strict modular clean code, and zero compromises.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION: OPEN JOB CIRCULARS */}
        <section id="openings" className="py-16 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 pb-10 border-b border-white/10">
            <div>
              <span className="font-jetbrains text-xs text-[#38F2FF] tracking-widest uppercase font-bold">
                ACTIVE RECRUITMENT
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] mt-1">
                Open Circulars &amp; Positions
              </h2>
            </div>
            <div className="text-gray-400 text-xs font-jetbrains">
              {circulars.length > 0 ? (
                <span>SHOWING {circulars.length} OPEN ARCHITECTURAL ROLE(S)</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-gray-400 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                  RECRUITMENT PAUSED // 0 OPEN ROLES
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#38F2FF" />
              <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                Loading Active Circulars…
              </p>
            </div>
          ) : circulars.length === 0 ? (
            <div className="py-20 sm:py-24 px-6 sm:px-12 my-8 rounded-3xl border border-white/10 bg-gradient-to-b from-[#08111F]/90 via-[#050b14]/90 to-[#02040A] backdrop-blur-2xl shadow-2xl text-center max-w-4xl mx-auto relative overflow-hidden">
              {/* Subtle ambient lighting */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-[#38F2FF]/10 rounded-full blur-[90px] pointer-events-none" />

              {/* Big Formal Icon */}
              <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-b from-[#38F2FF]/20 to-[#38F2FF]/5 border border-[#38F2FF]/30 flex items-center justify-center shadow-[0_0_50px_rgba(56,242,255,0.2)] mb-8">
                <span className="material-symbols-outlined text-5xl sm:text-6xl text-[#38F2FF] select-none">
                  domain_verification
                </span>
                <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#02040A] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[14px] text-black font-bold">check</span>
                </span>
              </div>

              {/* Formal Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-jetbrains uppercase tracking-widest text-[#38F2FF] mb-5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Recruitment Status // All Positions Fully Staffed</span>
              </div>

              {/* Formal Heading */}
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight max-w-2xl mx-auto leading-tight">
                No Active Openings at This Time
              </h3>

              {/* Formal Body Paragraphs */}
              <div className="max-w-2xl mx-auto mt-4 space-y-3 text-gray-300 text-sm sm:text-base leading-relaxed">
                <p>
                  All architectural, systems engineering, and design roles are currently filled. We are not actively recruiting for open circulars at the moment.
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  However, our talent desk continuously engages with exceptional engineers and spatial designers for future vanguard initiatives. If your craft meets zero-compromise architectural standards, you are welcome to send a spontaneous portfolio.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-4 mt-8 pt-6 border-t border-white/[0.08]">
                <a
                  href="mailto:devenginesoftsolution@gmail.com?subject=Spontaneous%20Application%20%2F%2F%20DevEngine%20Talent%20Architecture"
                  className="px-7 py-3 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#02040A] font-jetbrains text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.6)] hover:scale-105 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  <span>Transmit Spontaneous CV</span>
                </a>

                <Link
                  href="/archive"
                  className="px-6 py-3 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-gray-300 hover:text-white font-jetbrains text-xs font-semibold tracking-wider transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">terminal</span>
                  <span>Explore Engineering Works</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-8 mt-10">
              {circulars.map((job) => {
                const isExpanded = expandedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="rounded-3xl bg-[#08111F]/80 backdrop-blur-2xl border border-white/10 hover:border-[#38F2FF]/40 transition-all duration-300 overflow-hidden shadow-2xl group"
                  >
                    {/* Header Strip */}
                    <div className="p-6 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-b border-white/5">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-[#38F2FF]/10 text-[#38F2FF] border border-[#38F2FF]/30 font-jetbrains text-[10px] font-bold tracking-wider uppercase">
                              {job.department}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-jetbrains text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{job.employmentType}</span>
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/5 text-gray-300 border border-white/10 font-jetbrains text-[10px]">
                              {job.location}
                            </span>
                          </div>

                          {/* Live Dynamic Countdown */}
                          <DeadlineCountdown targetDate={job.deadlineDate} />
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight group-hover:text-[#38F2FF] transition-colors">
                          {job.title}
                        </h3>

                        <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-3xl">
                          {job.overview}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-jetbrains text-gray-400 pt-1">
                          <span className="flex items-center gap-1.5 text-[#38F2FF]">
                            <span className="material-symbols-outlined text-[16px]">
                              paid
                            </span>
                            <strong className="text-white">{job.salaryRange}</strong>
                          </span>
                          <span className="text-white/20">•</span>
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[16px]">
                              military_tech
                            </span>
                            <span>{job.experienceLevel}</span>
                          </span>
                          {job.deadline && (
                            <>
                              <span className="text-white/20">•</span>
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
                          className="px-5 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-jetbrains text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer"
                        >
                          <span>{isExpanded ? "COLLAPSE BRIEF" : "VIEW DETAILS"}</span>
                          <span className="material-symbols-outlined text-[16px]">
                            {isExpanded ? "expand_less" : "expand_more"}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openApplySheet(job)}
                          className="px-7 py-3 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#02040A] font-jetbrains text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.7)] hover:scale-105 flex items-center justify-center gap-2 flex-1 sm:flex-none cursor-pointer"
                        >
                          <span>APPLY NOW</span>
                          <span className="material-symbols-outlined text-[16px]">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Detailed Accordion Section */}
                    {isExpanded && (
                      <div className="p-6 sm:p-10 bg-black/40 border-t border-white/5 space-y-8 animate-fadeIn">
                        {/* Responsibilities */}
                        <div>
                          <h4 className="font-jetbrains text-xs uppercase tracking-widest text-[#38F2FF] font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">
                              task_alt
                            </span>
                            <span>PRIMARY ARCHITECTURAL RESPONSIBILITIES</span>
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {job.responsibilities.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-sm text-gray-300"
                              >
                                <span className="material-symbols-outlined text-[#38F2FF] text-[18px] flex-shrink-0 mt-0.5">
                                  check_circle
                                </span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Requirements */}
                        <div>
                          <h4 className="font-jetbrains text-xs uppercase tracking-widest text-[#38F2FF] font-bold mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">
                              psychology
                            </span>
                            <span>QUALIFICATIONS &amp; EXPERTISE</span>
                          </h4>
                          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {job.requirements.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-2.5 text-sm text-gray-300"
                              >
                                <span className="material-symbols-outlined text-[#38F2FF] text-[18px] flex-shrink-0 mt-0.5">
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
                            <h4 className="font-jetbrains text-xs uppercase tracking-widest text-emerald-400 font-bold mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px]">
                                card_giftcard
                              </span>
                              <span>PERKS, BENEFITS &amp; AUTONOMY</span>
                            </h4>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {job.benefits.map((item, idx) => (
                                <li
                                  key={idx}
                                  className="flex items-start gap-2.5 text-sm text-gray-300"
                                >
                                  <span className="material-symbols-outlined text-emerald-400 text-[18px] flex-shrink-0 mt-0.5">
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
                          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-2">
                            <span className="font-jetbrains text-xs text-gray-400 mr-2">
                              RELEVANT STACK:
                            </span>
                            {job.skills.map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-jetbrains text-[#BAC9CB]"
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
                            className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#02040A] font-jetbrains text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(56,242,255,0.4)] flex items-center gap-2 cursor-pointer"
                          >
                            <span>APPLY FOR THIS ROLE</span>
                            <span className="material-symbols-outlined text-[16px]">
                              arrow_forward
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* APPLICATION SLIDE-OVER SHEET */}
        {isApplyOpen && selectedJob && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
            {/* Backdrop click to dismiss */}
            <div
              className="absolute inset-0"
              onClick={closeApplySheet}
              aria-hidden="true"
            />

            {/* Sheet Content Panel */}
            <div className="relative w-full max-w-2xl bg-[#080E1A] border-l border-white/15 h-full overflow-y-auto p-6 sm:p-10 space-y-6 shadow-2xl flex flex-col justify-between z-10 animate-slideLeft">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-white/10 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-jetbrains text-[10px] text-[#38F2FF] uppercase tracking-widest font-bold">
                        APPLICATION DOSSIER
                      </span>
                      <span className="text-white/20">•</span>
                      <DeadlineCountdown targetDate={selectedJob.deadlineDate} compact />
                    </div>
                    <h3 className="text-2xl font-bold text-white font-['Space_Grotesk'] mt-0.5">
                      {selectedJob.title}
                    </h3>
                    <p className="text-gray-400 text-xs font-jetbrains">
                      {selectedJob.department} · {selectedJob.employmentType} · {selectedJob.location}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeApplySheet}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                {/* Form Fields: Polished, concise hints, sleek custom dropdown */}
                <form
                  id="application-form"
                  onSubmit={handleApplicationSubmit}
                  className="space-y-4 pt-5"
                >
                  <div>
                    <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="Alex Vance"
                      className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@domain.com"
                        className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                        Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1..."
                        className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                        Portfolio / Figma Link
                      </label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="behance.net/... or figma.com/..."
                        className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                        Years of Experience
                      </label>
                      <div className="relative">
                        <select
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                          className="w-full appearance-none bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 pr-9 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner cursor-pointer"
                        >
                          <option value="1-2 Years" className="bg-[#080E1A] text-white">1 – 2 Years</option>
                          <option value="3-5 Years" className="bg-[#080E1A] text-white">3 – 5 Years (Senior)</option>
                          <option value="5-8 Years" className="bg-[#080E1A] text-white">5 – 8 Years (Lead)</option>
                          <option value="8+ Years" className="bg-[#080E1A] text-white">8+ Years (Principal)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px] pointer-events-none">
                          unfold_more
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* RESUME GOOGLE DRIVE LINK FIELD */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-jetbrains text-gray-300 uppercase tracking-wider font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#38F2FF] text-[14px]">link</span>
                        <span>Resume Drive Link *</span>
                      </label>
                      <span className="text-[10px] font-jetbrains text-gray-500">
                        (&quot;Anyone with link can view&quot;)
                      </span>
                    </div>
                    <input
                      type="url"
                      required
                      value={resumeDriveLink}
                      onChange={(e) => setResumeDriveLink(e.target.value)}
                      placeholder="https://drive.google.com/file/d/..."
                      className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all shadow-inner"
                    />
                  </div>

                  {/* COVER NOTE */}
                  <div>
                    <label className="text-[10px] font-jetbrains text-gray-400 uppercase tracking-wider font-semibold mb-1 block">
                      Architectural Pitch / Cover Note (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      placeholder="Brief pitch or note..."
                      className="w-full bg-[#050A17]/85 border border-white/10 hover:border-white/20 focus:border-[#38F2FF] rounded-xl p-3 text-xs text-white placeholder-gray-500/70 focus:outline-none focus:ring-1 focus:ring-[#38F2FF]/40 transition-all resize-none shadow-inner"
                    />
                  </div>
                </form>
              </div>

              {/* Submission Footer */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={closeApplySheet}
                  className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-jetbrains font-semibold"
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  form="application-form"
                  disabled={submitting}
                  className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#02040A] font-jetbrains text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_40px_rgba(56,242,255,0.8)] hover:scale-105 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {submitting ? "hourglass_top" : "send"}
                  </span>
                  <span>{submitting ? "TRANSMITTING…" : "TRANSMIT APPLICATION"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORMAL CONFIRMATION MODAL */}
        {successData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-xl bg-[#080E1A] border border-[#38F2FF]/40 rounded-3xl p-8 sm:p-10 space-y-6 shadow-[0_0_60px_rgba(56,242,255,0.2)] text-center relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#38F2FF] to-transparent" />

              <div className="w-16 h-16 rounded-2xl bg-[#38F2FF]/10 border border-[#38F2FF]/30 flex items-center justify-center text-[#38F2FF] mx-auto shadow-[0_0_20px_rgba(56,242,255,0.3)]">
                <span className="material-symbols-outlined text-3xl">verified</span>
              </div>

              <div>
                <span className="font-jetbrains text-[11px] text-[#38F2FF] tracking-widest uppercase font-bold">
                  TRANSMISSION CONFIRMED // REF #{successData.refId}
                </span>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white font-['Space_Grotesk'] mt-2">
                  Application Transmitted Successfully
                </h3>
              </div>

              <div className="p-6 rounded-2xl bg-[#02040A]/60 border border-white/10 text-left space-y-3 font-jetbrains text-xs text-[#BAC9CB] leading-relaxed">
                <p>
                  Dear <strong className="text-white">{successData.applicantName}</strong>,
                </p>
                <p>
                  Thank you for your application for the position of{" "}
                  <strong className="text-[#38F2FF]">{successData.jobTitle}</strong> at{" "}
                  <strong className="text-white">DevEngine Studio</strong>. Your submission and
                  credentials dossier have been securely cataloged into our talent architecture system.
                </p>
                <p>
                  Our design and systems engineering leads will review your portfolio and resume link.
                  If your architectural background and craft align with our studio requirements, an
                  invitation for an architectural discussion will be dispatched to your registered email
                  within <strong>5 to 7 business days</strong>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSuccessData(null)}
                  className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#02040A] font-jetbrains text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:scale-105 cursor-pointer"
                >
                  Acknowledge &amp; Return
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <LandingFooter />
    </>
  );
}
