import React, { createContext, useContext, useEffect, useState } from "react";
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
  canSwitchTheme: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [themeModes, setThemeModes] = useState<ThemeModeSettings>(DEFAULT_THEME_MODES);

  const applyTheme = (t: Theme) => {
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
    const unsub = subscribeThemeModeSettings((modes) => {
      setThemeModes(modes);

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
    // If locked to a single mode, ignore changes that violate admin policy
    if (!themeModes.allowDarkMode && newTheme === "dark") return;
    if (!themeModes.allowLightMode && newTheme === "light") return;

    setThemeState(newTheme);
    try {
      localStorage.setItem("devengine_theme", newTheme);
    } catch {}
    applyTheme(newTheme);
  };

  const canSwitchTheme = themeModes.allowDarkMode && themeModes.allowLightMode;

  const toggleTheme = () => {
    if (!canSwitchTheme) return; // Locked by admin
    const next = theme === "dark" ? "light" : "dark";
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
