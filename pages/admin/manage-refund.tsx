import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { RefundConfig, RefundSection } from "@/types/refund";
import {
  getRefundConfig,
  updateRefundConfig,
  seedDefaultRefundConfig,
  DEFAULT_REFUND_CONFIG,
} from "@/lib/services/refundService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type RefundTab =
  | "header"
  | "corePolicy"
  | "digitalGoodsRationale"
  | "verificationAudit"
  | "disputeResolution"
  | "exceptionsNotice"
  | "contactSupport";

export default function ManageRefundPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<RefundTab>("header");
  const [config, setConfig] = useState<RefundConfig>(DEFAULT_REFUND_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin auth verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-refund");
    });
    return () => unsub();
  }, [router]);

  // Fetch config
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getRefundConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load refund policy configuration", type: "error" });
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
      await updateRefundConfig(config);
      setMessage({ text: "Strict No-Return & Refund Policy updated successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save refund policy", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Reset defaults
  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Reset all Refund Policy terms to reference defaults? This will overwrite existing custom changes."
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await seedDefaultRefundConfig();
      await loadData();
      setMessage({ text: "Default reference terms restored successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to reset refund policy", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (
    key: Exclude<RefundTab, "header">,
    field: keyof RefundSection,
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
    key: Exclude<RefundTab, "header">,
    index: number,
    text: string
  ) => {
    const updated = [...config[key].paragraphs];
    updated[index] = text;
    updateSection(key, "paragraphs", updated);
  };

  const addParagraph = (key: Exclude<RefundTab, "header">) => {
    const updated = [...config[key].paragraphs, ""];
    updateSection(key, "paragraphs", updated);
  };

  const removeParagraph = (
    key: Exclude<RefundTab, "header">,
    index: number
  ) => {
    const updated = config[key].paragraphs.filter((_, i) => i !== index);
    updateSection(key, "paragraphs", updated);
  };

  const updateBullet = (
    key: Exclude<RefundTab, "header">,
    index: number,
    text: string
  ) => {
    const bullets = config[key].bullets || [];
    const updated = [...bullets];
    updated[index] = text;
    updateSection(key, "bullets", updated);
  };

  const addBullet = (key: Exclude<RefundTab, "header">) => {
    const bullets = config[key].bullets || [];
    const updated = [...bullets, ""];
    updateSection(key, "bullets", updated);
  };

  const removeBullet = (
    key: Exclude<RefundTab, "header">,
    index: number
  ) => {
    const bullets = config[key].bullets || [];
    const updated = bullets.filter((_, i) => i !== index);
    updateSection(key, "bullets", updated);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <HelixLoader size={48} color="#f59e0b" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const tabList: { id: RefundTab; label: string; icon: string }[] = [
    { id: "header", label: "Header & Meta", icon: "badge" },
    { id: "corePolicy", label: "01. Core Rule", icon: "policy" },
    { id: "digitalGoodsRationale", label: "02. Digital Goods", icon: "cloud_sync" },
    { id: "verificationAudit", label: "03. Payment Audit", icon: "receipt_long" },
    { id: "disputeResolution", label: "04. Duplicates & Disputes", icon: "price_change" },
    { id: "exceptionsNotice", label: "05. Delivery Failures", icon: "warning" },
    { id: "contactSupport", label: "06. Pre-Purchase Help", icon: "support_agent" },
  ];

  return (
    <AdminLayout>
      <Head>
        <title>Manage Refund Policy — DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-amber-400 transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span>Legal & Compliance</span>
                <span>/</span>
                <span className="text-amber-400 font-bold">Refund Policy CMS</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Manage Strict No-Return & Refund Policy
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Live Firestore
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Configure strict non-refundable terms for digital software licenses, duplicate payment resolutions, and audit protocols.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/refund-policy"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/[0.2] bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span>View Public Page ↗</span>
              </Link>

              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-mono text-red-300 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Restore standard reference text"
              >
                Reset Defaults
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Policy Status</span>
              <p className="text-sm font-mono font-bold text-white mt-1.5 truncate">
                {config.header.policyStatus || "STRICT BINDING"}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">License Rule</span>
              <p className="text-sm font-mono font-bold text-rose-300 mt-1.5 truncate">
                {config.header.strictBadge || "NON-REFUNDABLE"}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">Last Revised</span>
              <p className="text-sm font-mono font-bold text-amber-300 mt-1.5 truncate">
                {config.header.lastUpdated || "September 2026"}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-teal-400 uppercase tracking-wider">Total Clauses</span>
              <p className="text-2xl font-bold text-white mt-1">6 Sections</p>
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-4 rounded-2xl mb-6 text-xs font-mono flex items-center justify-between shadow-xl backdrop-blur-xl border ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-red-500/10 border-red-500/30 text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-current" />
                <span>{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 mb-8">
            {tabList.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20"
                    : "bg-white/[0.03] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/[0.06]"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Middle Centered Loader or Tab Body */}
          {loading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 gap-3">
              <HelixLoader size={45} color="#f59e0b" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                Querying compliance policy...
              </span>
            </div>
          ) : (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-10 backdrop-blur-xl shadow-2xl space-y-6">
              {/* 1. Header & Meta */}
              {activeTab === "header" && (
                <div className="space-y-6">
                  <div className="border-b border-white/[0.08] pb-4">
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Header & Metadata Settings
                    </h2>
                    <p className="text-xs font-mono text-gray-400 mt-1">
                      Configure policy hero badges, compliance status, and overview text.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
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
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                        Strict Policy Badge (Red)
                      </label>
                      <input
                        type="text"
                        value={config.header.strictBadge}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            header: { ...prev.header, strictBadge: e.target.value },
                          }))
                        }
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                        Policy Status Text
                      </label>
                      <input
                        type="text"
                        value={config.header.policyStatus}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            header: { ...prev.header, policyStatus: e.target.value },
                          }))
                        }
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
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
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                      Page Title
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
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-base text-white font-bold focus:outline-none focus:border-amber-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
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
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white leading-relaxed focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* 2. Generic Section Editor for any clause tab */}
              {activeTab !== "header" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-white tracking-tight">
                        Section {config[activeTab].number}: {config[activeTab].title}
                      </h2>
                      <p className="text-xs font-mono text-gray-400 mt-0.5">
                        Clause Identifier: #{config[activeTab].id}
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 font-mono text-xs text-amber-300">
                      Active Clause
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                        Section Number
                      </label>
                      <input
                        type="text"
                        value={config[activeTab].number}
                        onChange={(e) => updateSection(activeTab, "number", e.target.value)}
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-mono focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                        Section Title
                      </label>
                      <input
                        type="text"
                        value={config[activeTab].title}
                        onChange={(e) => updateSection(activeTab, "title", e.target.value)}
                        className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white font-bold focus:outline-none focus:border-amber-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Paragraphs */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                        Paragraphs / Legal Explanations
                      </label>
                      <button
                        type="button"
                        onClick={() => addParagraph(activeTab)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        + Add Paragraph
                      </button>
                    </div>

                    {config[activeTab].paragraphs.map((para, pIdx) => (
                      <div key={pIdx} className="flex items-start gap-3">
                        <textarea
                          rows={3}
                          value={para}
                          onChange={(e) => updateParagraph(activeTab, pIdx, e.target.value)}
                          placeholder={`Paragraph ${pIdx + 1}...`}
                          className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-3.5 text-xs sm:text-sm text-white leading-relaxed focus:outline-none focus:border-amber-500/50 resize-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removeParagraph(activeTab, pIdx)}
                          className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-red-500/20 text-gray-400 hover:text-red-300 border border-white/[0.06] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Remove paragraph"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Bullets (Optional) */}
                  <div className="space-y-3 pt-5 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                        Bullet Points / Conditions (Optional)
                      </label>
                      <button
                        type="button"
                        onClick={() => addBullet(activeTab)}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        + Add Bullet Item
                      </button>
                    </div>

                    {(config[activeTab].bullets || []).map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-center gap-3">
                        <span className="text-amber-400 text-xs font-mono">•</span>
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) => updateBullet(activeTab, bIdx, e.target.value)}
                          placeholder={`Bullet item ${bIdx + 1}...`}
                          className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => removeBullet(activeTab, bIdx)}
                          className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-red-500/20 text-gray-400 hover:text-red-300 border border-white/[0.06] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Remove bullet"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </AdminLayout>
  );
}
