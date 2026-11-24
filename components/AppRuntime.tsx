import { useEffect, useState } from "react";
import type { AppProps } from "next/app";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { MaintenanceConfig } from "@/types/maintenance";
import { subscribeMaintenanceConfig } from "@/lib/services/maintenanceService";
import { recordPageView } from "@/lib/services/analyticsService";
import MaintenanceScreen from "@/components/maintenance/MaintenanceScreen";
import { HeaderControlsProvider } from "@/components/HeaderControls";
import DevKittyProvider from "@/components/devkitty/DevKittyProvider";
import { CommunicationProvider } from "@/components/communication/CommunicationProvider";
import EmployeeSessionGuard from "@/components/staff/EmployeeSessionGuard";
import CookieConsent from "@/components/common/CookieConsent";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";
const BYPASS_PATHS = ["/admin", "/login", "/staff", "/maintenance", "/api", "/project-overview/", "/project-progress/"];

/**
 * Services that are valuable once a visitor enters the product site, but are
 * intentionally absent from the lightweight public boot route.
 */
export default function AppRuntime({ Component, pageProps }: Pick<AppProps, "Component" | "pageProps">) {
  const router = useRouter();
  const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false);
  const currentPath = router.pathname;
  const isEmployeeRoute = currentPath === "/staff" || currentPath.startsWith("/staff/");
  const isBypassPath = BYPASS_PATHS.some((path) => currentPath.startsWith(path));

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => setIsAdmin(!!user && user.email === ADMIN_EMAIL));
  }, []);

  useEffect(() => subscribeMaintenanceConfig(setMaintenanceConfig), []);

  useEffect(() => {
    if (!currentPath.startsWith("/admin") && !currentPath.startsWith("/api") && !currentPath.startsWith("/project-overview/") && !currentPath.startsWith("/project-progress/") && currentPath !== "/login") {
      void recordPageView(router.asPath);
    }
  }, [router.asPath, currentPath]);

  const shouldLockScreen = maintenanceConfig?.isEnabled === true && !isBypassPath && (!isAdmin || !adminBypass);

  return (
    <DevKittyProvider>
      <HeaderControlsProvider>
        <CommunicationProvider>
          {isEmployeeRoute && <EmployeeSessionGuard />}
          {isEmployeeRoute && <style jsx global>{`
            html { scrollbar-gutter: stable; overflow-x: clip; }
            body { overflow-x: clip; }
            @supports (min-height: 100svh) { .min-h-screen { min-height: 100svh; } }
          `}</style>}
          {maintenanceConfig?.isEnabled && isAdmin && (
            <aside
              aria-label="Admin Maintenance Control"
              className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2.5 bg-[#080E1A]/95 border border-amber-500/40 text-amber-300 px-3.5 py-1.5 rounded-full text-xs font-mono shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl"
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="hidden sm:inline font-bold tracking-wider text-[11px]">ADMIN: MAINTENANCE ACTIVE</span>
              <button
                type="button"
                onClick={() => setAdminBypass((value) => !value)}
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
          {shouldLockScreen ? <MaintenanceScreen config={maintenanceConfig!} /> : <Component {...pageProps} />}
          <CookieConsent />
        </CommunicationProvider>
      </HeaderControlsProvider>
    </DevKittyProvider>
  );
}
