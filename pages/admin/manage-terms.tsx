import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { TermsConfig } from "@/types/terms";
import {
  getTermsConfig,
  updateTermsConfig,
  seedDefaultTermsConfig,
  DEFAULT_TERMS_CONFIG,
} from "@/lib/services/termsService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type TermsTab =
  | "header"
  | "agreement"
  | "eligibility"
  | "accounts"
  | "lifecycle"
  | "paymentStructure"
  | "ip";

export default function ManageTermsPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<TermsTab>("header");
  const [config, setConfig] = useState<TermsConfig>(DEFAULT_TERMS_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-terms");
    });
    return () => unsub();
  }, [router]);

  // Load terms config
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getTermsConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load terms config", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Save all or current
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateTermsConfig(config);
      setMessage({ text: "Terms & Conditions updated successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save terms", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Do you want to reset all Terms & Conditions to the reference defaults? (This will overwrite current edits)"
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await seedDefaultTermsConfig();
      await loadData();
      setMessage({ text: "Default reference terms restored successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to reset terms", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <HelixLoader size={50} color="#38f2ff" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <Head>
        <title>Manage Terms & Conditions - DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-jetbrains text-xs">
                <Link
                  href="/admin/dashboard"
                  className="text-[#38f2ff] hover:underline flex items-center gap-1"
                >
                  ← Back to Dashboard
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">Terms CMS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Terms & Conditions CMS
              </h1>
              <p className="text-sm text-[#849495] mt-1">
                Edit legal agreements, ownership lifecycle, payment phases, and intellectual property terms.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-4 py-2 text-xs font-jetbrains rounded-lg border border-[#38f2ff]/30 text-[#38f2ff] hover:bg-[#38f2ff]/10 transition-colors"
              >
                Reset Defaults
              </button>
              <Link
                href="/terms"
                target="_blank"
                className="px-5 py-2.5 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-[#38f2ff]/30 hover:scale-105 transition-all"
              >
                View Live Page ↗
              </Link>
            </div>
          </div>

          {/* Feedback Message Banner */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl border text-xs font-jetbrains flex justify-between items-center ${
                message.type === "success"
                  ? "bg-[#38f2ff]/10 border-[#38f2ff]/40 text-[#38f2ff]"
                  : "bg-red-900/30 border-red-500/40 text-red-200"
              }`}
            >
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="hover:text-white underline ml-4"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-3 mb-8 border-b border-white/10 scrollbar-none">
            {[
              { id: "header", label: "Header & Status" },
              { id: "agreement", label: "01. Agreement" },
              { id: "eligibility", label: "02. Eligibility" },
              { id: "accounts", label: "03. Accounts" },
              { id: "lifecycle", label: "04. Lifecycle Steps" },
              { id: "paymentStructure", label: "05. Payment Phases" },
              { id: "ip", label: "06. IP Rights" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TermsTab)}
                className={`px-4 py-2 rounded-lg font-jetbrains text-xs whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-[#38f2ff] text-[#02040A] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                    : "bg-[#0A0F1D] text-[#849495] hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="rounded-2xl bg-[#0A0F1D]/80 border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* 1. Header Tab */}
            {activeTab === "header" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Header & Metadata
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={config.header.badgeText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: { ...config.header, badgeText: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.header.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: { ...config.header, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Subtitle Description
                  </label>
                  <textarea
                    rows={2}
                    value={config.header.subtitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: { ...config.header, subtitle: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                      Last Updated Date
                    </label>
                    <input
                      type="text"
                      value={config.header.lastUpdated}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: { ...config.header, lastUpdated: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                      Status Text (e.g. TERMS ACTIVE)
                    </label>
                    <input
                      type="text"
                      value={config.header.statusText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          header: { ...config.header, statusText: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Agreement Tab */}
            {activeTab === "agreement" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    01. Agreement to Terms
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={config.agreement.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        agreement: { ...config.agreement, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Paragraphs
                  </label>
                  {config.agreement.paragraphs.map((para, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs text-[#849495] font-jetbrains">
                        <span>Paragraph #{idx + 1}</span>
                        {config.agreement.paragraphs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = config.agreement.paragraphs.filter((_, i) => i !== idx);
                              setConfig({ ...config, agreement: { ...config.agreement, paragraphs: updated } });
                            }}
                            className="text-red-400 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        value={para}
                        onChange={(e) => {
                          const updated = [...config.agreement.paragraphs];
                          updated[idx] = e.target.value;
                          setConfig({ ...config, agreement: { ...config.agreement, paragraphs: updated } });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm leading-relaxed"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        agreement: {
                          ...config.agreement,
                          paragraphs: [...config.agreement.paragraphs, ""],
                        },
                      })
                    }
                    className="px-4 py-2 text-xs font-jetbrains rounded-lg border border-white/10 text-white hover:bg-white/5"
                  >
                    + Add Paragraph
                  </button>
                </div>
              </div>
            )}

            {/* 3. Eligibility Tab */}
            {activeTab === "eligibility" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    02. Eligibility
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={config.eligibility.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        eligibility: { ...config.eligibility, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Paragraphs
                  </label>
                  {config.eligibility.paragraphs.map((para, idx) => (
                    <div key={idx} className="space-y-1">
                      <textarea
                        rows={3}
                        value={para}
                        onChange={(e) => {
                          const updated = [...config.eligibility.paragraphs];
                          updated[idx] = e.target.value;
                          setConfig({ ...config, eligibility: { ...config.eligibility, paragraphs: updated } });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Accounts Tab */}
            {activeTab === "accounts" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    03. User Accounts & Security
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={config.accounts.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        accounts: { ...config.accounts, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Paragraphs
                  </label>
                  {config.accounts.paragraphs.map((para, idx) => (
                    <div key={idx} className="space-y-1">
                      <textarea
                        rows={3}
                        value={para}
                        onChange={(e) => {
                          const updated = [...config.accounts.paragraphs];
                          updated[idx] = e.target.value;
                          setConfig({ ...config, accounts: { ...config.accounts, paragraphs: updated } });
                        }}
                        className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm leading-relaxed"
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        accounts: {
                          ...config.accounts,
                          paragraphs: [...config.accounts.paragraphs, ""],
                        },
                      })
                    }
                    className="px-4 py-2 text-xs font-jetbrains rounded-lg border border-white/10 text-white hover:bg-white/5"
                  >
                    + Add Paragraph
                  </button>
                </div>
              </div>
            )}

            {/* 5. Lifecycle Steps */}
            {activeTab === "lifecycle" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    04. Software Purchases Lifecycle
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.lifecycle.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lifecycle: { ...config.lifecycle, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={config.lifecycle.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lifecycle: { ...config.lifecycle, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    Lifecycle Flow Steps
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {config.lifecycle.steps.map((step, sIdx) => (
                      <div key={sIdx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                        <label className="block text-[11px] font-jetbrains text-[#38f2ff] uppercase font-bold">
                          Step #{sIdx + 1}
                        </label>
                        <input
                          type="text"
                          value={step.title}
                          placeholder="Title"
                          onChange={(e) => {
                            const updated = [...config.lifecycle.steps];
                            updated[sIdx] = { ...updated[sIdx], title: e.target.value };
                            setConfig({ ...config, lifecycle: { ...config.lifecycle, steps: updated } });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains font-bold"
                        />
                        <input
                          type="text"
                          value={step.icon}
                          placeholder="Icon (e.g. shopping_cart)"
                          onChange={(e) => {
                            const updated = [...config.lifecycle.steps];
                            updated[sIdx] = { ...updated[sIdx], icon: e.target.value };
                            setConfig({ ...config, lifecycle: { ...config.lifecycle, steps: updated } });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-white/10 text-[#849495] text-xs font-jetbrains"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 6. Payment Structure */}
            {activeTab === "paymentStructure" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    05. Custom Development Payment Structure
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.paymentStructure.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        paymentStructure: { ...config.paymentStructure, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    Payment Phases
                  </h3>
                  {config.paymentStructure.phases.map((phase, pIdx) => (
                    <div key={pIdx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={phase.phase}
                          placeholder="Phase Name (e.g. 01. INITIATION)"
                          onChange={(e) => {
                            const updated = [...config.paymentStructure.phases];
                            updated[pIdx] = { ...updated[pIdx], phase: e.target.value };
                            setConfig({
                              ...config,
                              paymentStructure: { ...config.paymentStructure, phases: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[#38f2ff] text-xs font-jetbrains font-bold"
                        />
                        <input
                          type="text"
                          value={phase.obligation}
                          placeholder="Obligation (e.g. 30% Upfront)"
                          onChange={(e) => {
                            const updated = [...config.paymentStructure.phases];
                            updated[pIdx] = { ...updated[pIdx], obligation: e.target.value };
                            setConfig({
                              ...config,
                              paymentStructure: { ...config.paymentStructure, phases: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={phase.description}
                        placeholder="Phase Description"
                        onChange={(e) => {
                          const updated = [...config.paymentStructure.phases];
                          updated[pIdx] = { ...updated[pIdx], description: e.target.value };
                          setConfig({
                            ...config,
                            paymentStructure: { ...config.paymentStructure, phases: updated },
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. IP Rights */}
            {activeTab === "ip" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    06. Intellectual Property Rights
                  </h2>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-[#38f2ff] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#38f2ff] uppercase mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.intellectualProperty.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        intellectualProperty: { ...config.intellectualProperty, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                  {/* DevEngine Owned */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <h3 className="font-jetbrains text-xs text-[#849495] uppercase font-bold">
                      DevEngine Owned Items (Line-by-line)
                    </h3>
                    <textarea
                      rows={5}
                      value={config.intellectualProperty.devEngineOwned.join("\n")}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          intellectualProperty: {
                            ...config.intellectualProperty,
                            devEngineOwned: e.target.value.split("\n").filter(Boolean),
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs leading-relaxed"
                    />
                  </div>

                  {/* Client Owned */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <h3 className="font-jetbrains text-xs text-[#38f2ff] uppercase font-bold">
                      Client Owned Items (Line-by-line)
                    </h3>
                    <textarea
                      rows={5}
                      value={config.intellectualProperty.clientOwned.join("\n")}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          intellectualProperty: {
                            ...config.intellectualProperty,
                            clientOwned: e.target.value.split("\n").filter(Boolean),
                          },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>      </div>
    </AdminLayout>
  );
}
