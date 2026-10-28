import {appPolicyServerProps} from "@/lib/server/public/content";
import { AppLegalShell, AppLegalState, AppLegalDocument, AppShowcaseContent, AppLegalIcon, appLegalStyles as s } from "@/components/app-legal/AppLegalUI";
import HeaderControls from "@/components/HeaderControls";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingFooter from "@/components/landing/LandingFooter";
import { AppPolicy } from "@/types/appLegal";
import { getAppPolicyBySlug } from "@/lib/services/appLegalService";
import HelixLoader from "@/components/HelixLoader";

export default function AppShowcasePage({initialApp}: {initialApp?:AppPolicy|null}) {
  const router = useRouter();
  const { slug } = router.query;

  const [app, setApp] = useState<AppPolicy | null>(initialApp || null);
  const [loading, setLoading] = useState(!initialApp);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!router.isReady || !slug) return;
    if(initialApp?.slug === String(slug)){setApp(initialApp);setLoading(false);return;}

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
  }, [router.isReady, slug, initialApp]);

  if (loading) return <AppLegalState loading />;
  if (notFound || !app) return <AppLegalState title="App unavailable" />;
  return <AppLegalShell app={app} page="showcase"><AppShowcaseContent app={app} /></AppLegalShell>;
}

export const getServerSideProps=appPolicyServerProps;
