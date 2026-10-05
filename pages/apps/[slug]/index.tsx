import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingFooter from "@/components/landing/LandingFooter";
import { AppPolicy } from "@/types/appLegal";
import { getAppPolicyBySlug } from "@/lib/services/appLegalService";
import HelixLoader from "@/components/HelixLoader";

export default function AppShowcasePage() {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!router.isReady || !slug) return;

    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const policy = await getAppPolicyBySlug(String(slug));
        if (!isMounted) return;
        if (!policy) {
          setNotFound(true);
        } else {
          setApp(policy);
        }
      } catch (err) {
        console.error("Failed to load app profile:", err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center">
        <HelixLoader />
        <p className="text-gray-400 font-mono text-xs mt-4">Loading application profile...</p>
      </div>
    );
  }

  if (notFound || !app) {
    return (
      <div className="min-h-screen bg-[#06080F] text-white flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">App Not Found</h1>
        <p className="text-gray-400 text-sm mt-2 max-w-md text-center">
          The requested application profile or legal policy hub could not be found.
        </p>
        <Link
          href="/"
          className="mt-6 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs hover:bg-emerald-400 transition-colors"
        >
          Return to DevEngine
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{app.appName} - Official App & Legal Hub | DevEngine</title>
        <meta
          name="description"
          content={app.appSubtitle || app.description?.slice(0, 160) || `Official app page and legal documentation for ${app.appName}.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#06080F] text-white flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-[#06080F]/90 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                DE
              </div>
              <div>
                <span className="font-bold text-sm tracking-wider text-white">DEVENGINE</span>
                <span className="text-[10px] text-emerald-400 font-mono ml-2 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  APPS HUB
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-4 text-xs font-mono">
              <Link
                href={`/apps/${app.slug}/privacy-policy`}
                className="text-gray-400 hover:text-white transition-colors hidden sm:inline"
              >
                Privacy Policy
              </Link>
              <Link
                href={`/apps/${app.slug}/terms`}
                className="text-gray-400 hover:text-white transition-colors hidden sm:inline"
              >
                Terms
              </Link>
              <Link
                href={`/apps/${app.slug}/data-deletion`}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-colors"
              >
                Data Deletion
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
          <div className="relative rounded-3xl bg-[#0B0F19]/80 border border-white/10 p-6 sm:p-10 backdrop-blur-2xl shadow-2xl overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
              {/* App Icon */}
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-[#121827] border border-white/15 p-2 flex-shrink-0 shadow-2xl shadow-emerald-500/10 overflow-hidden flex items-center justify-center">
                {app.logoUrl ? (
                  <img
                    src={app.logoUrl}
                    alt={app.appName}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <svg className="w-14 h-14 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Title, Subtitle, Badges */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {app.category || "Application"}
                  </span>
                  {app.packageName && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 text-gray-400 border border-white/10">
                      {app.packageName}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 text-gray-400 border border-white/10">
                    Verified Store App
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                  {app.appName}
                </h1>

                {app.appSubtitle && (
                  <p className="text-gray-300 text-sm sm:text-base mt-1.5 font-normal">
                    {app.appSubtitle}
                  </p>
                )}

                {/* Developer Info */}
                <div className="flex items-center gap-4 text-xs text-gray-400 font-mono mt-3">
                  <span>Publisher: DevEngine Systems</span>
                  <span>•</span>
                  <span>Support: {app.contactEmail}</span>
                </div>
              </div>
            </div>

            {/* DOWNLOAD BUTTONS (Optional Play Store & App Store Buttons) */}
            {(app.playStoreUrl || app.appStoreUrl) && (
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
                {/* Google Play Store Button */}
                {app.playStoreUrl && (
                  <a
                    href={app.playStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-black hover:bg-white/[0.08] border border-white/20 hover:border-emerald-500/50 transition-all hover:scale-[1.02] shadow-xl group"
                  >
                    <svg className="w-7 h-7 text-emerald-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.793 12 3.61 22.186a2.222 2.222 0 01-.61-.954V2.768c.11-.358.32-.686.61-.954zm11.605 11.608L5.795 23.84a2.2 2.2 0 001.373.16 2.27 2.27 0 001.127-.58l8.34-8.34-1.42-1.658zm0-2.844l1.42-1.658-8.34-8.34a2.27 2.27 0 00-1.128-.58 2.2 2.2 0 00-1.372.16l9.42 10.418zm1.905.952l3.435 2.01c1.332.774 1.332 2.036 0 2.81l-3.435 2.01-1.62-1.89 1.62-4.94z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                        GET IT ON
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                        Google Play
                      </div>
                    </div>
                  </a>
                )}

                {/* Apple App Store Button */}
                {app.appStoreUrl && (
                  <a
                    href={app.appStoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-black hover:bg-white/[0.08] border border-white/20 hover:border-sky-500/50 transition-all hover:scale-[1.02] shadow-xl group"
                  >
                    <svg className="w-7 h-7 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.61-.74 1.02-1.76.91-2.78-.88.04-1.95.59-2.57 1.32-.55.63-.99 1.66-.86 2.66.98.08 1.94-.48 2.52-1.2z"/>
                    </svg>
                    <div className="text-left">
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                        Download on the
                      </div>
                      <div className="text-sm font-bold text-white group-hover:text-sky-400 transition-colors">
                        App Store
                      </div>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* ABOUT THIS APP SECTION */}
          {app.description && (
            <div className="mt-8 rounded-3xl bg-[#0B0F19]/60 border border-white/5 p-6 sm:p-8 backdrop-blur-xl">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>About This App</span>
              </h2>
              <div className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {app.description}
              </div>
            </div>
          )}

          {/* LEGAL & COMPLIANCE PORTAL CARDS */}
          <div className="mt-8">
            <h2 className="text-xs uppercase font-mono tracking-wider text-gray-400 mb-4">
              Official Legal & Compliance Center
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Privacy Policy Card */}
              <Link
                href={`/apps/${app.slug}/privacy-policy`}
                className="group p-6 rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-emerald-500/50 transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Privacy Policy
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Google Play compliant disclosures regarding personal data, SDK integrations, permissions, and security.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-emerald-400">
                  <span>Read Policy</span>
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>

              {/* Terms of Service Card */}
              <Link
                href={`/apps/${app.slug}/terms`}
                className="group p-6 rounded-2xl bg-[#0B0F19]/80 border border-white/10 hover:border-white/30 transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 text-gray-300 flex items-center justify-center mb-3 border border-white/10">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-white transition-colors">
                    Terms & Conditions
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Software licensing rules, acceptable conduct, disclaimers, and user agreements.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-gray-300">
                  <span>View Terms</span>
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>

              {/* Data & Account Deletion Card */}
              <Link
                href={`/apps/${app.slug}/data-deletion`}
                className="group p-6 rounded-2xl bg-[#0B0F19]/80 border border-rose-500/20 hover:border-rose-500/50 transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 border border-rose-500/20">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
                    Data & Account Deletion
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Mandatory Google Play portal with instructions and a web form to request permanent account deletion.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-rose-400">
                  <span>Deletion Request</span>
                  <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>

          {/* Verification Badge */}
          <div className="mt-12 p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Effective / Last Updated: {app.effectiveDate || "October 2026"}</span>
            </div>
            <div>
              <span>Official Publisher: DevEngine Systems Inc.</span>
            </div>
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
