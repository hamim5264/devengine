import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { PrivacyConfig, PrivacyCollectionItem, PrivacyUserRightItem } from "@/types/privacy";
import {
  getPrivacyConfig,
  updatePrivacyConfig,
  resetPrivacyConfigToDefault,
  DEFAULT_PRIVACY_CONFIG,
} from "@/lib/services/privacyService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type PrivacyTab =
  | "header"
  | "overview"
  | "informationCollected"
  | "dataFlow"
  | "cookies"
  | "userRights";

export default function ManagePrivacyPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<PrivacyTab>("header");
  const [config, setConfig] = useState<PrivacyConfig>(DEFAULT_PRIVACY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Admin auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-privacy");
    });
    return () => unsub();
  }, [router]);

  // Load privacy config
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPrivacyConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to load privacy config",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Save current config
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updatePrivacyConfig(config);
      setMessage({
        text: "Privacy Policy configuration saved successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err?.message || "Failed to save privacy config",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to default
  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset all Privacy Policy content to standard default values? All customized text will be replaced."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await resetPrivacyConfigToDefault();
      setConfig(DEFAULT_PRIVACY_CONFIG);
      setMessage({
        text: "Privacy Policy reset to defaults successfully!",
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to reset config",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for Provided Collection Items
  const handleUpdateProvidedItem = (
    index: number,
    field: keyof PrivacyCollectionItem,
    value: string
  ) => {
    const updated = [...config.informationCollected.providedItems];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({
      ...config,
      informationCollected: {
        ...config.informationCollected,
        providedItems: updated,
      },
    });
  };

  const handleAddProvidedItem = () => {
    const newItem: PrivacyCollectionItem = {
      id: `item_${Date.now()}`,
      title: "New Category:",
      description: "Description of the information collected.",
    };
    setConfig({
      ...config,
      informationCollected: {
        ...config.informationCollected,
        providedItems: [
          ...config.informationCollected.providedItems,
          newItem,
        ],
      },
    });
  };

  const handleDeleteProvidedItem = (index: number) => {
    const updated = config.informationCollected.providedItems.filter(
      (_, i) => i !== index
    );
    setConfig({
      ...config,
      informationCollected: {
        ...config.informationCollected,
        providedItems: updated,
      },
    });
  };

  // Helper functions for User Rights Items
  const handleUpdateRightItem = (
    index: number,
    field: keyof PrivacyUserRightItem,
    value: string
  ) => {
    const updated = [...config.userRights.rights];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({
      ...config,
      userRights: {
        ...config.userRights,
        rights: updated,
      },
    });
  };

  const handleAddRightItem = () => {
    const newRight: PrivacyUserRightItem = {
      id: `right_${Date.now()}`,
      title: "New Right",
      description: "Description of the user right and how to exercise it.",
    };
    setConfig({
      ...config,
      userRights: {
        ...config.userRights,
        rights: [...config.userRights.rights, newRight],
      },
    });
  };

  const handleDeleteRightItem = (index: number) => {
    const updated = config.userRights.rights.filter((_, i) => i !== index);
    setConfig({
      ...config,
      userRights: {
        ...config.userRights,
        rights: updated,
      },
    });
  };

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Privacy Policy CMS | Admin</title>
        </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <p className="text-gray-400 font-mono">Checking admin credentials...</p>
        </main>
    </AdminLayout>
  );
  }

  if (loading) {
    return (
    <AdminLayout>
        <Head>
          <title>Privacy Policy CMS | Admin</title>
        </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <div className="flex flex-col items-center justify-center">
            <HelixLoader size={56} color="#38f2ff" />
            <p className="mt-4 text-[#849495] font-mono">Loading Privacy Policy CMS…</p>
          </div>
        </main>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Privacy Policy | DevEngine Admin</title>
      </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/dashboard"
                className="text-xs font-mono text-[#38f2ff] hover:underline"
              >
                ← Back to Dashboard
              </Link>
              <span className="text-gray-600">|</span>
              <Link
                href="/privacy-policy"
                target="_blank"
                className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1"
              >
                View Public Privacy Policy ↗
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2 flex items-center gap-3">
              Privacy Policy CMS
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#38f2ff]/10 text-[#38f2ff] border border-[#38f2ff]/30">
                Live Firestore
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2 text-xs font-mono rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 text-xs font-mono font-bold rounded-lg bg-[#38f2ff] hover:bg-[#00dbe8] text-black shadow-lg shadow-[#38f2ff]/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl border text-sm font-mono flex items-center justify-between ${
              message.type === "success"
                ? "bg-teal-950/40 border-teal-500/40 text-teal-300"
                : "bg-red-950/40 border-red-500/40 text-red-300"
            }`}
          >
            <span>{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white ml-4 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {[
            { id: "header", label: "Header & Meta" },
            { id: "overview", label: "01 Overview" },
            { id: "informationCollected", label: "02 Information We Collect" },
            { id: "dataFlow", label: "03 Data Flow & Security" },
            { id: "cookies", label: "04 Cookies & Tracking" },
            { id: "userRights", label: "05 User Rights" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PrivacyTab)}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
                activeTab === tab.id
                  ? "bg-[#38f2ff] text-black font-bold shadow-md shadow-[#38f2ff]/20"
                  : "bg-[#161c28] text-gray-300 hover:bg-[#242a36] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Header */}
        {activeTab === "header" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              Header & Hero Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Badge Text (Top Pill)
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
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
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
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Page Headline Title
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
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Subtitle / Description
              </label>
              <textarea
                rows={3}
                value={config.header.subtitle}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    header: { ...config.header, subtitle: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Overview */}
        {activeTab === "overview" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              01 - Overview & Key Principle
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Number
                </label>
                <input
                  type="text"
                  value={config.overview.sectionNum}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: { ...config.overview, sectionNum: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.overview.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: { ...config.overview, sectionTitle: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Lead Overview Paragraph
              </label>
              <textarea
                rows={4}
                value={config.overview.leadText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    overview: { ...config.overview, leadText: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Secondary Agreement Paragraph
              </label>
              <textarea
                rows={3}
                value={config.overview.subText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    overview: { ...config.overview, subText: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-[#161c28]/60 border border-[#38f2ff]/20 space-y-4">
              <h3 className="text-sm font-mono text-[#38f2ff] font-bold">
                Key Principle Callout Box
              </h3>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Key Principle Box Title
                </label>
                <input
                  type="text"
                  value={config.overview.keyPrincipleTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: {
                        ...config.overview,
                        keyPrincipleTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#1a202c] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Key Principle Statement
                </label>
                <textarea
                  rows={2}
                  value={config.overview.keyPrincipleText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: {
                        ...config.overview,
                        keyPrincipleText: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#1a202c] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Information We Collect */}
        {activeTab === "informationCollected" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              02 - Information We Collect
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Number
                </label>
                <input
                  type="text"
                  value={config.informationCollected.sectionNum}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      informationCollected: {
                        ...config.informationCollected,
                        sectionNum: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.informationCollected.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      informationCollected: {
                        ...config.informationCollected,
                        sectionTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                "Information You Provide to Us" Intro Text
              </label>
              <textarea
                rows={3}
                value={config.informationCollected.providedIntro}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    informationCollected: {
                      ...config.informationCollected,
                      providedIntro: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* Dynamic Collection Items List */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono text-white font-bold">
                  Provided Information Items ({config.informationCollected.providedItems.length})
                </h3>
                <button
                  onClick={handleAddProvidedItem}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-[#38f2ff]/20 text-[#38f2ff] hover:bg-[#38f2ff]/30 transition"
                >
                  + Add Item
                </button>
              </div>

              {config.informationCollected.providedItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-lg bg-[#161c28] border border-white/5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-500">
                      Item #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteProvidedItem(idx)}
                      className="text-xs text-red-400 hover:text-red-300 font-mono"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Category / Title
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) =>
                          handleUpdateProvidedItem(idx, "title", e.target.value)
                        }
                        className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          handleUpdateProvidedItem(idx, "description", e.target.value)
                        }
                        className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Automatically Collected Section */}
            <div className="pt-4 border-t border-white/10 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold">
                Automatically Collected Information
              </h3>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={config.informationCollected.autoTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      informationCollected: {
                        ...config.informationCollected,
                        autoTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={config.informationCollected.autoText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      informationCollected: {
                        ...config.informationCollected,
                        autoText: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Data Flow & Security */}
        {activeTab === "dataFlow" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              03 - Data Flow & Security Visualization
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Number
                </label>
                <input
                  type="text"
                  value={config.dataFlow.sectionNum}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      dataFlow: { ...config.dataFlow, sectionNum: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.dataFlow.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      dataFlow: { ...config.dataFlow, sectionTitle: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Introduction Text
              </label>
              <textarea
                rows={3}
                value={config.dataFlow.introText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    dataFlow: { ...config.dataFlow, introText: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* 3 Nodes Configuration */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-mono text-white font-bold">
                Flow Nodes (Client → Core → Storage)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Node 1 */}
                <div className="p-4 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                  <span className="text-xs font-mono text-[#38f2ff] font-bold">
                    Node 1: Client
                  </span>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node1Label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node1Label: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Subtext
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node1Sub}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node1Sub: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Node 2 */}
                <div className="p-4 rounded-xl bg-[#161c28] border border-[#38f2ff]/30 space-y-3 shadow-[0_0_15px_rgba(56,242,255,0.05)]">
                  <span className="text-xs font-mono text-[#38f2ff] font-bold">
                    Node 2: DevEngine Core
                  </span>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node2Label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node2Label: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Subtext
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node2Sub}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node2Sub: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Node 3 */}
                <div className="p-4 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                  <span className="text-xs font-mono text-[#38f2ff] font-bold">
                    Node 3: Secure Storage
                  </span>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node3Label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node3Label: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Subtext
                    </label>
                    <input
                      type="text"
                      value={config.dataFlow.node3Sub}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          dataFlow: {
                            ...config.dataFlow,
                            node3Sub: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Cookies & Tracking */}
        {activeTab === "cookies" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              04 - Cookies & Tracking
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Number
                </label>
                <input
                  type="text"
                  value={config.cookies.sectionNum}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cookies: { ...config.cookies, sectionNum: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.cookies.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      cookies: { ...config.cookies, sectionTitle: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Paragraph 1: Tracking Technologies Usage
              </label>
              <textarea
                rows={4}
                value={config.cookies.paragraph1}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cookies: { ...config.cookies, paragraph1: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Paragraph 2: Browser Controls & Refusal
              </label>
              <textarea
                rows={3}
                value={config.cookies.paragraph2}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    cookies: { ...config.cookies, paragraph2: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Tab 6: User Rights */}
        {activeTab === "userRights" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              05 - User Rights Cards
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Number
                </label>
                <input
                  type="text"
                  value={config.userRights.sectionNum}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      userRights: {
                        ...config.userRights,
                        sectionNum: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.userRights.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      userRights: {
                        ...config.userRights,
                        sectionTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Introduction Text
              </label>
              <textarea
                rows={2}
                value={config.userRights.introText}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    userRights: {
                      ...config.userRights,
                      introText: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* Dynamic Rights Cards List */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-mono text-white font-bold">
                  User Rights Cards ({config.userRights.rights.length})
                </h3>
                <button
                  onClick={handleAddRightItem}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-[#38f2ff]/20 text-[#38f2ff] hover:bg-[#38f2ff]/30 transition"
                >
                  + Add Right Card
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.userRights.rights.map((right, idx) => (
                  <div
                    key={right.id || idx}
                    className="p-4 rounded-xl bg-[#161c28] border border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#38f2ff]">
                        Card #{idx + 1}
                      </span>
                      <button
                        onClick={() => handleDeleteRightItem(idx)}
                        className="text-xs text-red-400 hover:text-red-300 font-mono"
                      >
                        Delete
                      </button>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Right Name (e.g. Access, Erasure)
                      </label>
                      <input
                        type="text"
                        value={right.title}
                        onChange={(e) =>
                          handleUpdateRightItem(idx, "title", e.target.value)
                        }
                        className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Right Description
                      </label>
                      <textarea
                        rows={2}
                        value={right.description}
                        onChange={(e) =>
                          handleUpdateRightItem(idx, "description", e.target.value)
                        }
                        className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Action */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 text-sm font-mono font-bold rounded-lg bg-[#38f2ff] hover:bg-[#00dbe8] text-black shadow-lg shadow-[#38f2ff]/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Privacy Policy Changes"
            )}
          </button>
        </div>
      </main>
    </AdminLayout>
  );
}
