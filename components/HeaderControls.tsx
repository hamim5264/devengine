import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import dynamic from "next/dynamic";
import styles from "./HeaderControls.module.css";

const DevKittyHeaderButton = dynamic(() => import("./DevKittyHeaderButton"), { ssr: false });

interface HeaderRegistryValue {
  register: () => () => void;
  assistantEnabled: boolean;
}

const HeaderRegistry = createContext<HeaderRegistryValue | null>(null);

/** Real header slots suppress the small fallback header used on standalone screens. */
export function HeaderControlsProvider({ children, assistantEnabled = true }: { children: ReactNode; assistantEnabled?: boolean }) {
  const [hosts, setHosts] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();
  const isExcludedRoute =
    Boolean(router.pathname && (router.pathname.startsWith("/staff") || router.pathname.startsWith("/admin")));

  const register = useCallback(() => {
    setHosts((count) => count + 1);
    return () => setHosts((count) => Math.max(0, count - 1));
  }, []);
  useEffect(() => setMounted(true), []);
  return <HeaderRegistry.Provider value={{ register, assistantEnabled }}>
    {mounted && hosts === 0 && !isExcludedRoute && <header className={styles.fallbackHeader}><div><Link href="/home" className={styles.fallbackLogo} aria-label="DevEngine home"><Image src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"} alt="DevEngine" width={2400} height={600} /></Link><HeaderControls standalone /></div></header>}
    {children}
  </HeaderRegistry.Provider>;
}

export default function HeaderControls({ className = "", standalone = false }: { className?: string; standalone?: boolean }) {
  const registry = useContext(HeaderRegistry);
  const register = registry?.register;
  useEffect(() => {
    if (!standalone && register) return register();
  }, [register, standalone]);
  return <div className={`${styles.controls} ${className}`}><ThemeToggle />{registry?.assistantEnabled && <DevKittyHeaderButton />}</div>;
}
