import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { normalizeSiteFont, SITE_FONTS } from "@/lib/fonts";
import {
  subscribeThemeModeSettings,
  ThemeModeSettings,
  DEFAULT_THEME_MODES,
} from "@/lib/services/themeSettingsService";

export type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  allowDarkMode: boolean;
  allowLightMode: boolean;
  canSwitchTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  allowDarkMode: true,
  allowLightMode: true,
  canSwitchTheme: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [themeModes, setThemeModes] = useState<ThemeModeSettings>(DEFAULT_THEME_MODES);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const currentTheme = useRef<Theme>("dark");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    document.documentElement.removeAttribute("data-theme-transitioning");
  }, []);

  // The same Firestore subscription applies typography to every route and portal.
  useEffect(() => {
    const root = document.documentElement;
    let font = themeModes.fontFamily;
    try {
      if (settingsLoaded) {
        localStorage.setItem("devengine_font", font);
      } else {
        font = normalizeSiteFont(localStorage.getItem("devengine_font"));
      }
    } catch {}
    if (font === "default") {
      root.style.removeProperty("--font-site");
    } else {
      root.style.setProperty("--font-site", SITE_FONTS[font].family);
    }
    return () => {
      root.style.removeProperty("--font-site");
    };
  }, [themeModes.fontFamily, settingsLoaded]);

  const applyTheme = (t: Theme) => {
    currentTheme.current = t;
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (t === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    }
  };

  // Real-time Firestore subscriber for active theme modes
  useEffect(() => {
    // Restore the previous appearance while the first live settings arrive.
    try {
      const saved = localStorage.getItem("devengine_theme");
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        applyTheme(saved);
      }
    } catch {}

    const unsub = subscribeThemeModeSettings((modes) => {
      setThemeModes(modes);
      setSettingsLoaded(true);

      // If admin only activated Light Mode: enforce Light globally for everyone
      if (!modes.allowDarkMode && modes.allowLightMode) {
        setThemeState("light");
        applyTheme("light");
        try {
          localStorage.setItem("devengine_theme", "light");
        } catch {}
      }
      // If admin only activated Dark Mode: enforce Dark globally for everyone
      else if (modes.allowDarkMode && !modes.allowLightMode) {
        setThemeState("dark");
        applyTheme("dark");
        try {
          localStorage.setItem("devengine_theme", "dark");
        } catch {}
      }
      // If both are enabled, fallback to user preference in localStorage or default to dark
      else if (modes.allowDarkMode && modes.allowLightMode) {
        try {
          const saved = localStorage.getItem("devengine_theme") as Theme | null;
          if (saved === "light" || saved === "dark") {
            setThemeState(saved);
            applyTheme(saved);
          } else {
            setThemeState("dark");
            applyTheme("dark");
          }
        } catch {
          setThemeState("dark");
          applyTheme("dark");
        }
      }
    });

    return () => unsub();
  }, []);

  const setTheme = (newTheme: Theme) => {
    if (!settingsLoaded) return;
    // If locked to a single mode, ignore changes that violate admin policy
    if (!themeModes.allowDarkMode && newTheme === "dark") return;
    if (!themeModes.allowLightMode && newTheme === "light") return;

    if (newTheme === currentTheme.current) return;
    const root = document.documentElement;
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.setAttribute("data-theme-transitioning", "true");
      transitionTimer.current = setTimeout(() => root.removeAttribute("data-theme-transitioning"), 480);
    } else root.removeAttribute("data-theme-transitioning");

    setThemeState(newTheme);
    try {
      localStorage.setItem("devengine_theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  };

  const canSwitchTheme = settingsLoaded && themeModes.allowDarkMode && themeModes.allowLightMode;

  const toggleTheme = () => {
    if (!canSwitchTheme) return; // Locked by admin
    const next = currentTheme.current === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        allowDarkMode: themeModes.allowDarkMode,
        allowLightMode: themeModes.allowLightMode,
        canSwitchTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
