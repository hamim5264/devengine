import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingFooter from "@/components/landing/LandingFooter";
import { AppPolicy, generatePlayCompliantTemplates } from "@/types/appLegal";
import {
  getAppPolicyBySlug,
  submitDataDeletionRequest,
} from "@/lib/services/appLegalService";
import HelixLoader from "@/components/HelixLoader";
import MarkdownViewer from "@/components/MarkdownViewer";

export default function AppDataDeletionPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [userEmail, setUserEmail] = useState("");
  const [userIdOrUsername, setUserIdOrUsername] = useState("");
  const [requestType, setRequestType] = useState<"delete_account" | "delete_all" | "delete_history">("delete_account");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        console.error("Failed to load data deletion policy:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, slug]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) {
      setErrorMsg("Please provide your registered account email.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await submitDataDeletionRequest({
        appSlug: String(slug),
        appName: app?.appName || String(slug),
        userEmail: userEmail.trim(),
        userIdOrUsername: userIdOrUsername.trim() || undefined,
        requestType,
        reason: reason.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit deletion request. Please try again or email support.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06080F] flex flex-col items-center justify-center">
        <HelixLoader />
        <p className="text-gray-400 font-mono text-xs mt-4">Loading deletion policy...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-[#06080F] text-white flex flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold">Policy Not Found</h1>
        <p className="text-gray-400 text-sm mt-2">Could not find a policy matching this identifier.</p>
        <Link href="/" className="mt-6 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold text-xs">
          Return Home
        </Link>
      </div>
    );
  }

  const deletionContent =
    app.dataDeletionPolicy ||
    generatePlayCompliantTemplates({
      appName: app.appName,
      packageName: app.packageName || "com.devengine.app",
      contactEmail: app.contactEmail || "support@devengine.com",
      effectiveDate: app.effectiveDate || "October 2026",
    }).dataDeletionPolicy;

  return (
    <>
      <Head>
        <title>Account & Data Deletion - {app.appName} | Google Play Data Safety</title>
        <meta
          name="description"
          content={`Official Google Play Data Safety Account & Data Deletion Portal for ${app.appName}.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-[#06080F] text-white flex flex-col selection:bg-rose-500/30 selection:text-rose-300">
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

            <div className="flex items-center gap-2 text-xs font-mono">
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
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
          {/* Header Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0B0F19] border border-rose-500/20 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
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
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30 mb-1">
                  <span>●</span> Google Play Data Safety Compliance
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {app.appName} Data & Account Deletion
                </h1>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Package: {app.packageName || "com.devengine.app"} • Dedicated Web Deletion Portal
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
            </div>
          </div>

          {/* Interactive Web Deletion Form (Google Play Mandated Web Resource) */}
          <div className="mb-10 p-6 sm:p-8 rounded-3xl bg-[#0E1322] border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center text-sm font-bold border border-rose-500/20">
                  🗑️
                </span>
                <h2 className="text-lg font-bold text-white">
                  Submit Web Data Deletion Request
                </h2>
              </div>
              <p className="text-xs text-gray-400 mb-6">
                If you have uninstalled {app.appName} or cannot access the in-app deletion button, submit your request below. Your account and all associated data will be permanently wiped within 30 days.
              </p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">
                    ✓
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Deletion Request Submitted Successfully
                  </h3>
                  <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">
                    We have logged your request for <strong className="text-white">{userEmail}</strong>. In compliance with Google Play standards, our security team will verify your account and permanently purge your records within 30 days.
                  </p>
                  <div className="pt-2 text-xs font-mono text-gray-400">
                    If you have questions, reach us at: <span className="text-emerald-400">{app.contactEmail}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        Registered Account Email <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1">
                        User ID / Username <span className="text-gray-500 text-[10px]">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. user_9281"
                        value={userIdOrUsername}
                        onChange={(e) => setUserIdOrUsername(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Request Scope
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-colors ${
                          requestType === "delete_account"
                            ? "bg-rose-500/15 border-rose-500/40 text-white"
                            : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="requestType"
                          checked={requestType === "delete_account"}
                          onChange={() => setRequestType("delete_account")}
                          className="hidden"
                        />
                        <span className="font-semibold">Delete Account & Data</span>
                        <span className="text-[10px] opacity-80">Full permanent account removal</span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-colors ${
                          requestType === "delete_history"
                            ? "bg-rose-500/15 border-rose-500/40 text-white"
                            : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="requestType"
                          checked={requestType === "delete_history"}
                          onChange={() => setRequestType("delete_history")}
                          className="hidden"
                        />
                        <span className="font-semibold">Delete Activity History</span>
                        <span className="text-[10px] opacity-80">Keep account, purge records</span>
                      </label>

                      <label
                        className={`p-3 rounded-xl border text-xs cursor-pointer flex flex-col gap-1 transition-colors ${
                          requestType === "delete_all"
                            ? "bg-rose-500/15 border-rose-500/40 text-white"
                            : "bg-black/30 border-white/10 text-gray-400 hover:text-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="requestType"
                          checked={requestType === "delete_all"}
                          onChange={() => setRequestType("delete_all")}
                          className="hidden"
                        />
                        <span className="font-semibold">Complete Purge</span>
                        <span className="text-[10px] opacity-80">Wipe all logs, preferences & data</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Reason or Details <span className="text-gray-500 text-[10px]">(Optional)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Optional feedback or specific notes for our support team..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 font-mono">
                      🔒 Verified Google Play compliant processing window: 30 days
                    </span>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
                    >
                      {submitting ? "Submitting..." : "Submit Deletion Request"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Policy Text & Details */}
          <div className="rounded-3xl bg-[#0B0F19]/60 border border-white/5 p-6 sm:p-10 shadow-2xl backdrop-blur-md">
            <MarkdownViewer content={deletionContent} />
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
