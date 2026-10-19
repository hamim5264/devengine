import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/settings.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Global Legal & Operational Settings
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav } from "@/components/contract-center/CCUI";
import {
  getContractSettings,
  saveContractSettings,
} from "@/lib/services/contractCenterService";
import {
  getPdfBrandingSettings,
  savePdfBrandingSettings,
  PdfBrandingSettings,
  DEFAULT_PDF_BRANDING,
} from "@/lib/services/pdfSettingsService";
import type { CCSettings, CCCurrency } from "@/types/contractCenter";
import { CC_DEFAULT_SETTINGS } from "@/types/contractCenter";

export default function ContractSettingsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const [formData, setFormData] = useState<Omit<CCSettings, "id">>({
    ...CC_DEFAULT_SETTINGS,
  });
  const [pdfBranding, setPdfBranding] = useState<PdfBrandingSettings>(DEFAULT_PDF_BRANDING);

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setAuthReady(true);
    }, () => {
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const load = async () => {
      setLoading(true);
      try {
        const [settings, branding] = await Promise.all([
          getContractSettings(),
          getPdfBrandingSettings(),
        ]);
        if (settings) {
          const { id: _id, ...rest } = settings;
          setFormData((prev) => ({
            ...prev,
            ...rest,
          }));
        }
        if (branding) {
          setPdfBranding(branding);
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authReady]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await Promise.all([
        saveContractSettings(formData, performedBy),
        savePdfBrandingSettings(pdfBranding, performedBy),
      ]);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      alert("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <HelixLoader />
        </div>
      </AdminLayout>
    );
  }

  const primarySignatory = formData.authorizedSignatories?.[0] || {
    name: "MD. Abdul Hamim Leon",
    title: "CEO & Managing Director",
    email: "hamim.leon@gmail.com",
  };

  return (
    <AdminLayout>
      <Head>
        <title>Contract Center Settings — DevEngine Admin</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Contract Center Global Settings</h1>
            <p className="text-sm text-slate-400">
              Configure DevEngine's legal entity metadata, default currencies, signing parameters, and business identity.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all disabled:opacity-50"
          >
            {saving ? "Saving Changes..." : "Save Settings"}
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/settings" />

        {savedSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            ✓ Contract settings successfully updated across all modules.
          </div>
        )}

        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
          {/* Section 1: DevEngine Legal Identity */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              1. DevEngine Legal Business Identity
            </h2>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Company Legal Entity Name *</label>
              <input
                type="text"
                required
                value={formData.legalBusinessName}
                onChange={(e) => setFormData({ ...formData, legalBusinessName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Brand Name</label>
                <input
                  type="text"
                  value={formData.brandName}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Official Contact Email *</label>
                <input
                  type="email"
                  required
                  value={formData.officialEmail}
                  onChange={(e) => setFormData({ ...formData, officialEmail: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Authorized Signatory Name *</label>
                <input
                  type="text"
                  required
                  value={primarySignatory.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      authorizedSignatories: [{ ...primarySignatory, name: e.target.value }],
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Signatory Title *</label>
                <input
                  type="text"
                  required
                  value={primarySignatory.title}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      authorizedSignatories: [{ ...primarySignatory, title: e.target.value }],
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Official Business Address</label>
              <textarea
                rows={2}
                value={formData.businessAddress}
                onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Section 2: Operational Defaults & Signing */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
              2. Contract Operational Defaults
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Default Base Currency</label>
                <select
                  value={formData.defaultCurrency}
                  onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value as CCCurrency })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="BDT">BDT (৳)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Default Governing Law</label>
                <input
                  type="text"
                  value={formData.defaultGoverningLaw}
                  onChange={(e) => setFormData({ ...formData, defaultGoverningLaw: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Quotation Validity (Days)</label>
                <input
                  type="number"
                  value={formData.defaultQuoteValidityDays}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultQuoteValidityDays: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Default NDA Term (Months)</label>
                <input
                  type="number"
                  value={formData.defaultNDATermMonths}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultNDATermMonths: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Default Dispute Resolution</label>
              <input
                type="text"
                value={formData.defaultDisputeResolution}
                onChange={(e) => setFormData({ ...formData, defaultDisputeResolution: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Section 3: PDF Generation, Custom Domain & Public Verification */}
          <div className="lg:col-span-2 rounded-2xl border border-pink-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 space-y-6 shadow-xl shadow-pink-950/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-400 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Live Production Domain & Document Engine
                </div>
                <h2 className="text-base font-bold text-white">
                  3. PDF Contract Branding & Public Domain Settings
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Configure which live domain DevEngine embeds into generated quotation, NDA, and agreement PDFs (footers, verification links, and QR codes).
                </p>
              </div>

              {/* Quick Domain Presets */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium">Domain Presets:</span>
                <button
                  type="button"
                  onClick={() =>
                    setPdfBranding({
                      ...pdfBranding,
                      clientPortalBaseUrl: "https://devenginehq.com",
                      companyWebsiteUrl: "https://devenginehq.com",
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    pdfBranding.clientPortalBaseUrl?.includes("devenginehq.com")
                      ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm shadow-pink-500/30"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  devenginehq.com (Official)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPdfBranding({
                      ...pdfBranding,
                      clientPortalBaseUrl: "https://thedevengine.vercel.app",
                      companyWebsiteUrl: "https://thedevengine.vercel.app",
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    pdfBranding.clientPortalBaseUrl?.includes("thedevengine.vercel.app")
                      ? "bg-pink-500/20 border-pink-500 text-pink-300 shadow-sm shadow-pink-500/30"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  vercel.app (Fallback)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Client Portal & QR Code Verification Base URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://devenginehq.com"
                  value={pdfBranding.clientPortalBaseUrl || "https://devenginehq.com"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, clientPortalBaseUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Clients scanning the QR code in bottom-left corner of any PDF will open:{" "}
                  <span className="text-pink-400 font-mono">
                    {pdfBranding.clientPortalBaseUrl || "https://devenginehq.com"}
                    /contract/view/[doc-id]
                  </span>
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Primary Company Website URL on PDF *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://devenginehq.com"
                  value={pdfBranding.companyWebsiteUrl || "https://devenginehq.com"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, companyWebsiteUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Printed in every page footer alongside confidentiality and legal binding notice.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  1. Official Company Email on PDF *
                </label>
                <input
                  type="email"
                  required
                  placeholder="devenginesoftsolution@gmail.com"
                  value={pdfBranding.companyEmail || "devenginesoftsolution@gmail.com"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, companyEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  DevEngine corporate communications email printed in parties block, verification, and footers.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  2. Founder Direct Email on PDF *
                </label>
                <input
                  type="email"
                  required
                  placeholder="hamim.leon@gmail.com"
                  value={pdfBranding.founderEmail || "hamim.leon@gmail.com"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, founderEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Direct executive founder contact printed alongside CEO signature and document footers.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  CEO / Executive Signatory Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="MD. Abdul Hamim Leon"
                  value={pdfBranding.signatoryName || "MD. Abdul Hamim Leon"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, signatoryName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Name printed underneath the attached DevEngine CEO signature on all documents.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-200 mb-1">
                  Executive Signatory Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Managing Director & CEO"
                  value={pdfBranding.signatoryTitle || "Managing Director & CEO"}
                  onChange={(e) =>
                    setPdfBranding({ ...pdfBranding, signatoryTitle: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Official corporate title printed in the execution and authorization block.
                </p>
              </div>
            </div>

            {/* Live Brand Assets Status Overview */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
                Active Brand Assets & Verification Pipeline
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Top Header Logo</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    DevEngine-logo-on-dark2.png
                  </p>
                  <p className="text-[10px] text-slate-500">
                    High-res cyan & white logo rendered in slate-900 top banner.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Background Watermark</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    DevEngine-logo-on-light1.png
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Subtle 4.5% opacity logo watermark on every page background.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">CEO Signature</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Attached
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">founder_sign.png</p>
                  <p className="text-[10px] text-slate-500">
                    MD. Abdul Hamim Leon cursive signature in bottom-right block.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">Client Portal QR</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ Dynamic
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {pdfBranding.clientPortalBaseUrl || "https://devenginehq.com"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Unique per contract; opens online review and digital signing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
