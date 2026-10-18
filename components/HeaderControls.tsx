import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/context/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import DevKittyHeaderButton from "./DevKittyHeaderButton";
import styles from "./HeaderControls.module.css";

const HeaderRegistry = createContext<(() => () => void) | null>(null);

/** Real header slots suppress the small fallback header used on standalone screens. */
export function HeaderControlsProvider({ children }: { children: ReactNode }) {
  const [hosts, setHosts] = useState(0);
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const register = useCallback(() => {
    setHosts((count) => count + 1);
    return () => setHosts((count) => Math.max(0, count - 1));
  }, []);
  useEffect(() => setMounted(true), []);
  return <HeaderRegistry.Provider value={register}>
    {mounted && hosts === 0 && <header className={styles.fallbackHeader}><div><Link href="/home" className={styles.fallbackLogo} aria-label="DevEngine home"><Image src={theme === "light" ? "/assets/DevEngine-logo-on-light1.png" : "/assets/DevEngine-logo-on-dark2.png"} alt="DevEngine" width={2400} height={600} /></Link><HeaderControls standalone /></div></header>}
    {children}
  </HeaderRegistry.Provider>;
}

export default function HeaderControls({ className = "", standalone = false }: { className?: string; standalone?: boolean }) {
  const register = useContext(HeaderRegistry);
  useEffect(() => {
    if (!standalone && register) return register();
  }, [register, standalone]);
  return <div className={`${styles.controls} ${className}`}><ThemeToggle /><DevKittyHeaderButton /></div>;
}
