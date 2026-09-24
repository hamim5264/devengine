import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import {
  AppLabItem,
} from "@/types/launchpad";
import {
  DEFAULT_APP_LAB_ITEMS,
  getCleanAppThumbnail,
  DUMMY_APP_IMAGES,
} from "@/lib/services/launchpadService";

export default function AppDetails() {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppLabItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "appLab", String(slug)));
        if (snap.exists()) {
          setApp({ id: snap.id, slug: snap.id, ...(snap.data() as any) });
        } else {
          // Check fallback items
          const fallback = DEFAULT_APP_LAB_ITEMS.find(
            (a) => a.slug === slug || a.id === slug
          );
          if (fallback) {
            setApp(fallback);
          } else {
            router.replace("/launchpad#apps");
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching app details:", err);
        const fallback = DEFAULT_APP_LAB_ITEMS.find(
          (a) => a.slug === slug || a.id === slug
        );
        if (fallback) {
          setApp(fallback);
        } else {
          router.replace("/launchpad#apps");
          return;
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-[#030712]">
        <HelixLoader size={56} color="#38f2ff" text="LOADING APP SPECIFICATIONS..." />
      </div>
    );
  }

  if (!app) return null;

  const thumbnail = getCleanAppThumbnail(app);

  // Default developer usage warning if not explicitly configured in Firestore
  const defaultDevUsage =
    app.devUsage ||
    "This build is distributed under DevEngine Early Access Program for authorized developer evaluation, stress-testing, and interface auditing. Developers must run this application in a sandboxed emulator (API 30+ / Android 11+) or an isolated development device. Do not inject sensitive production secrets, API credentials, or bypass system permission boundaries during test cycles.";

  // Default copyright notice if not explicitly configured in Firestore
  const defaultCopyright =
    app.copyright ||
    `Copyright © ${new Date().getFullYear()} DevEngine Studio. All rights reserved. All source code architectures, visual assets, compiled binaries, and proprietary algorithms associated with ${app.name} are protected by international copyright laws and software licensing agreements. Unauthorized reverse engineering, decompilation, redistribution, or commercial reproduction without explicit written permission from DevEngine is strictly prohibited.`;

  return (
    <>
      <Head>
        <title>{app.name} — Architecture & Developer Specs | DevEngine Launchpad</title>
        <meta
          name="description"
          content={app.description || `${app.name} specifications, guidelines, and developer policies.`}
        />
      </Head>

      <LandingNavbar />

      <main className="min-h-screen bg-[#030712] text-white pt-28 pb-24 px-4 sm:px-8 relative overflow-hidden selection:bg-[#38f2ff]/30 selection:text-[#38f2ff]">
        {/* Ambient Cyber Grid & Glow Backdrop */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-[#38f2ff]/10 via-[#0051ff]/10 to-transparent blur-[120px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-gradient-to-tl from-purple-500/5 to-transparent blur-[140px] rounded-full" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(#38f2ff 1px, transparent 1px), linear-gradient(90deg, #38f2ff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="max-w-5xl mx-auto relative z-10 space-y-10">
          {/* Top Breadcrumb & Return Action */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="flex items-center gap-2 text-xs font-jetbrains text-gray-400">
              <Link
                href="/launchpad#apps"
                className="hover:text-[#38f2ff] transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to App Collection</span>
              </Link>
              <span>/</span>
              <span className="text-gray-500">App Lab</span>
              <span>/</span>
              <span className="text-[#38f2ff] font-semibold">{app.name}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-jetbrains font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {app.status || (app.isPublic ? "LIVE IN LAB" : "DRAFT")}
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-jetbrains text-gray-400 bg-white/5 border border-white/10">
                v{app.version || "1.0.0"}
              </span>
            </div>
          </div>

          {/* Hero Header Card */}
          <div className="relative bg-[#0c101c]/90 border border-white/10 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-2xl overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#38f2ff]/5 blur-3xl pointer-events-none rounded-full" />

            <div className="flex flex-col md:flex-row gap-8 items-stretch relative z-10">
              {/* App Icon / Showcase Mockup - Stretches and covers full height */}
              <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col">
                <div className="w-full h-64 md:h-full min-h-[260px] rounded-2xl overflow-hidden border border-[#38f2ff]/30 shadow-[0_0_35px_rgba(56,242,255,0.15)] bg-[#121927] relative group-hover:border-[#38f2ff]/60 transition-all duration-300">
                  <img
                    src={thumbnail}
                    alt={app.name}
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DUMMY_APP_IMAGES.default;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Title & Core Meta */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-md text-xs font-jetbrains font-bold uppercase tracking-wider bg-[#38f2ff]/10 text-[#38f2ff] border border-[#38f2ff]/30">
                    {app.platform || "Universal"}
                  </span>
                  {app.category && (
                    <span className="px-3 py-1 rounded-md text-xs font-jetbrains text-gray-300 bg-white/5 border border-white/10">
                      {app.category}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-md text-xs font-jetbrains text-cyan-300/80 bg-cyan-950/30 border border-cyan-500/20">
                    Build Release v{app.version || "1.0.0"}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black font-space tracking-tight text-white">
                  {app.name}
                </h1>

                <p className="text-base sm:text-lg text-[#38f2ff] font-jetbrains">
                  {app.subtitle || "Experimental High-Performance Application"}
                </p>

                <p className="text-sm sm:text-base text-gray-300 leading-relaxed font-sans pt-1">
                  {app.description}
                </p>

                {/* Quick Spec Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
                  <div className="bg-[#121827]/70 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] font-jetbrains uppercase tracking-wider text-gray-400">
                      Target System
                    </span>
                    <span className="text-xs font-jetbrains font-bold text-white uppercase">
                      {app.platform || "Android 10+"}
                    </span>
                  </div>

                  <div className="bg-[#121827]/70 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] font-jetbrains uppercase tracking-wider text-gray-400">
                      Version Tier
                    </span>
                    <span className="text-xs font-jetbrains font-bold text-white">
                      v{app.version || "1.0.0"}
                    </span>
                  </div>

                  <div className="bg-[#121827]/70 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] font-jetbrains uppercase tracking-wider text-gray-400">
                      Integrity Check
                    </span>
                    <span className="text-xs font-jetbrains font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Verified Clean
                    </span>
                  </div>

                  <div className="bg-[#121827]/70 p-3 rounded-xl border border-white/5">
                    <span className="block text-[10px] font-jetbrains uppercase tracking-wider text-gray-400">
                      Distribution
                    </span>
                    <span className="text-xs font-jetbrains font-bold text-cyan-300">
                      DevEngine Lab
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Capabilities / Usages Section */}
          {app.usages && app.usages.length > 0 && (
            <div className="bg-[#0c101c]/80 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center text-[#38f2ff]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-space font-bold text-white tracking-wide">
                    Target Usages & Key Capabilities
                  </h2>
                  <p className="text-xs font-jetbrains text-gray-400">
                    Recommended application workflows and integration targets
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {app.usages.map((u: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#38f2ff]/30 transition group/item"
                  >
                    <span className="w-5 h-5 rounded-md bg-[#38f2ff]/10 text-[#38f2ff] flex items-center justify-center shrink-0 text-xs font-jetbrains font-bold mt-0.5">
                      ✓
                    </span>
                    <span className="text-xs sm:text-sm text-gray-200 font-sans leading-relaxed group-hover/item:text-white transition">
                      {u}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Constraints & Warnings */}
          {app.warnings && app.warnings.length > 0 && (
            <div className="bg-[#16120c]/80 border border-amber-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-4 shadow-lg shadow-amber-950/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-space font-bold text-amber-300 tracking-wide">
                    System Constraints & Operating Notices
                  </h2>
                  <p className="text-xs font-jetbrains text-amber-400/80">
                    Important runtime warnings and dependency prerequisites
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                {app.warnings.map((w: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs sm:text-sm text-amber-200/90 leading-relaxed font-sans"
                  >
                    <span className="text-amber-400 shrink-0 font-bold font-jetbrains">
                      [!]
                    </span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              DEVELOPER USAGE & TESTING GUIDELINES (USER REQUESTED WARNING MSG)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="relative bg-gradient-to-br from-[#0c1424] via-[#09101f] to-[#040813] border-2 border-[#38f2ff]/40 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-[0_0_50px_rgba(56,242,255,0.12)] space-y-5 overflow-hidden">
            {/* Top decorative glow bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#38f2ff] to-transparent" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/40 flex items-center justify-center text-[#38f2ff] shadow-[0_0_20px_rgba(56,242,255,0.2)]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-space font-bold text-white tracking-wide">
                      Developer Usage & Testing Guidelines
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-jetbrains font-bold uppercase tracking-wider bg-[#38f2ff]/20 text-[#38f2ff] border border-[#38f2ff]/30">
                      MANDATORY
                    </span>
                  </div>
                  <p className="text-xs font-jetbrains text-cyan-300/80">
                    Execution protocols, sandboxing directives, and developer usage instructions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto font-jetbrains text-[11px] text-gray-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
                <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-ping" />
                <span>DEV-POLICY // STRICT</span>
              </div>
            </div>

            {/* Developer Message Box */}
            <div className="bg-black/60 rounded-2xl p-5 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-xs font-jetbrains text-[#38f2ff]">
                <span>$ devengine --guidelines --verify-environment</span>
              </div>

              <div className="text-xs sm:text-sm text-gray-200 font-jetbrains leading-relaxed whitespace-pre-line pl-1 border-l-2 border-[#38f2ff]/50">
                {defaultDevUsage}
              </div>

              <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-jetbrains">
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-[#38f2ff]">▸</span> Sandboxed Execution Only
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-[#38f2ff]">▸</span> No Production API Keys
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-[#38f2ff]">▸</span> Telemetry Auditing Active
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              COPYRIGHT CLAIMS & INTELLECTUAL PROPERTY NOTICE
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-[#0b0f1a]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-xl space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-space font-bold text-white tracking-wide">
                  Copyright Claims & Intellectual Property
                </h2>
                <p className="text-xs font-jetbrains text-gray-400">
                  Legal ownership, proprietary rights, and software distribution terms
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs sm:text-sm text-gray-300 font-sans leading-relaxed">
              <p>{defaultCopyright}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10 text-xs font-jetbrains text-gray-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>DevEngine Registered Intellectual Asset</span>
              </div>
              <span className="text-gray-400 font-mono text-[11px]">
                License: DevEngine Early Access / Non-Commercial EULA
              </span>
            </div>
          </div>

          {/* Bottom Navigation Return */}
          <div className="pt-6 flex justify-center">
            <Link
              href="/launchpad#apps"
              className="px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-jetbrains text-xs uppercase tracking-wider font-bold border border-white/10 hover:border-[#38f2ff]/40 transition flex items-center gap-2 shadow-lg"
            >
              <svg className="w-4 h-4 text-[#38f2ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Return to Launchpad Showroom</span>
            </Link>
          </div>
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
