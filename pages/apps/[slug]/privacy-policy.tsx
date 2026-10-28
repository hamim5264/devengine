import {appPolicyServerProps} from "@/lib/server/public/content";
import { AppLegalShell, AppLegalState, AppLegalDocument, AppShowcaseContent, AppLegalIcon, appLegalStyles as s } from "@/components/app-legal/AppLegalUI";
import HeaderControls from "@/components/HeaderControls";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingFooter from "@/components/landing/LandingFooter";
import { AppPolicy, generatePlayCompliantTemplates } from "@/types/appLegal";
import { getAppPolicyBySlug } from "@/lib/services/appLegalService";
import HelixLoader from "@/components/HelixLoader";
import MarkdownViewer from "@/components/MarkdownViewer";

export default function AppPrivacyPolicyPage({initialApp}: {initialApp?:AppPolicy|null}) {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(initialApp || null);
  const [loading, setLoading] = useState(!initialApp);
  const [copied, setCopied] = useState(false);

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
        console.error("Failed to load privacy policy:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();

    return () => {
      isMounted = false;
    };
  }, [router.isReady, slug, initialApp]);

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

  if (loading) return <AppLegalState loading />;
  if (!app) return <AppLegalState title="App policy unavailable" />;

  // Get policy content or generate standard compliant content if empty
  const policyContent =
    app.privacyPolicy ||
    generatePlayCompliantTemplates({
      appName: app.appName,
      packageName: app.packageName || "com.devengine.app",
      contactEmail: app.contactEmail || "support@devengine.com",
      effectiveDate: app.effectiveDate || "October 2026",
    }).privacyPolicy;

  return <AppLegalShell app={app} page="privacy" copied={copied} onCopy={handleCopyLink} onPrint={handlePrint}><AppLegalDocument content={policyContent} app={app} pageTitle="Privacy Policy" /></AppLegalShell>;
}

export const getServerSideProps=appPolicyServerProps;
