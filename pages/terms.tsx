import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingFooter from "@/components/landing/LandingFooter";
import { TermsConfig } from "@/types/terms";
import {
  getTermsConfig,
  DEFAULT_TERMS_CONFIG,
} from "@/lib/services/termsService";

export default function TermsPage() {
  const [config, setConfig] = useState<TermsConfig>(DEFAULT_TERMS_CONFIG);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("agreement");

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getTermsConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.warn("Using fallback terms config:", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Scroll Progress Bar & Back to top visibility
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setShowBackToTop(winScroll > 400);

      // Simple active TOC detection
      const sections = [
        "agreement",
        "eligibility",
        "accounts",
        "software-purchases",
        "custom-dev",
        "ip",
      ];
      for (const sId of sections) {
        const el = document.getElementById(sId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 100) {
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

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <>
      <Head>
        <title>Terms & Conditions - DevEngine</title>
        <meta
          name="description"
          content="The rules and responsibilities that govern your use of DevEngine products, services, and digital platforms."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Top Reading Progress Line */}
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

        <main className="relative z-10 pt-32 pb-24 px-6 sm:px-10 md:px-16 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Header Title Section (Spans 12 cols) */}
          <header className="col-span-1 md:col-span-12 mb-12 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 mb-6 backdrop-blur-xl shadow-[0_0_20px_rgba(56,242,255,0.1)]">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-pulse shadow-[0_0_8px_#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-semibold">
                {config.header.badgeText}
              </span>
            </div>

            <h1 className="font-space-grotesk text-4xl sm:text-6xl md:text-7xl font-bold text-white mb-6 drop-shadow-[0_0_32px_rgba(56,242,255,0.25)] tracking-tight">
              {config.header.title}
            </h1>

            <p className="font-sans text-base sm:text-lg md:text-xl text-[#bac9cb] max-w-3xl mx-auto mb-8 leading-relaxed font-normal">
              {config.header.subtitle}
            </p>

            <div className="flex items-center gap-6 font-jetbrains text-xs text-[#849495]">
              <span>Last Updated: {config.header.lastUpdated}</span>
              <span className="w-1 h-1 rounded-full bg-[#3b494b]" />
              <span className="flex items-center gap-1.5 text-[#38f2ff] font-semibold">
                <span className="material-symbols-outlined text-[16px]">
                  check_circle
                </span>
                {config.header.statusText}
              </span>
            </div>
          </header>

          {/* Sticky Table of Contents Sidebar (Spans 3 cols) */}
          <aside className="col-span-1 md:col-span-4 lg:col-span-3 hidden md:block">
            <div className="sticky top-28 rounded-2xl bg-[#08111f]/80 border border-white/10 p-6 backdrop-blur-xl shadow-[0_0_30px_rgba(56,242,255,0.05)]">
              {/* Search */}
              <div className="relative mb-6">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#849495] text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#02040A]/80 border border-white/10 rounded-xl py-2 pl-9 pr-3 font-sans text-xs text-white placeholder:text-[#849495] focus:outline-none focus:border-[#38f2ff] transition-all"
                />
              </div>

              {/* TOC Links */}
              <nav className="flex flex-col gap-3 font-jetbrains text-xs font-semibold">
                {[
                  { id: "agreement", label: "01. AGREEMENT" },
                  { id: "eligibility", label: "02. ELIGIBILITY" },
                  { id: "accounts", label: "03. ACCOUNTS" },
                  { id: "software-purchases", label: "04. SOFTWARE PURCHASES" },
                  { id: "custom-dev", label: "05. CUSTOM DEVELOPMENT" },
                  { id: "ip", label: "06. INTELLECTUAL PROPERTY" },
                ].map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={`pl-3 py-1 border-l-2 transition-all block ${
                      activeSection === item.id
                        ? "border-[#38f2ff] text-[#38f2ff] drop-shadow-[0_0_8px_#38f2ff]"
                        : "border-transparent text-[#849495] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area (Spans 8 or 9 cols) */}
          <div className="col-span-1 md:col-span-8 lg:col-span-9 rounded-2xl bg-[#08111f]/70 border border-white/10 p-6 sm:p-10 backdrop-blur-xl shadow-2xl space-y-16">
            {/* 01. Agreement */}
            {matchesSearch(config.agreement.title + config.agreement.paragraphs.join(" ")) && (
              <section id="agreement" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    {config.agreement.number}
                  </span>
                  {config.agreement.title}
                </h2>
                <div className="space-y-4 font-sans text-sm sm:text-base text-[#bac9cb] leading-relaxed font-normal">
                  {config.agreement.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* 02. Eligibility */}
            {matchesSearch(config.eligibility.title + config.eligibility.paragraphs.join(" ")) && (
              <section id="eligibility" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    {config.eligibility.number}
                  </span>
                  {config.eligibility.title}
                </h2>
                <div className="space-y-4 font-sans text-sm sm:text-base text-[#bac9cb] leading-relaxed font-normal">
                  {config.eligibility.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* 03. Accounts */}
            {matchesSearch(config.accounts.title + config.accounts.paragraphs.join(" ")) && (
              <section id="accounts" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    {config.accounts.number}
                  </span>
                  {config.accounts.title}
                </h2>
                <div className="space-y-4 font-sans text-sm sm:text-base text-[#bac9cb] leading-relaxed font-normal">
                  {config.accounts.paragraphs.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* 04. Software Purchases & Ownership Lifecycle */}
            {matchesSearch(config.lifecycle.title + config.lifecycle.description) && (
              <section id="software-purchases" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-3 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    04
                  </span>
                  {config.lifecycle.title}
                </h2>
                <p className="font-sans text-sm sm:text-base text-[#bac9cb] mb-8 font-normal">
                  {config.lifecycle.description}
                </p>

                {/* Technical Flow Diagram */}
                <div className="relative flex flex-col md:flex-row justify-between items-center bg-[#02040A]/80 p-6 sm:p-8 rounded-2xl border border-white/10 overflow-hidden gap-4 md:gap-2">
                  {config.lifecycle.steps.map((step, idx) => (
                    <React.Fragment key={step.id}>
                      <div className="flex flex-col items-center text-center z-10 w-full md:w-auto">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-all ${
                            step.id === "ownership"
                              ? "bg-[#38f2ff]/10 border border-[#38f2ff] shadow-[0_0_15px_rgba(56,242,255,0.3)] text-[#38f2ff]"
                              : "bg-[#0e1626] border border-white/10 text-[#38f2ff]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {step.icon}
                          </span>
                        </div>
                        <span className="font-jetbrains text-[11px] font-bold text-white tracking-wider">
                          {step.title}
                        </span>
                      </div>

                      {idx < config.lifecycle.steps.length - 1 && (
                        <>
                          <div className="hidden md:block h-px flex-1 bg-white/10 relative mx-2">
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 material-symbols-outlined text-white/30 text-[14px]">
                              chevron_right
                            </span>
                          </div>
                          <div className="md:hidden w-px h-6 bg-white/10 relative">
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 material-symbols-outlined text-white/30 text-[14px] rotate-90">
                              chevron_right
                            </span>
                          </div>
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </section>
            )}

            {/* 05. Custom Development Payment Structure */}
            {matchesSearch(config.paymentStructure.title) && (
              <section id="custom-dev" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    05
                  </span>
                  {config.paymentStructure.title}
                </h2>

                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#02040A]/60">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className="py-3.5 px-4 font-jetbrains text-xs text-[#849495] uppercase">
                          PHASE
                        </th>
                        <th className="py-3.5 px-4 font-jetbrains text-xs text-[#849495] uppercase">
                          DESCRIPTION
                        </th>
                        <th className="py-3.5 px-4 font-jetbrains text-xs text-[#849495] uppercase text-right">
                          OBLIGATION
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {config.paymentStructure.phases.map((item, pIdx) => (
                        <tr
                          key={pIdx}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-4 font-jetbrains text-xs text-[#38f2ff] font-bold">
                            {item.phase}
                          </td>
                          <td className="py-4 px-4 text-[#bac9cb] text-xs sm:text-sm">
                            {item.description}
                          </td>
                          <td className="py-4 px-4 text-right text-white font-jetbrains text-xs sm:text-sm font-semibold">
                            {item.obligation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* 06. Intellectual Property Rights */}
            {matchesSearch(config.intellectualProperty.title) && (
              <section id="ip" className="scroll-mt-28">
                <h2 className="font-space-grotesk text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-[#38f2ff] font-jetbrains text-sm font-bold px-2 py-0.5 rounded bg-[#38f2ff]/10 border border-[#38f2ff]/20">
                    06
                  </span>
                  {config.intellectualProperty.title}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DevEngine Owned */}
                  <div className="bg-[#02040A]/70 border border-white/10 p-6 rounded-2xl">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="material-symbols-outlined text-[#849495]">
                        dns
                      </span>
                      <h3 className="font-jetbrains text-xs text-[#849495] uppercase font-bold tracking-wider">
                        DEVENGINE OWNED
                      </h3>
                    </div>
                    <ul className="space-y-3 font-sans text-sm text-[#bac9cb]">
                      {config.intellectualProperty.devEngineOwned.map((item, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[#38f2ff] text-[16px] mt-0.5 flex-shrink-0">
                            remove
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Client Owned */}
                  <div className="bg-[#38f2ff]/5 border border-[#38f2ff]/30 p-6 rounded-2xl shadow-[0_0_20px_rgba(56,242,255,0.06)]">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="material-symbols-outlined text-[#38f2ff]">
                        key
                      </span>
                      <h3 className="font-jetbrains text-xs text-[#38f2ff] uppercase font-bold tracking-wider">
                        CLIENT OWNED
                      </h3>
                    </div>
                    <ul className="space-y-3 font-sans text-sm text-[#bac9cb]">
                      {config.intellectualProperty.clientOwned.map((item, cIdx) => (
                        <li key={cIdx} className="flex items-start gap-2">
                          <span className="material-symbols-outlined text-[#38f2ff] text-[16px] mt-0.5 flex-shrink-0">
                            check
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        <LandingFooter />

        {/* Floating Back to Top Button */}
        <button
          type="button"
          onClick={scrollToTop}
          className={`fixed bottom-8 right-8 w-12 h-12 bg-[#38f2ff] text-[#002022] rounded-full shadow-[0_0_25px_rgba(56,242,255,0.5)] flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 cursor-pointer ${
            showBackToTop ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
          }`}
          aria-label="Back to top"
        >
          <span className="material-symbols-outlined text-2xl font-bold">
            arrow_upward
          </span>
        </button>
      </div>
    </>
  );
}
