import { AdminSelect } from "@/components/admin/AdminFormControls";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { normalizeSiteFont, SITE_FONTS, SiteFont } from "@/lib/fonts";
import {
  getThemeModeSettings,
  updateThemeModeSettings,
} from "@/lib/services/themeSettingsService";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageThemeSettingsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Configuration state
  const [allowDark, setAllowDark] = useState(true);
  const [allowLight, setAllowLight] = useState(true);
  const [defaultTheme, setDefaultTheme] = useState<"light" | "dark">("light");
  const [fontFamily, setFontFamily] = useState<SiteFont>("default");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        router.replace("/admin/login");
        return;
      }
      setAdminEmail(user.email || ADMIN_EMAIL);
      setAuthReady(true);

      try {
        const config = await getThemeModeSettings();
        setAllowDark(config.allowDarkMode);
        setAllowLight(config.allowLightMode);
        setDefaultTheme(config.defaultTheme || "light");
        setFontFamily(config.fontFamily);
      } catch (err) {
        console.error("Error loading theme config:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  const handleToggleDark = () => {
    // Cannot turn off both
    if (allowDark && !allowLight) {
      alert("At least one theme mode must remain active. Enable Light Mode before disabling Dark Mode.");
      return;
    }
    const nextDark = !allowDark;
    setAllowDark(nextDark);
    if (!nextDark) {
      setDefaultTheme("light");
    }
    setSavedSuccess(false);
  };

  const handleToggleLight = () => {
    // Cannot turn off both
    if (allowLight && !allowDark) {
      alert("At least one theme mode must remain active. Enable Dark Mode before disabling Light Mode.");
      return;
    }
    const nextLight = !allowLight;
    setAllowLight(nextLight);
    if (!nextLight) {
      setDefaultTheme("dark");
    }
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);
    try {
      const effectiveDefault: "light" | "dark" = !allowDark
        ? "light"
        : !allowLight
        ? "dark"
        : defaultTheme;

      await updateThemeModeSettings(
        {
          allowDarkMode: allowDark,
          allowLightMode: allowLight,
          defaultTheme: effectiveDefault,
          fontFamily,
        },
        adminEmail
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error("Error saving theme config:", err);
      alert("Failed to save theme settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  const isDualMode = allowDark && allowLight;
  const isDarkOnly = allowDark && !allowLight;
  const isLightOnly = !allowDark && allowLight;

  return (
    <AdminLayout title="Theme & System Appearance | Admin Console">
      <Head>
        <title>Theme & System Appearance | Admin Console</title>
      </Head>

      <div data-theme-settings className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[#2cecf7]/10 border border-[#2cecf7]/20 text-[#2cecf7] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">palette</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Global Theme Modes & Appearance
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Configure global fonts, active theme modes, and the default landing theme for visitors.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-lg disabled:opacity-50 active:scale-[0.98]"
            style={{
              backgroundColor: "#2cecf7",
              color: "#02040a",
              boxShadow: "0 0 24px rgba(44, 236, 247, 0.35)",
            }}
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                <span>Save Theme Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Success Alert Banner */}
        {savedSuccess && (
          <div role="status" className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-medium">
              Theme settings saved! Default theme is set to {defaultTheme === "light" ? "Light Mode" : "Dark Mode"} and active globally.
            </span>
          </div>
        )}

        {/* Global Font Selector */}
        <section aria-labelledby="global-font-heading" className="p-5 sm:p-6 rounded-2xl bg-[#0c0c16] border border-white/10 space-y-5">
          <div>
            <h2 id="global-font-heading" className="text-base font-bold text-white">Global Website Font</h2>
            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
              Apply one font across the public website, admin panel, and employee portal. Changes reach everyone when you save.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="global-font" className="block text-sm font-medium text-neutral-200">Font family</label>
            <AdminSelect
              id="global-font"
              value={fontFamily}
              disabled={saving}
              onChange={(event) => {
                setFontFamily(normalizeSiteFont(event.target.value));
                setSavedSuccess(false);
              }}
              className="w-full rounded-xl bg-[#07070f] border border-white/15 px-3 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#2cecf7] disabled:opacity-50"
              aria-describedby="global-font-help"
            >
              {Object.entries(SITE_FONTS).map(([value, font]) => (
                <option key={value} value={value}>{font.label}</option>
              ))}
            </AdminSelect>
            <p id="global-font-help" className="text-xs text-neutral-400">
              Preview your font below. Save to apply it across the platform.
            </p>
          </div>

          <div data-admin-document className="rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 space-y-3" style={{ fontFamily: SITE_FONTS[fontFamily].family }}>
            <p className="text-xs uppercase tracking-wider text-[#2cecf7]">Font preview · {SITE_FONTS[fontFamily].label}</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Build something extraordinary.</p>
            <p className="text-sm text-neutral-300">Your projects, your team, and your next big idea — all in one place.</p>
            <p className="text-sm font-medium text-neutral-400">ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789</p>
          </div>
        </section>

        {/* Global Policy Status Capsule */}
        <div className="p-5 rounded-2xl bg-[#0c0c16] border border-white/10 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Current Platform Policy
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {isDualMode && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2cecf7] animate-pulse" />
                <span>Dual Theme Mode (Both Active)</span>
              </span>
            )}
            {isDarkOnly && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400" />
                <span>Dark Mode Enforced Globally (Switching Disabled)</span>
              </span>
            )}
            {isLightOnly && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Light Mode Enforced Globally (Switching Disabled)</span>
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-400 pt-1 leading-relaxed">
            {isDualMode &&
              "Both Dark and Light themes are active. All visitors, admins, and employees have access to the theme switch button and can select their preferred visual experience."}
            {isDarkOnly &&
              "Dark Mode is locked for the entire platform. The theme toggle button is completely hidden from all users, and light mode cannot be accessed."}
            {isLightOnly &&
              "Light Mode is locked for the entire platform. The theme toggle button is completely hidden from all users, and dark mode cannot be accessed."}
          </p>
        </div>

        {/* Default Starting Theme Selector */}
        <section aria-labelledby="default-theme-heading" className="p-5 sm:p-6 rounded-2xl bg-[#0c0c16] border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#2cecf7]/10 border border-[#2cecf7]/20 text-[#2cecf7] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[17px]">brightness_medium</span>
                </span>
                <h2 id="default-theme-heading" className="text-base font-bold text-white">
                  Default Starting Theme
                </h2>
              </div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                Choose which theme new visitors and users see when they land on your website.
              </p>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono font-bold uppercase self-start sm:self-auto bg-[#2cecf7]/10 border-[#2cecf7]/30 text-[#2cecf7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-pulse" />
              <span>Active Default: {defaultTheme === "light" ? "Light Mode" : "Dark Mode"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Light Mode Default Option */}
            <button
              type="button"
              disabled={saving || !allowLight}
              onClick={() => {
                if (allowLight) {
                  setDefaultTheme("light");
                  setSavedSuccess(false);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all duration-200 relative cursor-pointer flex flex-col justify-between gap-3 ${
                defaultTheme === "light" && allowLight
                  ? "bg-[#2cecf7]/10 border-[#2cecf7] shadow-[0_0_24px_rgba(44,236,247,0.18)] ring-1 ring-[#2cecf7]/50"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              } ${!allowLight ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                      defaultTheme === "light" && allowLight
                        ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7]"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">light_mode</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Light Mode (Default)</h3>
                    <span className="text-[10px] font-mono text-[#2cecf7]">Recommended Default</span>
                  </div>
                </div>

                {defaultTheme === "light" && allowLight && (
                  <span className="w-5 h-5 rounded-full bg-[#2cecf7] text-[#02040a] flex items-center justify-center shadow-md shadow-[#2cecf7]/40">
                    <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                New visitors globally land on the bright, modern light theme. When dual-mode is enabled, users can still toggle to dark mode anytime.
              </p>
            </button>

            {/* Dark Mode Default Option */}
            <button
              type="button"
              disabled={saving || !allowDark}
              onClick={() => {
                if (allowDark) {
                  setDefaultTheme("dark");
                  setSavedSuccess(false);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all duration-200 relative cursor-pointer flex flex-col justify-between gap-3 ${
                defaultTheme === "dark" && allowDark
                  ? "bg-indigo-500/10 border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.18)] ring-1 ring-indigo-400/50"
                  : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
              } ${!allowDark ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
                      defaultTheme === "dark" && allowDark
                        ? "bg-indigo-500 text-white border-indigo-400"
                        : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Dark Mode (Default)</h3>
                    <span className="text-[10px] font-mono text-indigo-400">Cyber Night Environment</span>
                  </div>
                </div>

                {defaultTheme === "dark" && allowDark && (
                  <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/40">
                    <span className="material-symbols-outlined text-[14px] font-bold">check</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                New visitors globally land on the deep navy & cyber cyan theme. When dual-mode is enabled, users can still toggle to light mode anytime.
              </p>
            </button>
          </div>
        </section>

        {/* Two Toggle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Dark Mode Toggle */}
          <div
            className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
              allowDark
                ? "bg-[#0c0c16] border-indigo-500/40 shadow-xl shadow-indigo-500/5"
                : "bg-white/[0.02] border-white/5 "
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">dark_mode</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                    allowDark
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                  }`}
                >
                  {allowDark ? "Active" : "Disabled"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Dark Mode</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Focused navy surfaces with clear, comfortable contrast.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-medium">Enable Dark Mode:</span>
              <button type="button" role="switch" aria-checked={allowDark} aria-label="Enable dark mode" onClick={handleToggleDark} className="admin-theme-switch"><span /></button>
            </div>
          </div>

          {/* Card 2: Light Mode Toggle */}
          <div
            className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
              allowLight
                ? "bg-[#0c0c16] border-amber-500/40 shadow-xl shadow-amber-500/5"
                : "bg-white/[0.02] border-white/5 "
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">light_mode</span>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase ${
                    allowLight
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-neutral-800 text-neutral-400 border border-neutral-700"
                  }`}
                >
                  {allowLight ? "Active" : "Disabled"}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Light Mode</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Bright surfaces and readable text throughout the platform.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-medium">Enable Light Mode:</span>
              <button type="button" role="switch" aria-checked={allowLight} aria-label="Enable light mode" onClick={handleToggleLight} className="admin-theme-switch"><span /></button>
            </div>
          </div>
        </div>

        {/* Operating Rules Notice */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-neutral-400 space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-[#2cecf7] font-bold uppercase text-[11px]">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Policy Guidelines</span>
          </div>
          <p>
            • The <strong>Default Starting Theme</strong> governs first-time visits globally. When dual mode is on, visitors retain their personal preference once they toggle.
          </p>
          <p>
            • Turning <strong>ON both modes</strong> unlocks user freedom: everyone can switch between themes at any time.
          </p>
          <p>
            • Turning <strong>OFF one mode</strong> enforces the remaining theme globally across all accounts, and completely hides the theme toggle button.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
