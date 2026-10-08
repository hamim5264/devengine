import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  getPdfBrandingSettings,
  savePdfBrandingSettings,
  PdfBrandingSettings,
  DEFAULT_PDF_BRANDING,
} from "@/lib/services/pdfSettingsService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManagePdfSettingsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [settings, setSettings] = useState<PdfBrandingSettings>(DEFAULT_PDF_BRANDING);
  const [originalSettings, setOriginalSettings] = useState<PdfBrandingSettings>(DEFAULT_PDF_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-pdf-settings");
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
    settings.developerPortfolioUrl !== originalSettings.developerPortfolioUrl;

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
      await savePdfBrandingSettings(
        {
          companyWebsiteUrl: settings.companyWebsiteUrl,
          companyEmail: settings.companyEmail,
          developerPortfolioUrl: settings.developerPortfolioUrl,
        },
        ADMIN_EMAIL
      );
      setOriginalSettings({ ...settings });
      setNotice({ text: "PDF branding settings saved successfully!", type: "success" });
    } catch (err: any) {
      console.error("Failed to save PDF settings:", err);
      setNotice({ text: err?.message || "Failed to save settings.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...originalSettings });
    setNotice({ text: "Changes discarded.", type: "info" });
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
    <AdminLayout title="PDF Branding Settings | Admin | DevEngine">
      <Head>
        <title>PDF Branding Settings | Admin | DevEngine</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-2xl">picture_as_pdf</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">PDF Branding Settings</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Control the URLs and contact info shown on generated Agreement and Purchase/Invoice PDFs.
            </p>
          </div>
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`mb-6 px-5 py-3.5 rounded-xl text-sm font-medium flex items-center gap-3 border transition-all ${
              notice.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : notice.type === "error"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "bg-blue-500/10 text-blue-400 border-blue-500/20"
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {notice.type === "success" ? "check_circle" : notice.type === "error" ? "error" : "info"}
            </span>
            {notice.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <HelixLoader />
          </div>
        ) : (
          <>
            {/* Info Banner */}
            <div className="mb-8 p-5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start gap-4">
              <span className="material-symbols-outlined text-cyan-400 text-xl mt-0.5 shrink-0">info</span>
              <div className="text-sm text-slate-300 leading-relaxed">
                <p className="font-semibold text-white mb-1">How It Works</p>
                <p>
                  These settings control the URLs and email addresses that appear on your <strong className="text-cyan-400">Agreement PDFs</strong> and{" "}
                  <strong className="text-cyan-400">Purchase/Invoice PDFs</strong>. When you change the Company Website URL here,
                  all future generated PDFs will show the new URL instead of the old one. This is useful when you buy a new
                  domain or want to update your contact information.
                </p>
              </div>
            </div>

            {/* Settings Form */}
            <div className="space-y-6">
              {/* Company Website URL */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-cyan-400 text-lg">language</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-[15px]">Company Website URL</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Shown on Agreement PDFs (header, footer, company card) and Invoice PDFs
                    </p>
                  </div>
                </div>

                <input
                  type="url"
                  value={settings.companyWebsiteUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, companyWebsiteUrl: e.target.value }))
                  }
                  placeholder="https://yourdomain.com"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/70 border border-slate-600/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-colors"
                />

                {settings.companyWebsiteUrl !== originalSettings.companyWebsiteUrl && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Previously:</span>
                    <code className="text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                      {originalSettings.companyWebsiteUrl}
                    </code>
                    <span className="material-symbols-outlined text-amber-400 text-sm">arrow_forward</span>
                    <code className="text-cyan-400 bg-cyan-500/5 px-2 py-0.5 rounded">
                      {settings.companyWebsiteUrl}
                    </code>
                  </div>
                )}
              </div>

              {/* Company Email */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-violet-400 text-lg">mail</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-[15px]">Company Email</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Displayed alongside the website URL on Agreement PDFs
                    </p>
                  </div>
                </div>

                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, companyEmail: e.target.value }))
                  }
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/70 border border-slate-600/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                />

                {settings.companyEmail !== originalSettings.companyEmail && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Previously:</span>
                    <code className="text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                      {originalSettings.companyEmail}
                    </code>
                    <span className="material-symbols-outlined text-amber-400 text-sm">arrow_forward</span>
                    <code className="text-violet-400 bg-violet-500/5 px-2 py-0.5 rounded">
                      {settings.companyEmail}
                    </code>
                  </div>
                )}
              </div>

              {/* Developer Portfolio URL */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">person</span>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-[15px]">Developer Portfolio URL</h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Shown on Invoice/Purchase PDFs under &quot;Visit Developer Portfolio&quot;
                    </p>
                  </div>
                </div>

                <input
                  type="url"
                  value={settings.developerPortfolioUrl}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, developerPortfolioUrl: e.target.value }))
                  }
                  placeholder="https://yourportfolio.com"
                  className="w-full px-4 py-3 rounded-lg bg-slate-900/70 border border-slate-600/50 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                />

                {settings.developerPortfolioUrl !== originalSettings.developerPortfolioUrl && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Previously:</span>
                    <code className="text-slate-400 bg-slate-900/50 px-2 py-0.5 rounded">
                      {originalSettings.developerPortfolioUrl}
                    </code>
                    <span className="material-symbols-outlined text-amber-400 text-sm">arrow_forward</span>
                    <code className="text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded">
                      {settings.developerPortfolioUrl}
                    </code>
                  </div>
                )}
              </div>
            </div>

            {/* Affected PDFs Summary */}
            <div className="mt-8 p-5 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">description</span>
                Where These Settings Are Used
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                  <p className="text-xs font-semibold text-cyan-400 mb-1">Agreement PDFs</p>
                  <ul className="text-xs text-slate-400 space-y-0.5">
                    <li>• Letterhead header (top-right)</li>
                    <li>• Company card (Party A section)</li>
                    <li>• Footer on every page</li>
                  </ul>
                </div>
                <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/30">
                  <p className="text-xs font-semibold text-emerald-400 mb-1">Invoice / Purchase PDFs</p>
                  <ul className="text-xs text-slate-400 space-y-0.5">
                    <li>• Developer portfolio link</li>
                    <li>• Company branding section</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center gap-3 pb-8">
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={`px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all ${
                  hasChanges && !saving
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-[1.02]"
                    : "bg-slate-700/50 text-slate-500 cursor-not-allowed"
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {saving ? "hourglass_top" : "save"}
                </span>
                {saving ? "Saving…" : "Save Settings"}
              </button>

              {hasChanges && (
                <button
                  onClick={handleReset}
                  className="px-5 py-3 rounded-xl text-sm font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 hover:text-white hover:border-slate-600 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">undo</span>
                  Discard Changes
                </button>
              )}
            </div>

            {/* Last Updated Info */}
            {originalSettings.updatedAt && (
              <div className="pb-8 text-xs text-slate-500 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Last updated: {new Date(originalSettings.updatedAt).toLocaleString()}
                {originalSettings.updatedBy && <span> by {originalSettings.updatedBy}</span>}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
