import React, { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { MaintenanceConfig } from "@/types/maintenance";
import {
  subscribeMaintenanceConfig,
} from "@/lib/services/maintenanceService";
import { recordPageView } from "@/lib/services/analyticsService";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import DevKittyFloatingButton from "@/components/DevKittyFloatingButton";
import "../styles/globals.css";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

// Paths that are always accessible during maintenance
const BYPASS_PATHS = ["/admin", "/login", "/staff", "/maintenance", "/api"];

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  // 2. Real-time Maintenance Listener
  useEffect(() => {
    const unsub = subscribeMaintenanceConfig((cfg) => {
      setMaintenanceConfig(cfg);
    });
    return () => unsub();
  }, []);

  const currentPath = router.pathname;
  const isBypassPath = BYPASS_PATHS.some((p) => currentPath.startsWith(p));

  // 3. Website Visitor Analytics (Only for public-facing visitors)
  useEffect(() => {
    if (!currentPath.startsWith("/admin") && !currentPath.startsWith("/api") && currentPath !== "/login") {
      recordPageView(router.asPath);
    }
  }, [router.asPath, currentPath]);

  // Determine if maintenance mode should lock this screen
  const shouldLockScreen =
    maintenanceConfig?.isEnabled === true &&
    !isBypassPath &&
    (!isAdmin || !adminBypass);

  return (
    <>
      {/* Discreet Admin Floating Pill (ONLY visible to admin hamim.leon@gmail.com, NEVER to end users) */}
      {maintenanceConfig?.isEnabled && isAdmin && (
        <aside
          aria-label="Admin Maintenance Control"
          className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2.5 bg-[#080E1A]/95 border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span className="hidden sm:inline font-bold tracking-wider text-[11px]">
            ADMIN: MAINTENANCE ACTIVE
          </span>
          <button
            type="button"
            onClick={() => setAdminBypass((prev) => !prev)}
            className="px-2.5 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase font-semibold transition-colors cursor-pointer"
          >
            {adminBypass ? "LOCK VIEW" : "BYPASS"}
          </button>
          <Link
            href="/admin/manage-maintenance"
            className="px-2.5 py-0.5 rounded-md bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold uppercase transition-colors"
          >
            CMS →
          </Link>
        </aside>
      )}

      {/* Render Maintenance Screen for Public Users during Maintenance */}
      {shouldLockScreen ? (
        <MaintenanceScreen config={maintenanceConfig!} />
      ) : (
        <>
          <Component {...pageProps} />
          {/* DevKitty Future ChatBot Floating Button (All user screens) */}
          <DevKittyFloatingButton />
        </>
      )}
    </>
  );
}

export default MyApp;
