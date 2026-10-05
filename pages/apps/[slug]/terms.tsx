import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingFooter from "@/components/landing/LandingFooter";
import { AppPolicy, generatePlayCompliantTemplates } from "@/types/appLegal";
import { getAppPolicyBySlug } from "@/lib/services/appLegalService";
import HelixLoader from "@/components/HelixLoader";
import MarkdownViewer from "@/components/MarkdownViewer";

export default function AppTermsPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!router.isReady || !slug) return;

    let isMounted = true;
    async function load() {
      try {
        setLoading(true);
        const policy = await getAppPolicyBySlug(String(slug));
        if (isMounted && policy) {
          setApp(policy);
        }
      } catch (err) {
        console.error("Failed to load terms:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, slug]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center">
        <HelixLoader />
        <p className="text-gray-400 font-mono text-xs mt-4">Loading terms & conditions...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-[#06080F] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold">Terms & Conditions Not Found</h1>
        <p className="text-gray-400 text-sm mt-2">Could not find terms matching this identifier.</p>
        <Link href="/" className="mt-6 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs">
          Return Home
        </Link>
      </div>
    );
  }

  const termsContent =
    app.termsOfService ||
    generatePlayCompliantTemplates({
      appName: app.appName,
      packageName: app.packageName || "com.devengine.app",
      contactEmail: app.contactEmail || "support@devengine.com",
      effectiveDate: app.effectiveDate || "October 2026",
    }).termsOfService;

  return (
    <>
      <Head>
        <title>Terms & Conditions - {app.appName} | DevEngine</title>
        <meta
          name="description"
          content={`Terms and Conditions of Use for ${app.appName} published by DevEngine.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#06080F] text-white flex flex-col selection:bg-emerald-500/30 selection:text-emerald-300">
        {/* Top Navbar */}
        <header className="sticky top-0 z-40 bg-[#06080F]/90 backdrop-blur-xl border-b border-white/5 print:hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <Link
              href={`/apps/${app.slug}`}
              className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
            >
              <span>←</span>
              <span>Back to {app.appName} Showcase</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono transition-colors"
              >
                {copied ? "✓ Copied Link" : "Copy Link"}
              </button>
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-mono transition-colors"
              >
                Print
              </button>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0B0F19] border border-white/10 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#121827] border border-white/15 overflow-hidden flex items-center justify-center flex-shrink-0">
                {app.logoUrl ? (
                  <img src={app.logoUrl} alt={app.appName} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 mb-1">
                  <span>●</span> Legal Agreement
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {app.appName} Terms & Conditions
                </h1>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Package: {app.packageName || "com.devengine.app"} • Effective: {app.effectiveDate || "October 2026"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
              <Link
                href={`/apps/${app.slug}/privacy-policy`}
                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href={`/apps/${app.slug}/data-deletion`}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
              >
                Data Deletion
              </Link>
            </div>
          </div>

          {/* Terms Content */}
          <div className="rounded-3xl bg-[#0B0F19]/60 border border-white/5 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
            <MarkdownViewer content={termsContent} />
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
