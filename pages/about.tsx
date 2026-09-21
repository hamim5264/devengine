import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { TeamMember, FounderProfile } from "@/types/team";
import {
  getFounderProfile,
  getTeamMembers,
  DEFAULT_FOUNDER,
  INITIAL_TEAM,
} from "@/lib/services/teamService";

export default function AboutPage() {
  const [founder, setFounder] = useState<FounderProfile>(DEFAULT_FOUNDER);
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [fp, tm] = await Promise.all([
          getFounderProfile(),
          getTeamMembers(),
        ]);
        if (mounted) {
          setFounder(fp);
          setTeam(tm);
        }
      } catch (err) {
        console.error("Failed to load about data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <Head>
        <title>About the Founder & Studio Architecture | DevEngine Extreme</title>
        <meta
          name="description"
          content="Meet MD. Abdul Hamim Leon, Founder & CEO of DevEngine Systems. Discover our architectural discipline, mobile & AI superpowers, and collective team engineering philosophy."
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

      <main className="min-h-screen bg-[#030712] text-[#DDE2F3] font-sans selection:bg-[#38F2FF]/20 selection:text-[#38F2FF] overflow-x-hidden relative">
        {/* Global Ambient Background Grid & Volumetric Glows */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div
            className="absolute inset-0 opacity-35"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
              maskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(circle at center, black 40%, transparent 80%)",
            }}
          />
          <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#38F2FF]/5 rounded-full blur-[140px] mix-blend-screen" />
          <div className="absolute bottom-1/4 right-0 w-[600px] h-[600px] bg-[#5448DC]/10 rounded-full blur-[160px] mix-blend-screen" />
        </div>

        {/* SECTION 1: EXECUTIVE FOUNDER HERO */}
        <section className="relative min-h-[90vh] flex items-center justify-center pt-36 pb-24 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto">
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Column: Headline, Bio & Action Buttons */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-jetbrains text-[#38F2FF] tracking-widest uppercase backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[#38F2FF] animate-pulse" />
                <span>FOUNDER & LEAD ARCHITECT</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white font-['Space_Grotesk'] leading-[1.08]">
                Engineering <br />
                <span className="bg-gradient-to-r from-[#38F2FF] via-[#78F5FF] to-[#9ECAFF] bg-clip-text text-transparent italic">
                  Real-World
                </span>{" "}
                <br />
                Solutions.
              </h1>

              <div className="border-l-2 border-[#38F2FF]/40 pl-5 space-y-3 py-1">
                <p className="text-base sm:text-lg text-[#BAC9CB] leading-relaxed">
                  I&apos;m{" "}
                  <strong className="text-white font-bold tracking-wide">
                    {founder.name}
                  </strong>{" "}
                  — a Systems & Software Developer from Bangladesh 🇧🇩, Founder &
                  CEO of DevEngine, focused on building scalable,
                  performance-obsessed mobile engines, full-stack backends, and
                  AI automation workflows.
                </p>
                <div className="text-xs sm:text-sm text-gray-300 font-jetbrains flex flex-wrap items-center gap-2 pt-0.5">
                  <span>B.Sc. in Computer Science & Engineering (DIU) · Lead Mobile Developer at</span>
                  <a
                    href="https://neonecy.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38F2FF]/15 text-[#38F2FF] border border-[#38F2FF]/40 hover:bg-[#38F2FF]/25 hover:border-[#38F2FF] transition-all font-semibold tracking-wider hover:shadow-[0_0_15px_rgba(56,242,255,0.4)] group cursor-pointer"
                    title="Visit NEONECY (neonecy.com)"
                  >
                    <span>NEONECY</span>
                    <span className="material-symbols-outlined text-[13px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                      north_east
                    </span>
                  </a>
                </div>
              </div>

              {/* Action Buttons: Resume removed, Portfolio linked to https://thedevhamim.vercel.app/ */}
              <div className="pt-4 flex flex-wrap items-center gap-4">
                <a
                  href={founder.portfolioUrl || "https://thedevhamim.vercel.app/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-3.5 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#030712] font-jetbrains text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.7)] hover:scale-105 flex items-center gap-2 group cursor-pointer"
                >
                  <span>Explore CEO Portfolio</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                    north_east
                  </span>
                </a>

                <a
                  href="#studio-architecture"
                  className="px-7 py-3.5 rounded-full border border-white/20 hover:border-[#38F2FF] text-white hover:text-[#38F2FF] hover:bg-white/5 font-jetbrains text-xs font-semibold tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  <span>Studio Architecture ↓</span>
                </a>
              </div>
            </div>

            {/* Right Column: Founder Portrait in Cyber Frame */}
            <div className="lg:col-span-5 flex justify-center relative">
              {/* Outer Decorative Orbit Ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[115%] h-[115%] border border-[#38F2FF]/15 rounded-full border-dashed animate-[spin_60s_linear_infinite] pointer-events-none -z-10" />

              {/* Capsule Frame with CEO.png */}
              <div className="relative w-[300px] h-[460px] sm:w-[360px] sm:h-[540px] rounded-[70px] overflow-hidden p-2 bg-[#08111F]/80 backdrop-blur-2xl border border-[#38F2FF]/30 shadow-[0_0_50px_rgba(56,242,255,0.15)] group">
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent z-10 pointer-events-none" />

                <div className="relative w-full h-full rounded-[62px] overflow-hidden bg-[#02040A]">
                  <Image
                    src={founder.avatarUrl || "/assets/CEO.png"}
                    alt={founder.name}
                    fill
                    sizes="(max-width: 768px) 300px, 360px"
                    priority
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                {/* Floating Tech Badges */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-wrap gap-2 w-full justify-center px-4">
                  {["Android", "iOS", "Full Stack"].map((badge, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full bg-[#0E131F]/90 backdrop-blur-md border border-white/10 font-jetbrains text-[11px] text-[#38F2FF] font-semibold tracking-wide shadow-md"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: THE ARCHITECTURE OF A DEVELOPER & STUDIO */}
        <section
          id="studio-architecture"
          className="py-24 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto border-t border-white/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-4">
              <span className="font-jetbrains text-xs text-[#38F2FF] tracking-widest uppercase font-bold">
                SYSTEM FOUNDATIONS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white font-['Space_Grotesk'] leading-tight">
                The{" "}
                <span className="bg-gradient-to-r from-[#38F2FF] to-[#3495EA] bg-clip-text text-transparent">
                  Architecture
                </span>{" "}
                of Extreme Software.
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Modern software must balance aesthetic beauty with unyielding
                resilience. Discover the principles that govern every repository
                and client system we deliver.
              </p>

              <div className="pt-4">
                <a
                  href={founder.portfolioUrl || "https://thedevhamim.vercel.app/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-jetbrains text-[#38F2FF] hover:underline tracking-wide font-semibold"
                >
                  <span>Read Hamim&apos;s Full Engineering Timeline</span>
                  <span className="material-symbols-outlined text-[16px]">
                    arrow_forward
                  </span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              {/* Card 1: Mobile First, Scalable Always */}
              <div className="p-8 rounded-3xl bg-[#08111F]/70 backdrop-blur-xl border border-white/10 hover:border-[#38F2FF]/40 transition-all duration-300 shadow-xl group">
                <div className="w-12 h-12 rounded-2xl bg-[#38F2FF]/10 border border-[#38F2FF]/30 flex items-center justify-center text-[#38F2FF] mb-6">
                  <span className="material-symbols-outlined text-[26px]">
                    smartphone
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] mb-3">
                  Mobile First, Scalable Always
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  We build cross-platform mobile architectures with a strong
                  emphasis on{" "}
                  <strong className="text-white font-medium">
                    Flutter, Dart, and Riverpod State Management
                  </strong>
                  . Every screen adheres to strict Clean Architecture, offline-first
                  Hive/SQLite sync, and sub-16ms render budgets to deliver native
                  fluidity without memory bloat.
                </p>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  {["Flutter", "Dart", "Riverpod", "Clean Architecture", "Firebase Realtime", "Offline Sync"].map(
                    (tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-jetbrains text-[#BAC9CB]"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Card 2: Full-Stack & Generative Intelligence */}
              <div className="p-8 rounded-3xl bg-[#08111F]/70 backdrop-blur-xl border border-white/10 hover:border-[#3495EA]/40 transition-all duration-300 shadow-xl group">
                <div className="w-12 h-12 rounded-2xl bg-[#3495EA]/10 border border-[#3495EA]/30 flex items-center justify-center text-[#3495EA] mb-6">
                  <span className="material-symbols-outlined text-[26px]">
                    psychology
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] mb-3">
                  Full-Stack Capabilities & AI Orchestration
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
                  Beyond front-ends, our systems encompass modern backends and
                  autonomous intelligence. We engineer{" "}
                  <strong className="text-white font-medium">
                    Next.js edge pipelines, Python/FastAPI microservices,
                    LangChain agent loops, and ChromaDB vector embeddings
                  </strong>
                  , deploying AI voice dispatchers, clinical predictors, and
                  real-time CRM engines.
                </p>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                  {["Next.js 15", "Python", "FastAPI", "OpenAI GPT-4o", "LangChain", "Vector Embeddings"].map(
                    (tag, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white/5 text-[11px] font-jetbrains text-[#BAC9CB]"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Card 3: Enterprise Source Sovereignty */}
              <div className="p-8 rounded-3xl bg-[#08111F]/70 backdrop-blur-xl border border-white/10 hover:border-[#78F5FF]/40 transition-all duration-300 shadow-xl group">
                <div className="w-12 h-12 rounded-2xl bg-[#78F5FF]/10 border border-[#78F5FF]/30 flex items-center justify-center text-[#78F5FF] mb-6">
                  <span className="material-symbols-outlined text-[26px]">
                    verified_user
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] mb-3">
                  Full Source Sovereignty & Zero Lock-in
                </h3>
                <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-4 font-normal">
                  Through DevEngine, we discard SaaS subscription traps in favor
                  of direct source licensing. When a client or team acquires our
                  software, they receive clean, unminified, fully documented
                  codebases with direct takeover rights.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: THE COLLECTIVE BRAINPOWER (TEAM & SPECIALISTS) */}
        <section id="collective" className="py-28 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto border-t border-white/10 relative">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-jetbrains text-[#38F2FF] tracking-widest uppercase backdrop-blur-md mb-4">
              <span className="w-2 h-2 rounded-full bg-[#38F2FF] animate-pulse" />
              <span>COLLECTIVE INTELLIGENCE</span>
            </div>
            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
              The Studio Team &amp; Specialists
            </h2>
            <p className="text-gray-400 text-sm sm:text-base leading-relaxed mt-4">
              DevEngine is powered by multidisciplinary architects, systems engineers,
              and dedicated specialists building extreme software and scalable digital ecosystems.
            </p>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#38F2FF" />
              <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                Synchronizing Specialists Matrix…
              </p>
            </div>
          ) : (
            /* Vertical Connecting Timeline & Animated Member Showcase */
            <div className="relative max-w-6xl mx-auto">
              {/* Continuous Luminous Circuit Line */}
              <div
                className="absolute left-6 lg:left-1/2 top-4 bottom-8 -translate-x-1/2 w-[2px] bg-gradient-to-b from-[#38F2FF] via-[#5448DC] to-[#38F2FF]/30 pointer-events-none z-0"
                aria-hidden="true"
              />
              <div
                className="absolute left-6 lg:left-1/2 top-4 bottom-8 -translate-x-1/2 w-[8px] bg-[#38F2FF]/20 blur-md pointer-events-none z-0"
                aria-hidden="true"
              />

              <div className="space-y-20 lg:space-y-32 relative z-10">
                {team.map((member, index) => {
                  const isEven = index % 2 === 0;
                  const memberIndex = String(index + 1).padStart(2, "0");

                  return (
                    <div
                      key={member.id}
                      className="relative pl-14 sm:pl-16 lg:pl-0 group"
                    >
                      {/* Timeline Central Node */}
                      <div className="absolute left-6 lg:left-1/2 -translate-x-1/2 top-8 lg:top-1/2 -translate-y-1/2 z-20 flex items-center justify-center">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#08111F] border-2 border-[#38F2FF] shadow-[0_0_25px_rgba(56,242,255,0.7)] flex items-center justify-center font-jetbrains text-xs font-bold text-[#38F2FF] group-hover:scale-110 transition-transform duration-300">
                          {memberIndex}
                        </div>
                        <span className="absolute inset-0 rounded-full bg-[#38F2FF]/30 animate-ping pointer-events-none" />
                      </div>

                      {/* Member Content Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                        {/* Member Photo Card */}
                        <div
                          className={`lg:col-span-5 ${
                            isEven ? "lg:order-1" : "lg:order-3"
                          }`}
                        >
                          <div className="relative rounded-3xl overflow-hidden border border-[#38F2FF]/30 bg-[#0A101D] group-hover:border-[#38F2FF] shadow-[0_0_35px_rgba(56,242,255,0.12)] group-hover:shadow-[0_0_50px_rgba(56,242,255,0.3)] transition-all duration-500">
                            {/* Ambient Top Glow */}
                            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#38F2FF]/15 to-transparent pointer-events-none z-10" />

                            {/* Image Container */}
                            <div className="relative w-full h-[360px] sm:h-[420px] overflow-hidden bg-[#050B14]">
                              <img
                                src={member.avatarUrl || "/assets/DevEngine-emblem.png"}
                                alt={member.name}
                                className="w-full h-full object-cover object-top filter contrast-[1.03] group-hover:scale-105 transition-transform duration-700"
                              />
                            </div>

                            {/* Bottom Badge Strip */}
                            <div className="p-4 bg-[#08111F]/90 backdrop-blur-md border-t border-white/10 flex items-center justify-between">
                              <span className="font-jetbrains text-[10px] text-[#38F2FF] tracking-widest uppercase font-semibold flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#38F2FF] animate-pulse" />
                                <span>ACTIVE SPECIALIST</span>
                              </span>
                              <span className="font-jetbrains text-[10px] text-gray-400">
                                DEVENGINE // {memberIndex}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Center Spacer on Desktop to leave room for the central line */}
                        <div className="hidden lg:block lg:col-span-2 lg:order-2" />

                        {/* Member Dossier / Bio Card */}
                        <div
                          className={`lg:col-span-5 ${
                            isEven ? "lg:order-3" : "lg:order-1"
                          }`}
                        >
                          <div className="p-8 sm:p-10 rounded-3xl bg-[#08111F]/80 backdrop-blur-2xl border border-white/10 group-hover:border-[#38F2FF]/40 transition-all duration-300 space-y-6 shadow-2xl group-hover:shadow-[0_0_40px_rgba(56,242,255,0.1)]">
                            {/* Role Category Tag */}
                            <div className="flex items-center justify-between">
                              <span className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 font-jetbrains text-[11px] text-[#38F2FF] tracking-wider uppercase font-semibold">
                                {member.role.toUpperCase()}
                              </span>
                              <span className="font-jetbrains text-xs text-gray-400">
                                PROFILE #{memberIndex}
                              </span>
                            </div>

                            {/* Member Name & Role Heading */}
                            <div>
                              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white font-['Space_Grotesk'] tracking-tight">
                                {member.name}
                              </h3>
                              <p className="text-xs sm:text-sm font-jetbrains text-[#38F2FF] tracking-wide mt-1.5 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[16px]">
                                  verified
                                </span>
                                <span>{member.role}</span>
                              </p>
                            </div>

                            {/* Bio Description */}
                            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                              {member.bio}
                            </p>

                            {/* Skills / Tech Matrix */}
                            {member.skills && member.skills.length > 0 && (
                              <div className="space-y-2 pt-2">
                                <span className="block font-jetbrains text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                                  CORE SPECIALIZATIONS &amp; STACK
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {member.skills.map((skill, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 hover:border-[#38F2FF]/40 hover:bg-[#38F2FF]/10 transition-all text-xs font-jetbrains text-[#BAC9CB] hover:text-white"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Contact & Social Links */}
                            {member.socialLinks && (member.socialLinks.linkedin || member.socialLinks.github) && (
                              <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10">

                                {member.socialLinks.linkedin && (
                                  <a
                                    href={member.socialLinks.linkedin}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#38F2FF]/15 text-gray-300 hover:text-[#38F2FF] border border-white/10 hover:border-[#38F2FF]/40 transition-all text-xs font-jetbrains flex items-center gap-1.5"
                                    title="LinkedIn Profile"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">
                                      work
                                    </span>
                                    <span>LinkedIn</span>
                                  </a>
                                )}

                                {member.socialLinks.github && (
                                  <a
                                    href={member.socialLinks.github}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#38F2FF]/15 text-gray-300 hover:text-[#38F2FF] border border-white/10 hover:border-[#38F2FF]/40 transition-all text-xs font-jetbrains flex items-center gap-1.5"
                                    title="GitHub Profile"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">
                                      code
                                    </span>
                                    <span>GitHub</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* SECTION 4: FINAL PROTOCOL (CALL TO ACTION) */}
        <section className="py-24 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto text-center">
          <div className="relative rounded-[40px] p-12 sm:p-20 bg-gradient-to-b from-[#161C28]/90 to-[#08111F]/90 backdrop-blur-2xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[#38F2FF]/5 via-transparent to-[#3495EA]/5 pointer-events-none" />

            <span className="font-jetbrains text-xs text-[#38F2FF] tracking-[0.25em] uppercase font-bold mb-4 block">
              FINAL PROTOCOL
            </span>

            <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white font-['Space_Grotesk'] mb-6 tracking-tight">
              Let&apos;s Build Something{" "}
              <span className="bg-gradient-to-r from-[#38F2FF] to-[#3495EA] bg-clip-text text-transparent">
                Remarkable.
              </span>
            </h2>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
              Whether you are an ambitious startup preparing your v1 mobile
              launch, an enterprise demanding an architecture audit, or an
              engineer looking to acquire full-source licenses.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <a
                href="/home#contact"
                className="px-10 py-4 rounded-full bg-[#38F2FF] hover:bg-[#78F5FF] text-[#030712] font-jetbrains text-xs font-bold tracking-widest uppercase transition-all shadow-[0_0_30px_rgba(56,242,255,0.4)] hover:shadow-[0_0_45px_rgba(56,242,255,0.8)] hover:scale-105 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">mail</span>
                <span>Initiate Contact</span>
              </a>

              <a
                href={founder.portfolioUrl || "https://thedevhamim.vercel.app/"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-jetbrains text-xs text-gray-300 hover:text-[#38F2FF] transition-colors underline underline-offset-8 decoration-[#38F2FF]/40 tracking-wider font-medium"
              >
                Visit Hamim&apos;s Portfolio for Detailed Projects &amp; Journey ↗
              </a>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
