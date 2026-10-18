import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps { className?: string; showLabel?: boolean; }

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, canSwitchTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !canSwitchTheme) return null;
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return <button type="button" onClick={toggleTheme} className={`${styles.button} ${showLabel ? styles.withLabel : ""} ${className}`} data-theme={theme} aria-label={label} title={label}>
    <span className={styles.icon} aria-hidden="true">
      <svg className={styles.sun} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></svg>
      <svg className={styles.moon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20.7 14.3A8.5 8.5 0 0 1 9.7 3.3 8.5 8.5 0 1 0 20.7 14.3Z" /><path d="M18 3v4m-2-2h4" /></svg>
    </span>{showLabel && <span className={styles.label}>{theme === "dark" ? "Light" : "Dark"}</span>}
  </button>;
}
