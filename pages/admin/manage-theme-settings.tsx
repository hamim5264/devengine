import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  getThemeModeSettings,
  updateThemeModeSettings,
  ThemeModeSettings,
  DEFAULT_THEME_MODES,
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
    setAllowDark(!allowDark);
    setSavedSuccess(false);
  };

  const handleToggleLight = () => {
    // Cannot turn off both
    if (allowLight && !allowDark) {
      alert("At least one theme mode must remain active. Enable Dark Mode before disabling Light Mode.");
      return;
    }
    setAllowLight(!allowLight);
    setSavedSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateThemeModeSettings(
        {
          allowDarkMode: allowDark,
          allowLightMode: allowLight,
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
        <HelixLoader size={44} color="#14b8a6" />
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

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">palette</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Global Theme Modes & Appearance
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Control which visual modes are enabled system-wide. Lock to a single theme or allow user switching.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-lg shadow-teal-500/20 disabled:opacity-50"
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
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span className="font-medium">
              Theme settings saved! Policy is now active globally across the entire platform.
            </span>
          </div>
        )}

        {/* Global Policy Status Capsule */}
        <div className="p-5 rounded-2xl bg-[#0c0c16] border border-white/10 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
            Current Platform Policy
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {isDualMode && (
              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
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

        {/* Two Toggle Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Dark Mode Toggle */}
          <div
            className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
              allowDark
                ? "bg-[#0c0c16] border-indigo-500/40 shadow-xl shadow-indigo-500/5"
                : "bg-white/[0.02] border-white/5 opacity-60"
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
                  Deep obsidian backgrounds, futuristic cyber accents, and high-contrast ambient palettes tailored for nighttime productivity.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-medium">Enable Dark Mode:</span>
              <button
                type="button"
                onClick={handleToggleDark}
                className={`relative w-13 h-7 rounded-full transition-colors cursor-pointer p-0.5 ${
                  allowDark ? "bg-indigo-600" : "bg-neutral-700"
                }`}
                aria-label="Toggle Dark Mode"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    allowDark ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card 2: Light Mode Toggle */}
          <div
            className={`p-6 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
              allowLight
                ? "bg-[#0c0c16] border-amber-500/40 shadow-xl shadow-amber-500/5"
                : "bg-white/[0.02] border-white/5 opacity-60"
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
                  Crisp porcelain surfaces, high-contrast slate typography, refined pastel capsules, and executive clean borders.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-neutral-300 font-medium">Enable Light Mode:</span>
              <button
                type="button"
                onClick={handleToggleLight}
                className={`relative w-13 h-7 rounded-full transition-colors cursor-pointer p-0.5 ${
                  allowLight ? "bg-amber-500" : "bg-neutral-700"
                }`}
                aria-label="Toggle Light Mode"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    allowLight ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Operating Rules Notice */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-neutral-400 space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-teal-400 font-bold uppercase text-[11px]">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            <span>Policy Guidelines</span>
          </div>
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
