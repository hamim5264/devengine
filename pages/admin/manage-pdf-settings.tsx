import { onAdminPageAccess } from "@/lib/services/staffAuth";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { useTheme } from "@/context/ThemeContext";
import {
  getPdfBrandingSettings,
  savePdfBrandingSettings,
  resetPdfBrandingSettings,
  PdfBrandingSettings,
  DEFAULT_PDF_BRANDING,
} from "@/lib/services/pdfSettingsService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManagePdfSettingsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const isLight = theme === "light";

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [settings, setSettings] = useState<PdfBrandingSettings>(DEFAULT_PDF_BRANDING);
  const [originalSettings, setOriginalSettings] = useState<PdfBrandingSettings>(DEFAULT_PDF_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Auth gate
  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setIsAdmin(true);
      setAuthReady(true);
    }, () => {
      setIsAdmin(false);
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  // Load settings
  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getPdfBrandingSettings();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err: any) {
      console.error("Failed to load PDF settings:", err);
      setNotice({ text: "Failed to load PDF branding settings.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadSettings();
  }, [isAdmin]);

  const hasChanges =
    settings.companyWebsiteUrl !== originalSettings.companyWebsiteUrl ||
    settings.companyEmail !== originalSettings.companyEmail ||
    settings.founderEmail !== originalSettings.founderEmail ||
    settings.developerPortfolioUrl !== originalSettings.developerPortfolioUrl ||
    settings.clientPortalBaseUrl !== originalSettings.clientPortalBaseUrl ||
    settings.signatoryName !== originalSettings.signatoryName ||
    settings.signatoryTitle !== originalSettings.signatoryTitle ||
    settings.contactPhone !== originalSettings.contactPhone ||
    settings.companyAddress !== originalSettings.companyAddress ||
    settings.companyLegalName !== originalSettings.companyLegalName ||
    settings.companyStudioDescriptor !== originalSettings.companyStudioDescriptor;

  const handleSave = async () => {
    if (!settings.companyWebsiteUrl.trim()) {
      setNotice({ text: "Company Website URL cannot be empty.", type: "error" });
      return;
    }
    if (!settings.companyEmail.trim()) {
      setNotice({ text: "Company Email cannot be empty.", type: "error" });
      return;
    }

    try {
      setSaving(true);
      await savePdfBrandingSettings(settings, auth.currentUser?.email || ADMIN_EMAIL);
      setOriginalSettings({ ...settings });
      setNotice({ text: "Invoice & PDF settings successfully updated in live database!", type: "success" });
    } catch (err: any) {
      console.error("Failed to save PDF settings:", err);
      setNotice({ text: err?.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    try {
      setResetting(true);
      await resetPdfBrandingSettings(auth.currentUser?.email || ADMIN_EMAIL);
      setSettings({ ...DEFAULT_PDF_BRANDING });
      setOriginalSettings({ ...DEFAULT_PDF_BRANDING });
      setShowResetModal(false);
      setNotice({ text: "All settings restored to official factory defaults!", type: "success" });
    } catch (err: any) {
      console.error("Failed to reset settings:", err);
      setNotice({ text: err?.message || "Failed to reset settings.", type: "error" });
    } finally {
      setResetting(false);
    }
  };

  const handleDiscard = () => {
    setSettings({ ...originalSettings });
    setNotice({ text: "Unsaved modifications discarded.", type: "info" });
  };

  // Auto-clear notice
  useEffect(() => {
    if (notice) {
      const t = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notice]);

  if (!authReady) return <HelixLoader />;
  if (!isAdmin) return null;

  return (
    <AdminLayout title="Invoice & PDF Settings | Admin | DevEngine">
      <Head>
        <title>Invoice &amp; PDF Branding Settings | Admin | DevEngine</title>
      </Head>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2cecf7] to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-[#02040a]">
              <span className="material-symbols-outlined text-2xl font-bold">receipt_long</span>
            </div>
            <div>
              <h1 className={`text-2xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Invoice &amp; PDF Settings
              </h1>
              <p className={`text-sm mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>Update invoice branding and company details.</p>
            </div>
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
              }`}
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              Reset to Defaults
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                hasChanges && !saving
                  ? "bg-[#2cecf7] hover:bg-[#20d8e3] text-[#02040a] shadow-cyan-500/25 hover:scale-[1.02]"
                  : isLight
                  ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                  : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {saving ? "hourglass_top" : "save"}
              </span>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        {notice && (
          <div
            className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 border transition-all ${
              notice.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : notice.type === "error"
                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                : "bg-cyan-500/10 text-cyan-400 border-cyan-500/25"
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {notice.type === "success" ? "check_circle" : notice.type === "error" ? "error" : "info"}
            </span>
            <span>{notice.text}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <HelixLoader />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Live Invoice Preview Box */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                isLight ? "bg-slate-50/80 border-slate-200 shadow-sm" : "bg-white/[0.02] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2cecf7] animate-pulse"></span>
                  <h3 className={`text-sm font-bold tracking-wide uppercase ${isLight ? "text-slate-800" : "text-white"}`}>
                    Live Invoice Footer &amp; Branding Preview
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#2cecf7]/10 text-cyan-600 dark:text-[#2cecf7] border border-[#2cecf7]/20 font-semibold">
                  Realtime Preview
                </span>
              </div>

              {/* Mock Invoice Bottom Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Column 1: Founder */}
                <div
                  className={`p-4 rounded-xl border ${
                    isLight ? "bg-white border-slate-200" : "bg-[#0b132b]/50 border-white/[0.06]"
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Column 1: Executive</p>
                  <div className="h-6 w-24 mb-2 border-b border-slate-300 dark:border-slate-700 flex items-center">
                    <span className="text-[11px] italic font-serif text-slate-500">Founder Signature</span>
                  </div>
                  <p className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{settings.signatoryName || "MD. ABDUL HAMIM LEON"}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{settings.signatoryTitle || "Founder and CEO, DevEngine"}</p>
                  <p className="text-[10px] text-slate-500 mt-2">We appreciate your trust in us.</p>
                </div>

                {/* Column 2: Legal & URLs */}
                <div
                  className={`p-4 rounded-xl border ${
                    isLight ? "bg-white border-slate-200" : "bg-[#0b132b]/50 border-white/[0.06]"
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Column 2: Company &amp; Portals</p>
                  <p className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{settings.companyLegalName || "DEVENGINE SYSTEMS INC."}</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{settings.companyAddress || "Banasree, Rampura, Dhaka 1219"}</p>
                  <p className="text-slate-500 text-[10px]">{settings.companyStudioDescriptor || "Official Enterprise Software Studio"}</p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-white/[0.06] space-y-1">
                    <p className="text-[11px]">
                      <span className="font-semibold text-slate-400">Official Website: </span>
                      <span className="text-cyan-500 font-bold">{settings.companyWebsiteUrl || "https://devenginehq.com"}</span>
                    </p>
                    <p className="text-[11px]">
                      <span className="font-semibold text-slate-400">Portfolio: </span>
                      <span className="text-cyan-500 font-bold">{settings.developerPortfolioUrl || "https://thedevhamim.vercel.app"}</span>
                    </p>
                  </div>
                </div>

                {/* Column 3: Contact & QR */}
                <div
                  className={`p-4 rounded-xl border ${
                    isLight ? "bg-white border-slate-200" : "bg-[#0b132b]/50 border-white/[0.06]"
                  }`}
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Column 3: Support &amp; QR</p>
                  <p className="font-bold text-[#2cecf7] text-[11px]">SCAN TO VERIFY</p>
                  <p className={`font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>Need Help?</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">{settings.companyEmail || "devenginesoftsolution@gmail.com"}</p>
                  <p className="text-slate-400 text-[11px]">{settings.contactPhone || "+880 1724 879284"}</p>
                  <p className="text-cyan-500 text-[11px] font-bold mt-1">{settings.companyWebsiteUrl?.replace(/^https?:\/\//, "") || "devenginehq.com"}</p>
                </div>
              </div>
            </div>

            {/* Form Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SECTION 1: URLs & Domains */}
              <div
                className={`p-6 rounded-2xl border space-y-5 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-[#2cecf7]">
                    <span className="material-symbols-outlined text-lg">language</span>
                  </div>
                  <div>
                    <h2 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                      Web Domains &amp; Portals
                    </h2>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Official website, developer portfolio and verification URLs
                    </p>
                  </div>
                </div>

                {/* Company Website URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Company Official Website URL <span className="text-[#2cecf7]">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, companyWebsiteUrl: "https://devenginehq.com" }))}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-[#2cecf7] border border-cyan-500/20 hover:bg-cyan-500/20 font-semibold"
                      >
                        devenginehq.com
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.companyWebsiteUrl}
                      onChange={(e) => setSettings((p) => ({ ...p, companyWebsiteUrl: e.target.value }))}
                      placeholder="https://devenginehq.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                          : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                    {settings.companyWebsiteUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, companyWebsiteUrl: "" }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title="Clear field"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Shown in invoice header, Column 2 &quot;Official Website&quot;, support links and document footer.
                  </p>
                </div>

                {/* Developer Portfolio URL */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Developer Portfolio URL <span className="text-[#2cecf7]">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, developerPortfolioUrl: "https://thedevhamim.vercel.app" }))}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-[#2cecf7] border border-cyan-500/20 hover:bg-cyan-500/20 font-semibold"
                      >
                        thedevhamim.vercel.app
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      value={settings.developerPortfolioUrl}
                      onChange={(e) => setSettings((p) => ({ ...p, developerPortfolioUrl: e.target.value }))}
                      placeholder="https://thedevhamim.vercel.app"
                      className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                          : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                      }`}
                    />
                    {settings.developerPortfolioUrl && (
                      <button
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, developerPortfolioUrl: "" }))}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        title="Clear field"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Displayed in invoice Column 2 as &quot;Developer Portfolio&quot; with active link.
                  </p>
                </div>

                {/* Client Verification / QR Portal Domain */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      QR Verification &amp; Portal Domain
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettings((p) => ({ ...p, clientPortalBaseUrl: "https://devenginehq.com" }))}
                      className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-[#2cecf7] border border-cyan-500/20 hover:bg-cyan-500/20 font-semibold"
                    >
                      devenginehq.com
                    </button>
                  </div>
                  <input
                    type="url"
                    value={settings.clientPortalBaseUrl || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, clientPortalBaseUrl: e.target.value }))}
                    placeholder="https://devenginehq.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    The online domain scanned by customers from the PDF QR code to verify tracking records.
                  </p>
                </div>
              </div>

              {/* SECTION 2: Official Contact & Gmail */}
              <div
                className={`p-6 rounded-2xl border space-y-5 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                    <span className="material-symbols-outlined text-lg">contact_mail</span>
                  </div>
                  <div>
                    <h2 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                      Communication &amp; Contact Info
                    </h2>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Official support Gmail, phone helpline and executive email
                    </p>
                  </div>
                </div>

                {/* Company Gmail / Email */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Company Official Support Gmail / Email <span className="text-[#2cecf7]">*</span>
                  </label>
                  <input
                    type="email"
                    value={settings.companyEmail}
                    onChange={(e) => setSettings((p) => ({ ...p, companyEmail: e.target.value }))}
                    placeholder="devenginesoftsolution@gmail.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Shown in invoice Column 3 under &quot;Need Help?&quot; and in License Terms section 3.
                  </p>
                </div>

                {/* WhatsApp / Phone Helpline */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Contact Phone / WhatsApp Helpline
                  </label>
                  <input
                    type="text"
                    value={settings.contactPhone || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, contactPhone: e.target.value }))}
                    placeholder="+880 1724 879284"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Shown in Column 3 and in the verified WhatsApp helpline terms description.
                  </p>
                </div>

                {/* Founder Direct Email */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Founder Executive Email
                  </label>
                  <input
                    type="email"
                    value={settings.founderEmail || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, founderEmail: e.target.value }))}
                    placeholder="hamim.leon@gmail.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Used for executive correspondence and contract agreement verification footers.
                  </p>
                </div>
              </div>

              {/* SECTION 3: Studio & Address Details */}
              <div
                className={`p-6 rounded-2xl border space-y-5 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </div>
                  <div>
                    <h2 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                      Headquarters &amp; Entity
                    </h2>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Studio legal title, descriptor and operational address
                    </p>
                  </div>
                </div>

                {/* Company Legal Entity Name */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Company Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={settings.companyLegalName || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, companyLegalName: e.target.value }))}
                    placeholder="DEVENGINE SYSTEMS INC."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-semibold transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Printed at the top of Column 2 on the invoice.
                  </p>
                </div>

                {/* Operational Address */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Physical / Operational Address
                  </label>
                  <input
                    type="text"
                    value={settings.companyAddress || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, companyAddress: e.target.value }))}
                    placeholder="Banasree, Rampura, Dhaka 1219"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    City and district displayed in Column 2 under the company name.
                  </p>
                </div>

                {/* Studio Descriptor */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Studio Descriptor / Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.companyStudioDescriptor || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, companyStudioDescriptor: e.target.value }))}
                    placeholder="Official Enterprise Software Studio"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                </div>
              </div>

              {/* SECTION 4: Executive Signatory */}
              <div
                className={`p-6 rounded-2xl border space-y-5 ${
                  isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-white/[0.06]">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <span className="material-symbols-outlined text-lg">draw</span>
                  </div>
                  <div>
                    <h2 className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                      Executive Signatory
                    </h2>
                    <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                      Signatory name and executive title on all invoices and legal documents
                    </p>
                  </div>
                </div>

                {/* Signatory Full Name */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Signatory Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.signatoryName || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, signatoryName: e.target.value }))}
                    placeholder="MD. ABDUL HAMIM LEON"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-bold uppercase transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Shown directly under the founder signature line in Column 1.
                  </p>
                </div>

                {/* Signatory Title */}
                <div className="space-y-1.5">
                  <label className={`text-xs font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Signatory Corporate Title
                  </label>
                  <input
                    type="text"
                    value={settings.signatoryTitle || ""}
                    onChange={(e) => setSettings((p) => ({ ...p, signatoryTitle: e.target.value }))}
                    placeholder="Founder and CEO, DevEngine"
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm border transition-colors focus:outline-none focus:ring-1 focus:ring-[#2cecf7] ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/70 border-slate-700 text-white focus:border-[#2cecf7]"
                    }`}
                  />
                  <p className="text-[11px] text-slate-400">
                    Corporate role shown on invoices and client contracts.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions Bar */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-cyan-500">verified</span>
                <span>
                  {originalSettings.updatedAt
                    ? `Last updated: ${new Date(originalSettings.updatedAt).toLocaleString()}`
                    : "Using active production settings"}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {hasChanges && (
                  <button
                    type="button"
                    onClick={handleDiscard}
                    className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                        : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                    }`}
                  >
                    Discard Changes
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md ${
                    hasChanges && !saving
                      ? "bg-[#2cecf7] hover:bg-[#20d8e3] text-[#02040a] shadow-cyan-500/25 hover:scale-[1.02]"
                      : isLight
                      ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                      : "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {saving ? "hourglass_top" : "save"}
                  </span>
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting to Defaults */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl transition-all ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </div>
              <div>
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Reset to Factory Defaults?
                </h3>
                <p className="text-xs text-slate-400">This will overwrite all customized URLs and contacts.</p>
              </div>
            </div>

            <p className={`text-xs leading-relaxed mb-6 ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              Are you sure you want to restore the official defaults?
              <br />
              • Website: <strong className="text-cyan-500">devenginehq.com</strong>
              <br />
              • Portfolio: <strong className="text-cyan-500">thedevhamim.vercel.app</strong>
              <br />
              • Email: <strong className="text-cyan-500">devenginesoftsolution@gmail.com</strong>
              <br />
              • Phone: <strong className="text-cyan-500">+880 1724 879284</strong>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                disabled={resetting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-md shadow-amber-500/20"
              >
                {resetting ? "Resetting…" : "Yes, Restore Defaults"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
