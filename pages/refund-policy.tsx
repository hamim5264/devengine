import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingFooter from "@/components/landing/LandingFooter";
import { RefundConfig, RefundSection } from "@/types/refund";
import {
  getRefundConfig,
  DEFAULT_REFUND_CONFIG,
} from "@/lib/services/refundService";

export default function RefundPolicyPage() {
  const [config, setConfig] = useState<RefundConfig>(DEFAULT_REFUND_CONFIG);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [activeSection, setActiveSection] = useState("core-policy");
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const data = await getRefundConfig();
        if (isMounted) setConfig(data);
      } catch (err) {
        console.warn("Using fallback refund config:", err);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  // Scroll Progress & Section tracking
  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      setScrollProgress(scrolled);
      setShowBackToTop(winScroll > 400);

      const sectionIds = [
        "core-policy",
        "digital-goods-rationale",
        "verification-audit",
        "dispute-resolution",
        "exceptions-notice",
        "contact-support",
      ];

      for (const sId of sectionIds) {
        const el = document.getElementById(sId);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 240 && rect.bottom >= 120) {
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

  const handleCopyLink = (sectionId: string) => {
    const url = `${window.location.origin}/refund-policy#${sectionId}`;
    navigator.clipboard.writeText(url);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const matchesSearch = (text: string) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const allSections: { key: keyof RefundConfig; section: RefundSection }[] = [
    { key: "corePolicy", section: config.corePolicy },
    { key: "digitalGoodsRationale", section: config.digitalGoodsRationale },
    { key: "verificationAudit", section: config.verificationAudit },
    { key: "disputeResolution", section: config.disputeResolution },
    { key: "exceptionsNotice", section: config.exceptionsNotice },
    { key: "contactSupport", section: config.contactSupport },
  ];

  return (
    <>
      <Head>
        <title>{config.header.title} — DevEngine</title>
        <meta name="description" content={config.header.subtitle} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Reading Progress Line */}
      <div
        className="fixed top-0 left-0 h-[2px] bg-amber-400 z-50 shadow-[0_0_12px_#f59e0b] transition-all duration-75"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] font-sans selection:bg-amber-400 selection:text-[#02040A]">
        {/* Atmospheric Backdrops */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(28,20,10,0.85)_0%,rgba(2,4,10,1)_100%)] z-[-9] pointer-events-none" />
        <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(132,148,149,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(132,148,149,0.03)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none" />
        <div className="fixed -top-40 -left-40 w-[600px] h-[600px] bg-amber-500/[0.04] rounded-full blur-[140px] pointer-events-none z-[-7]" />
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#38f2ff]/[0.03] rounded-full blur-[160px] pointer-events-none z-[-7]" />

        {/* Minimal Navigation Bar */}
        <header className="fixed top-0 w-full z-40 bg-[#02040A]/85 backdrop-blur-xl border-b border-white/5 py-4 px-6 sm:px-12 flex justify-between items-center">
          <Link href="/home" className="flex items-center gap-3 group">
            <Image
              src="/assets/DevEngine-logo-on-dark2.png"
              alt="DevEngine"
              width={160}
              height={40}
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/checkout"
              className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Checkout</span>
            </Link>

            <button
              onClick={() => window.print()}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono text-amber-300 transition flex items-center gap-1.5"
              title="Print or Save as PDF"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              <span className="hidden sm:inline">Print / PDF</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="pt-28 pb-24 px-4 sm:px-8 max-w-7xl mx-auto">
          {/* Hero Header */}
          <div className="py-12 border-b border-white/10 relative">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
                {config.header.badgeText}
              </span>
              <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-mono text-[11px] font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                {config.header.strictBadge}
              </span>
              <span className="text-gray-500 text-xs font-mono">
                Status: {config.header.policyStatus} • Last Revised: {config.header.lastUpdated}
              </span>
            </div>

            <h1 className="font-space font-bold text-3xl sm:text-5xl text-white tracking-tight mb-4">
              {config.header.title}
            </h1>
            <p className="font-sans text-base sm:text-lg text-[#849495] max-w-3xl leading-relaxed">
              {config.header.subtitle}
            </p>

            {/* Prominent Policy Warning Banner */}
            <div className="mt-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-500/30 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-2xl">policy</span>
              </div>
              <div>
                <h2 className="font-space font-bold text-base text-amber-300 mb-1">
                  Important Financial Notice Before Payment Submission
                </h2>
                <p className="text-xs text-amber-200/90 leading-relaxed font-sans">
                  Digital architecture source code, repository invitations, and software licenses are non-tangible, irrevocable assets. Once verified and provisioned, purchases are strictly non-refundable. Please confirm all technical requirements prior to sending payment.
                </p>
              </div>
            </div>

            {/* Quick Search Bar */}
            <div className="mt-8 max-w-md relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search refund guidelines (e.g., duplicate, TrxID, dispute)..."
                className="w-full bg-[#08111f] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 font-mono transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-mono"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Grid Layout: TOC Sidebar + Content Clauses */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-12">
            {/* Sticky Table of Contents Sidebar */}
            <aside className="lg:col-span-4 hidden lg:block">
              <div className="sticky top-28 bg-[#08111f]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl space-y-4">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-400 uppercase tracking-wider pb-3 border-b border-white/10">
                  <span className="material-symbols-outlined text-base">list_alt</span>
                  <span>Policy Sections</span>
                </div>

                <nav className="space-y-1 text-xs font-mono">
                  {allSections.map(({ section }) => {
                    const isCurrent = activeSection === section.id;
                    return (
                      <a
                        key={section.id}
                        href={`#${section.id}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                          isCurrent
                            ? "bg-amber-500/15 text-amber-300 font-bold border-l-2 border-amber-400"
                            : "text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <span className="text-[10px] opacity-60 font-semibold">{section.number}.</span>
                        <span className="truncate">{section.title}</span>
                      </a>
                    );
                  })}
                </nav>

                <div className="pt-4 border-t border-white/10">
                  <div className="p-3 bg-[#050b14] rounded-xl border border-white/5 text-[11px] text-gray-400 space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-amber-400 text-sm">support_agent</span>
                      <span>Need Pre-Purchase Support?</span>
                    </div>
                    <p className="text-[10px] leading-normal text-gray-400">
                      Reach our engineering team directly via WhatsApp (+880 1724879284) for project architecture consultations.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* Articles List */}
            <div className="lg:col-span-8 space-y-8">
              {allSections.map(({ section }) => {
                const isMatching =
                  matchesSearch(section.title) ||
                  section.paragraphs.some((p) => matchesSearch(p)) ||
                  (section.bullets && section.bullets.some((b) => matchesSearch(b)));

                if (!isMatching) return null;

                return (
                  <section
                    key={section.id}
                    id={section.id}
                    className="p-6 sm:p-8 rounded-2xl bg-[#08111f]/70 border border-white/10 hover:border-white/20 transition backdrop-blur-xl relative scroll-mt-28"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-amber-400 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                          {section.number}
                        </span>
                        <h2 className="font-space font-bold text-xl sm:text-2xl text-white">
                          {section.title}
                        </h2>
                      </div>

                      <button
                        onClick={() => handleCopyLink(section.id)}
                        className="text-gray-400 hover:text-amber-400 transition p-1.5 rounded-lg hover:bg-white/5 flex items-center gap-1 text-[11px] font-mono"
                        title="Copy direct link to section"
                      >
                        <span className="material-symbols-outlined text-base">link</span>
                        <span className="hidden sm:inline">
                          {copiedSection === section.id ? "Copied!" : "Link"}
                        </span>
                      </button>
                    </div>

                    <div className="space-y-3.5 text-sm leading-relaxed text-gray-300 font-sans">
                      {section.paragraphs.map((p, idx) => (
                        <p key={idx}>{p}</p>
                      ))}

                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="space-y-2 pt-2 border-t border-white/5 font-sans">
                          {section.bullets.map((b, bIdx) => (
                            <li key={bIdx} className="flex items-start gap-2.5 text-xs text-gray-300">
                              <span className="material-symbols-outlined text-amber-400 text-base shrink-0 mt-0.5">
                                arrow_right
                              </span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>
                );
              })}

              {/* Commercial License Cross-Reference */}
              <div className="p-6 rounded-2xl bg-[#38f2ff]/5 border border-[#38f2ff]/20 text-[#dde2f3] space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#38f2ff] text-xl">description</span>
                  <h3 className="font-space font-bold text-base text-[#38f2ff]">
                    Cross-Reference: Commercial License Agreement
                  </h3>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  Learn more about your commercial usage rights, permitted production deployments, source code access, and intellectual property terms.
                </p>
                <div className="pt-2">
                  <Link
                    href="/commercial-license"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[#38f2ff] hover:text-white underline decoration-[#38f2ff]/50 hover:decoration-white"
                  >
                    <span>Read Commercial License Agreement</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>

        <LandingFooter />

        {/* Back to Top Floating Button */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-3 rounded-xl bg-[#08111f] border border-amber-400/40 text-amber-400 hover:bg-amber-400 hover:text-[#02040A] shadow-[0_0_20px_rgba(245,158,11,0.3)] transition duration-200 flex items-center justify-center cursor-pointer"
            title="Scroll to Top"
          >
            <span className="material-symbols-outlined text-xl">arrow_upward</span>
          </button>
        )}
      </div>
    </>
  );
}
