import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingFooter from "@/components/landing/LandingFooter";
import { PrivacyConfig } from "@/types/privacy";
import {
  getPrivacyConfig,
  DEFAULT_PRIVACY_CONFIG,
} from "@/lib/services/privacyService";

export default function PrivacyPolicyPage() {
  const [config, setConfig] = useState<PrivacyConfig>(DEFAULT_PRIVACY_CONFIG);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("section-1");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getPrivacyConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.warn("Using fallback privacy config:", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Reading Progress Bar & Back to top visibility & Scrollspy
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setShowBackToTop(winScroll > 400);

      // Active TOC scroll detection
      const sections = [
        "section-1",
        "section-2",
        "section-3",
        "section-4",
        "section-5",
      ];
      for (const sId of sections) {
        const el = document.getElementById(sId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 260 && rect.bottom >= 120) {
            setActiveSection(sId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const offset = 120;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveSection(id);
    }
  };

  return (
    <>
      <Head>
        <title>{config.header.title} - DevEngine</title>
        <meta name="description" content={config.header.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Top Reading Progress Bar */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-[#38f2ff] z-50 shadow-[0_0_10px_#38f2ff] transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#02040A]">
        {/* Minimal High-Tech Top Header Bar */}
        <header className="fixed top-0 w-full z-40 bg-[#02040A]/85 backdrop-blur-xl border-b border-white/5 py-4 px-6 sm:px-12 flex justify-between items-center">
          <Link href="/home" className="flex items-center gap-3">
            <Image
              src="/assets/DevEngine-logo-on-dark2.png"
              alt="DevEngine"
              width={150}
              height={36}
              priority
              className="h-7 w-auto object-contain"
            />
          </Link>

          <Link
            href="/home"
            className="font-jetbrains text-xs tracking-wider text-[#38f2ff] hover:underline flex items-center gap-1.5"
          >
            ← Return to Console
          </Link>
        </header>

        {/* Hero Section */}
        <div className="relative w-full min-h-[440px] pt-32 pb-16 flex flex-col justify-center items-center px-6 sm:px-12 overflow-hidden border-b border-white/5">
          {/* Background Concentric Cyber Rings & Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
            <div className="w-[750px] h-[750px] border border-[#38f2ff]/20 rounded-full flex items-center justify-center">
              <div className="w-[550px] h-[550px] border border-[#38f2ff]/10 rounded-full border-dashed" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#02040A]/60 to-[#02040A]" />

          {/* Hero Content */}
          <div className="relative z-10 max-w-4xl w-full mx-auto text-center flex flex-col items-center gap-6">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161c28]/80 border border-white/10 font-jetbrains text-xs text-[#849495] shadow-[0_0_15px_rgba(56,242,255,0.05)]">
                <span className="w-2 h-2 rounded-full bg-[#38f2ff] shadow-[0_0_8px_rgba(56,242,255,0.8)] animate-pulse" />
                {config.header.badgeText}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 font-jetbrains text-xs text-[#849495]">
                <svg
                  className="w-3.5 h-3.5 text-[#38f2ff]/70"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="12" cy="12" r="10" strokeWidth="2" />
                  <polyline points="12 6 12 12 16 14" strokeWidth="2" />
                </svg>
                {config.header.lastUpdated}
              </span>
            </div>

            <h1 className="font-space font-bold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white/90 to-white/60">
              {config.header.title}
            </h1>

            <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl leading-relaxed">
              {config.header.subtitle}
            </p>
          </div>
        </div>

        {/* Main Content Layout */}
        <main className="w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-16 flex flex-col md:flex-row gap-12 lg:gap-16 relative">
          {/* Left Column: Sticky TOC */}
          <aside className="hidden md:block w-64 shrink-0 relative">
            <div className="sticky top-28 bg-[#080e1a]/90 backdrop-blur-xl rounded-xl p-6 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
              <h3 className="font-jetbrains text-[11px] text-[#849495] mb-5 tracking-widest uppercase font-semibold">
                Contents
              </h3>
              <nav className="flex flex-col gap-1 relative" id="toc">
                <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-white/10" />

                {[
                  { id: "section-1", num: config.overview.sectionNum || "01", label: config.overview.sectionTitle },
                  { id: "section-2", num: config.informationCollected.sectionNum || "02", label: config.informationCollected.sectionTitle },
                  { id: "section-3", num: config.dataFlow.sectionNum || "03", label: config.dataFlow.sectionTitle },
                  { id: "section-4", num: config.cookies.sectionNum || "04", label: config.cookies.sectionTitle },
                  { id: "section-5", num: config.userRights.sectionNum || "05", label: config.userRights.sectionTitle },
                ].map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e, item.id)}
                      className={`relative pl-4 py-2 text-sm transition-all duration-200 border-l group flex items-center gap-3 ${
                        isActive
                          ? "text-[#38f2ff] border-l-[#38f2ff] bg-gradient-to-r from-[#38f2ff]/10 to-transparent font-medium shadow-[inset_1px_0_0_#38f2ff]"
                          : "text-[#849495] border-l-transparent hover:text-[#38f2ff] hover:border-l-[#38f2ff]/50"
                      }`}
                    >
                      <span
                        className={`font-jetbrains text-[11px] transition-colors ${
                          isActive
                            ? "text-[#38f2ff]"
                            : "text-[#849495]/70 group-hover:text-[#38f2ff]/70"
                        }`}
                      >
                        {item.num}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Right Column: Dynamic Sections Content */}
          <article className="flex-1 max-w-3xl relative space-y-24">
            {/* Section 1: Overview */}
            <section id="section-1" className="scroll-mt-32">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-space text-5xl sm:text-6xl text-white/10 font-bold tabular-nums">
                  {config.overview.sectionNum}
                </span>
                <h2 className="font-space text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {config.overview.sectionTitle}
                </h2>
              </div>

              <div className="space-y-6 text-[#bac9cb] leading-relaxed text-base sm:text-lg">
                <p>{config.overview.leadText}</p>
                <p className="text-sm sm:text-base text-[#849495]">
                  {config.overview.subText}
                </p>

                {/* Key Principle Callout Card */}
                <div className="relative bg-[#161c28]/60 backdrop-blur-md p-6 rounded-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.3)] mt-8 overflow-hidden group hover:border-[#38f2ff]/30 transition-colors">
                  <div className="absolute top-0 left-0 h-full w-1 bg-[#38f2ff] shadow-[0_0_12px_#38f2ff]" />
                  <h4 className="font-space text-lg font-medium text-[#38f2ff] mb-2 flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-[#38f2ff]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {config.overview.keyPrincipleTitle}
                  </h4>
                  <p className="text-[#dde2f3] text-sm sm:text-base">
                    {config.overview.keyPrincipleText}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Information We Collect */}
            <section id="section-2" className="scroll-mt-32">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-space text-5xl sm:text-6xl text-white/10 font-bold tabular-nums">
                  {config.informationCollected.sectionNum}
                </span>
                <h2 className="font-space text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {config.informationCollected.sectionTitle}
                </h2>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="font-space text-xl font-medium text-white mb-3">
                    Information You Provide to Us
                  </h3>
                  <p className="text-sm sm:text-base text-[#849495] leading-relaxed mb-5">
                    {config.informationCollected.providedIntro}
                  </p>

                  <ul className="space-y-3.5">
                    {config.informationCollected.providedItems.map((item) => (
                      <li key={item.id} className="flex items-start gap-3">
                        <svg
                          className="w-5 h-5 text-[#38f2ff] shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-sm sm:text-base text-[#bac9cb]">
                          <strong className="text-white font-medium">
                            {item.title}{" "}
                          </strong>
                          {item.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-space text-xl font-medium text-white mb-3">
                    {config.informationCollected.autoTitle}
                  </h3>
                  <p className="text-sm sm:text-base text-[#849495] leading-relaxed">
                    {config.informationCollected.autoText}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 3: Data Flow & Security (Interactive Visualization) */}
            <section id="section-3" className="scroll-mt-32">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-space text-5xl sm:text-6xl text-white/10 font-bold tabular-nums">
                  {config.dataFlow.sectionNum}
                </span>
                <h2 className="font-space text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {config.dataFlow.sectionTitle}
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#849495] leading-relaxed mb-8">
                {config.dataFlow.introText}
              </p>

              {/* High-Tech Node Flow Visualization Container */}
              <div className="relative bg-[#030712] rounded-2xl p-8 sm:p-10 border border-white/10 shadow-[inset_0_0_50px_rgba(0,0,0,0.9)] overflow-hidden">
                {/* Radial Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,242,255,0.08)_0%,transparent_70%)] pointer-events-none" />

                <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 py-6 z-10">
                  {/* Node 1: User Client */}
                  <div className="flex flex-col items-center gap-3 w-32 text-center group">
                    <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center bg-[#080e1a] group-hover:border-[#38f2ff] group-hover:shadow-[0_0_20px_rgba(56,242,255,0.3)] transition-all">
                      <svg
                        className="w-6 h-6 text-[#849495] group-hover:text-[#38f2ff] transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    <span className="font-jetbrains text-xs font-semibold tracking-wider text-white">
                      {config.dataFlow.node1Label}
                    </span>
                    <span className="text-[11px] text-[#849495]">
                      {config.dataFlow.node1Sub}
                    </span>
                  </div>

                  {/* Connector 1 (Desktop: Horizontal line with animated packet; Mobile: Vertical) */}
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-white/10 via-[#38f2ff]/60 to-white/10 relative hidden md:block w-full">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-[#38f2ff] top-1/2 -translate-y-1/2 left-1/2 animate-ping shadow-[0_0_8px_#38f2ff]" />
                  </div>
                  <div className="w-[2px] h-8 bg-gradient-to-b from-white/10 via-[#38f2ff]/60 to-white/10 md:hidden" />

                  {/* Node 2: DevEngine Core */}
                  <div className="flex flex-col items-center gap-3 w-36 text-center">
                    <div className="w-16 h-16 rounded-2xl border border-[#38f2ff]/40 flex items-center justify-center bg-[#38f2ff]/10 shadow-[0_0_25px_rgba(56,242,255,0.2)]">
                      <svg
                        className="w-8 h-8 text-[#38f2ff]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="2" y="2" width="20" height="8" rx="2" strokeWidth="1.5" />
                        <rect x="2" y="14" width="20" height="8" rx="2" strokeWidth="1.5" />
                        <line x1="6" y1="6" x2="6.01" y2="6" strokeWidth="2" strokeLinecap="round" />
                        <line x1="6" y1="18" x2="6.01" y2="18" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="font-jetbrains text-xs font-bold tracking-wider text-[#38f2ff]">
                      {config.dataFlow.node2Label}
                    </span>
                    <span className="text-[11px] text-[#849495]">
                      {config.dataFlow.node2Sub}
                    </span>
                  </div>

                  {/* Connector 2 */}
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-white/10 via-[#38f2ff]/60 to-white/10 relative hidden md:block w-full">
                    <div className="absolute w-2.5 h-2.5 rounded-full bg-[#9ecaff] top-1/2 -translate-y-1/2 left-1/2 animate-ping shadow-[0_0_8px_#9ecaff]" />
                  </div>
                  <div className="w-[2px] h-8 bg-gradient-to-b from-white/10 via-[#38f2ff]/60 to-white/10 md:hidden" />

                  {/* Node 3: Secure Storage */}
                  <div className="flex flex-col items-center gap-3 w-32 text-center group">
                    <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center bg-[#080e1a] group-hover:border-[#38f2ff] group-hover:shadow-[0_0_20px_rgba(56,242,255,0.3)] transition-all">
                      <svg
                        className="w-6 h-6 text-[#849495] group-hover:text-[#38f2ff] transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                        />
                      </svg>
                    </div>
                    <span className="font-jetbrains text-xs font-semibold tracking-wider text-white">
                      {config.dataFlow.node3Label}
                    </span>
                    <span className="text-[11px] text-[#849495]">
                      {config.dataFlow.node3Sub}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Cookies & Tracking */}
            <section id="section-4" className="scroll-mt-32">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-space text-5xl sm:text-6xl text-white/10 font-bold tabular-nums">
                  {config.cookies.sectionNum}
                </span>
                <h2 className="font-space text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {config.cookies.sectionTitle}
                </h2>
              </div>

              <div className="space-y-4 text-sm sm:text-base text-[#849495] leading-relaxed">
                <p>{config.cookies.paragraph1}</p>
                <p>{config.cookies.paragraph2}</p>
              </div>
            </section>

            {/* Section 5: User Rights */}
            <section id="section-5" className="scroll-mt-32 pb-16">
              <div className="flex items-baseline gap-4 mb-6">
                <span className="font-space text-5xl sm:text-6xl text-white/10 font-bold tabular-nums">
                  {config.userRights.sectionNum}
                </span>
                <h2 className="font-space text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                  {config.userRights.sectionTitle}
                </h2>
              </div>

              <p className="text-sm sm:text-base text-[#849495] leading-relaxed mb-6">
                {config.userRights.introText}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {config.userRights.rights.map((right) => (
                  <div
                    key={right.id}
                    className="p-5 rounded-xl bg-[#0e131f]/50 border border-white/5 hover:border-[#38f2ff]/30 hover:bg-white/[0.02] transition-all group cursor-default"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38f2ff] group-hover:shadow-[0_0_6px_#38f2ff] transition-shadow" />
                      <h4 className="font-space text-base font-semibold text-white group-hover:text-[#38f2ff] transition-colors">
                        {right.title}
                      </h4>
                    </div>
                    <p className="text-sm text-[#849495] leading-relaxed">
                      {right.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </article>
        </main>

        <LandingFooter />

        {/* Floating Back to Top Button */}
        <button
          onClick={scrollToTop}
          aria-label="Back to top"
          className={`fixed bottom-8 right-8 z-40 w-12 h-12 rounded-full bg-[#161c28]/90 backdrop-blur-md border border-white/10 text-[#849495] hover:text-[#38f2ff] hover:border-[#38f2ff]/50 shadow-2xl flex items-center justify-center transition-all duration-300 ${
            showBackToTop
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
