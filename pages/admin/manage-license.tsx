import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { LicenseConfig, LicenseSection } from "@/types/license";
import {
  getLicenseConfig,
  updateLicenseConfig,
  seedDefaultLicenseConfig,
  DEFAULT_LICENSE_CONFIG,
} from "@/lib/services/licenseService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type LicenseTab =
  | "header"
  | "grantOfLicense"
  | "permittedUses"
  | "restrictions"
  | "sourceCodeRights"
  | "intellectualProperty"
  | "warrantiesAndLiability"
  | "termination"
  | "auditAndCompliance";

export default function ManageLicensePage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<LicenseTab>("header");
  const [config, setConfig] = useState<LicenseConfig>(DEFAULT_LICENSE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin auth verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-license");
    });
    return () => unsub();
  }, [router]);

  // Fetch config from Firestore
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getLicenseConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load license configuration", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateLicenseConfig(config);
      setMessage({ text: "Commercial License Agreement updated successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save license configuration", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default configuration
  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Reset all Commercial License terms to reference defaults? This will overwrite existing custom changes."
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await seedDefaultLicenseConfig();
      await loadData();
      setMessage({ text: "Default reference terms restored successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to reset license", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (
    key: Exclude<LicenseTab, "header">,
    field: keyof LicenseSection,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  const updateParagraph = (
    key: Exclude<LicenseTab, "header">,
    index: number,
    text: string
  ) => {
    const updated = [...config[key].paragraphs];
    updated[index] = text;
    updateSection(key, "paragraphs", updated);
  };

  const addParagraph = (key: Exclude<LicenseTab, "header">) => {
    const updated = [...config[key].paragraphs, ""];
    updateSection(key, "paragraphs", updated);
  };

  const removeParagraph = (
    key: Exclude<LicenseTab, "header">,
    index: number
  ) => {
    const updated = config[key].paragraphs.filter((_, i) => i !== index);
    updateSection(key, "paragraphs", updated);
  };

  const updateBullet = (
    key: Exclude<LicenseTab, "header">,
    index: number,
    text: string
  ) => {
    const bullets = config[key].bullets || [];
    const updated = [...bullets];
    updated[index] = text;
    updateSection(key, "bullets", updated);
  };

  const addBullet = (key: Exclude<LicenseTab, "header">) => {
    const bullets = config[key].bullets || [];
    const updated = [...bullets, ""];
    updateSection(key, "bullets", updated);
  };

  const removeBullet = (
    key: Exclude<LicenseTab, "header">,
    index: number
  ) => {
    const bullets = config[key].bullets || [];
    const updated = bullets.filter((_, i) => i !== index);
    updateSection(key, "bullets", updated);
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <HelixLoader size={50} color="#38f2ff" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabList: { id: LicenseTab; label: string; icon: string }[] = [
    { id: "header", label: "Header & Meta", icon: "badge" },
    { id: "grantOfLicense", label: "01. License Grant", icon: "verified" },
    { id: "permittedUses", label: "02. Permitted Uses", icon: "done_all" },
    { id: "restrictions", label: "03. Restrictions", icon: "block" },
    { id: "sourceCodeRights", label: "04. Source Rights", icon: "code" },
    { id: "intellectualProperty", label: "05. IP Ownership", icon: "copyright" },
    { id: "warrantiesAndLiability", label: "06. Warranties", icon: "shield" },
    { id: "termination", label: "07. Termination", icon: "cancel" },
    { id: "auditAndCompliance", label: "08. Audit Rights", icon: "fact_check" },
  ];

  return (
    <AdminLayout>
      <Head>
        <title>Manage Commercial License — DevEngine Admin</title>
      </Head>
        <main className="px-4 sm:px-8 py-8 max-w-7xl mx-auto min-h-[calc(100vh-56px)] text-gray-200">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/admin/dashboard" className="text-xs font-mono text-gray-400 hover:text-white transition">
                ← Admin Dashboard
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-xs font-mono text-[#38f2ff] font-bold">License CMS</span>
            </div>
            <h1 className="text-3xl font-space font-bold text-white tracking-tight">
              Manage Commercial License Agreement
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Configure production deployment rights, anti-redistribution terms, source code access, and IP clauses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/commercial-license"
              target="_blank"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>View Public Page</span>
            </Link>

            <button
              onClick={handleResetDefaults}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-xs font-mono text-red-300 transition"
              title="Restore standard reference text"
            >
              Reset Defaults
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#38f2ff] hover:bg-[#78f5ff] text-[#030712] font-space font-bold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(56,242,255,0.4)] disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`p-4 rounded-xl mb-6 text-xs font-mono flex items-center justify-between ${
              message.type === "success"
                ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/15 border border-red-500/30 text-red-300"
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {tabList.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-[#38f2ff] text-[#030712] shadow-[0_0_15px_rgba(56,242,255,0.3)]"
                  : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="bg-[#08111f] border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          {/* 1. Header & Meta */}
          {activeTab === "header" && (
            <div className="space-y-6">
              <h2 className="text-xl font-space font-bold text-white border-b border-white/10 pb-3">
                Header & Metadata Settings
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    value={config.header.badgeText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: { ...prev.header, badgeText: e.target.value },
                      }))
                    }
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Version Identifier
                  </label>
                  <input
                    type="text"
                    value={config.header.version}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: { ...prev.header, version: e.target.value },
                      }))
                    }
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Status Text (Badge)
                  </label>
                  <input
                    type="text"
                    value={config.header.statusText}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: { ...prev.header, statusText: e.target.value },
                      }))
                    }
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Last Revised / Updated
                  </label>
                  <input
                    type="text"
                    value={config.header.lastUpdated}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        header: { ...prev.header, lastUpdated: e.target.value },
                      }))
                    }
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                  Title
                </label>
                <input
                  type="text"
                  value={config.header.title}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: { ...prev.header, title: e.target.value },
                    }))
                  }
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-base text-white font-space font-bold focus:outline-none focus:border-[#38f2ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                  Subtitle Description
                </label>
                <textarea
                  rows={3}
                  value={config.header.subtitle}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      header: { ...prev.header, subtitle: e.target.value },
                    }))
                  }
                  className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#38f2ff] resize-none"
                />
              </div>
            </div>
          )}

          {/* 2. Generic Section Editor for any clause tab */}
          {activeTab !== "header" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h2 className="text-xl font-space font-bold text-white">
                  Section {config[activeTab].number}: {config[activeTab].title}
                </h2>
                <span className="font-mono text-xs text-[#38f2ff]">
                  ID: #{config[activeTab].id}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Section Number
                  </label>
                  <input
                    type="text"
                    value={config[activeTab].number}
                    onChange={(e) => updateSection(activeTab, "number", e.target.value)}
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-mono text-gray-300 mb-2 font-semibold">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={config[activeTab].title}
                    onChange={(e) => updateSection(activeTab, "title", e.target.value)}
                    className="w-full bg-[#050b14] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-space font-bold focus:outline-none focus:border-[#38f2ff]"
                  />
                </div>
              </div>

              {/* Paragraphs */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-gray-300 font-semibold uppercase tracking-wider">
                    Paragraphs / Legal Text
                  </label>
                  <button
                    type="button"
                    onClick={() => addParagraph(activeTab)}
                    className="text-xs font-mono text-[#38f2ff] hover:underline flex items-center gap-1"
                  >
                    + Add Paragraph
                  </button>
                </div>

                {config[activeTab].paragraphs.map((para, pIdx) => (
                  <div key={pIdx} className="flex items-start gap-2.5">
                    <textarea
                      rows={3}
                      value={para}
                      onChange={(e) => updateParagraph(activeTab, pIdx, e.target.value)}
                      placeholder={`Paragraph ${pIdx + 1}...`}
                      className="w-full bg-[#050b14] border border-white/10 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-[#38f2ff] resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeParagraph(activeTab, pIdx)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                      title="Remove paragraph"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Bullets (Optional) */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono text-gray-300 font-semibold uppercase tracking-wider">
                    Bullet Points / Scope Items (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => addBullet(activeTab)}
                    className="text-xs font-mono text-[#38f2ff] hover:underline flex items-center gap-1"
                  >
                    + Add Bullet Item
                  </button>
                </div>

                {(config[activeTab].bullets || []).map((bullet, bIdx) => (
                  <div key={bIdx} className="flex items-center gap-2.5">
                    <span className="text-[#38f2ff] text-xs font-mono">•</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) => updateBullet(activeTab, bIdx, e.target.value)}
                      placeholder={`Bullet item ${bIdx + 1}...`}
                      className="w-full bg-[#050b14] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#38f2ff]"
                    />
                    <button
                      type="button"
                      onClick={() => removeBullet(activeTab, bIdx)}
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition shrink-0"
                      title="Remove bullet"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminLayout>
  );
}
