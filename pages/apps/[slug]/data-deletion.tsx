import {appPolicyServerProps} from "@/lib/server/public/content";
import { AppLegalShell, AppLegalState, AppLegalDocument, AppShowcaseContent, AppLegalIcon, appLegalStyles as s } from "@/components/app-legal/AppLegalUI";
import HeaderControls from "@/components/HeaderControls";
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

export default function AppDataDeletionPage({initialApp}: {initialApp?:AppPolicy|null}) {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(initialApp || null);
  const [loading, setLoading] = useState(!initialApp);

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
    if(initialApp?.slug === String(slug)){setApp(initialApp);setLoading(false);return;}

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
  }, [router.isReady, slug, initialApp]);

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

  if (loading) return <AppLegalState loading />;
  if (!app) return <AppLegalState title="App policy unavailable" />;

  const deletionContent =
    app.dataDeletionPolicy ||
    generatePlayCompliantTemplates({
      appName: app.appName,
      packageName: app.packageName || "com.devengine.app",
      contactEmail: app.contactEmail || "support@devengine.com",
      effectiveDate: app.effectiveDate || "October 2026",
    }).dataDeletionPolicy;

  return <AppLegalShell app={app} page="deletion">
    <section className={s.request} aria-labelledby="deletion-request-title">
      <div className={s.requestHeader}><span className={s.cardIcon}><AppLegalIcon>manage_accounts</AppLegalIcon></span><div><p className={s.eyebrow}>ACCOUNT & DATA CONTROL</p><h2 id="deletion-request-title">Submit a deletion request</h2><p>Request account or data deletion for {app.appName}, even if the app is no longer installed. Requests are processed within 30 days after verification.</p></div></div>
      {submitted ? <div className={s.success} role="status"><AppLegalIcon>task_alt</AppLegalIcon><h3>Request received.</h3><p>Your request for <strong>{userEmail}</strong> has been submitted. Our team will verify your account and process the request.</p><p>For questions, contact <a href={`mailto:${app.contactEmail}`}>{app.contactEmail}</a>.</p></div> :
      <form onSubmit={handleSubmitRequest} className={s.form}>
        {errorMsg && <div role="alert" className={s.error}>{errorMsg}</div>}
        <div className={s.formGrid}><label className={s.field}><span>Registered email *</span><input className="bg-transparent" type="email" autoComplete="email" required placeholder="you@example.com" value={userEmail} onChange={event => setUserEmail(event.target.value)} /></label><label className={s.field}><span>User ID or username <small>· Optional</small></span><input className="bg-transparent" type="text" autoComplete="username" placeholder="Your username" value={userIdOrUsername} onChange={event => setUserIdOrUsername(event.target.value)} /></label></div>
        <fieldset className={s.scope}><legend>What would you like to delete?</legend><div className={s.scopeGrid}>{[
          { value: "delete_account" as const, title: "Account & data", detail: "Permanently remove your account and its data." },
          { value: "delete_history" as const, title: "Activity history", detail: "Keep your account and remove its activity records." },
          { value: "delete_all" as const, title: "All stored data", detail: "Remove logs, preferences, and associated data." },
        ].map(option => <label key={option.value} data-selected={requestType === option.value || undefined}><input type="radio" name="requestType" value={option.value} checked={requestType === option.value} onChange={() => setRequestType(option.value)} /><strong>{option.title}</strong><small>{option.detail}</small></label>)}</div></fieldset>
        <label className={s.field}><span>Additional details <small>· Optional</small></span><textarea className="bg-transparent" rows={3} placeholder="Details for our support team" value={reason} onChange={event => setReason(event.target.value)} /></label>
        <div className={s.formActions}><span><AppLegalIcon>lock</AppLegalIcon>Account verification is required before deletion.</span><button className={s.primary} type="submit" disabled={submitting}><AppLegalIcon>{submitting ? "hourglass_top" : "send"}</AppLegalIcon>{submitting ? "Submitting…" : "Submit deletion request"}</button></div>
      </form>}
    </section>
    <AppLegalDocument content={deletionContent} app={app} pageTitle="Data & Account Deletion Policy" />
  </AppLegalShell>;
}

export const getServerSideProps=appPolicyServerProps;
