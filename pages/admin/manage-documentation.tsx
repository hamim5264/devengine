import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { DocumentationConfig, DocGuideItem } from "@/types/documentation";
import {
  getDocumentationConfig,
  updateDocumentationConfig,
  resetDocumentationConfigToDefault,
  DEFAULT_DOCUMENTATION_CONFIG,
} from "@/lib/services/documentationService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type DocTab = "header" | "quickStart" | "guides" | "apiAccess";

export default function ManageDocumentationPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<DocTab>("header");
  const [config, setConfig] = useState<DocumentationConfig>(
    DEFAULT_DOCUMENTATION_CONFIG
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-documentation");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getDocumentationConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to load documentation config",
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

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateDocumentationConfig(config);
      setMessage({
        text: "Documentation & API Access configuration saved successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err?.message || "Failed to save documentation config",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset Documentation & API Access to standard defaults? All custom text will be replaced."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await resetDocumentationConfigToDefault();
      setConfig(DEFAULT_DOCUMENTATION_CONFIG);
      setMessage({
        text: "Documentation & API Access reset to defaults successfully!",
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

  // Helper functions for Guides
  const handleUpdateGuide = (
    index: number,
    field: keyof DocGuideItem,
    value: string
  ) => {
    const updated = [...config.guides.guides];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({
      ...config,
      guides: {
        ...config.guides,
        guides: updated,
      },
    });
  };

  const handleAddGuide = () => {
    const newGuide: DocGuideItem = {
      id: `guide_${Date.now()}`,
      icon: "category",
      title: "New Architectural Guide",
      description: "Comprehensive walkthrough of this system component.",
      tag: "CORE",
    };
    setConfig({
      ...config,
      guides: {
        ...config.guides,
        guides: [...config.guides.guides, newGuide],
      },
    });
  };

  const handleDeleteGuide = (index: number) => {
    const updated = config.guides.guides.filter((_, i) => i !== index);
    setConfig({
      ...config,
      guides: {
        ...config.guides,
        guides: updated,
      },
    });
  };

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Documentation CMS | Admin</title>
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
          <title>Documentation CMS | Admin</title>
        </Head>
        <main className="px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
            <HelixLoader size={45} color="#14b8a6" />
            <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
              Loading Documentation CMS…
            </p>
          </div>
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Documentation & API Access | DevEngine Admin</title>
      </Head>
      <main className="px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)] text-gray-100">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-teal-400 font-jetbrains text-xs tracking-wider transition-colors"
                >
                  ← DASHBOARD
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-teal-400 font-jetbrains text-xs tracking-widest uppercase font-semibold">
                  CMS ENGINE
                </span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 font-jetbrains text-xs tracking-widest uppercase">
                  DOCS & API
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Documentation & API Access CMS
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-jetbrains font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE FIRESTORE
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Customize architectural documentation hero banners, quick start terminal snippets, guides, and enterprise API endpoints.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/documentation-and-api-access"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-jetbrains font-semibold tracking-wider transition-all flex items-center gap-2"
              >
                <span>VIEW PUBLIC DOCS & API</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
              <button
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2.5 text-xs font-jetbrains rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-50"
              >
                RESET DEFAULTS
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 text-xs font-jetbrains font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>SAVING…</span>
                  </>
                ) : (
                  <span>SAVE CHANGES</span>
                )}
              </button>
            </div>
          </div>

          {/* Message Notification */}
          {message && (
            <div
              className={`p-4 rounded-2xl border text-xs font-jetbrains flex items-center justify-between animate-fadeIn ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <span>{message.text}</span>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-white ml-4 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-2 rounded-2xl shadow-xl">
            {[
              { id: "header", label: "Hero & Release Badge" },
              { id: "quickStart", label: "Quick Start Terminal Code" },
              { id: "guides", label: "Popular Architecture Guides" },
              { id: "apiAccess", label: "API Access & Endpoints" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DocTab)}
                className={`px-4 py-2.5 rounded-xl text-xs font-jetbrains font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-md shadow-teal-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Header */}
          {activeTab === "header" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Hero Section Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Release Badge Text
                  </label>
                  <input
                    type="text"
                    value={config.header.releaseBadge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: {
                          ...config.header,
                          releaseBadge: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Last Updated Date
                  </label>
                  <input
                    type="text"
                    value={config.header.lastUpdated}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: {
                          ...config.header,
                          lastUpdated: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Main Brand Title
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
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Title Highlight
                  </label>
                  <input
                    type="text"
                    value={config.header.titleHighlight}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        header: {
                          ...config.header,
                          titleHighlight: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Subtitle Description
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
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Quick Start */}
          {activeTab === "quickStart" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Quick Start Terminal Code Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={config.quickStart.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        quickStart: {
                          ...config.quickStart,
                          title: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Terminal Window Header Label
                  </label>
                  <input
                    type="text"
                    value={config.quickStart.terminalLabel}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        quickStart: {
                          ...config.quickStart,
                          terminalLabel: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  CLI Code Snippet Content (Multi-line)
                </label>
                <textarea
                  rows={10}
                  value={config.quickStart.codeSnippet}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      quickStart: {
                        ...config.quickStart,
                        codeSnippet: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-black/50 border border-white/[0.08] rounded-xl p-4 font-jetbrains text-xs text-teal-300 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Guides */}
          {activeTab === "guides" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Popular Architecture Guides Configuration
              </h2>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.guides.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      guides: { ...config.guides, title: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-jetbrains text-white font-bold uppercase tracking-wider">
                    Guides List ({config.guides.guides.length})
                  </span>
                  <button
                    onClick={handleAddGuide}
                    className="px-4 py-2 text-xs font-jetbrains rounded-xl bg-teal-500/15 text-teal-300 border border-teal-500/30 hover:bg-teal-500/25 transition cursor-pointer"
                  >
                    + ADD GUIDE
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.guides.guides.map((guide, idx) => (
                    <div
                      key={guide.id || idx}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-jetbrains text-teal-400 font-bold">
                          Guide #{idx + 1}
                        </span>
                        <button
                          onClick={() => handleDeleteGuide(idx)}
                          className="text-xs text-rose-400 hover:text-rose-300 font-jetbrains cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={guide.title}
                            onChange={(e) =>
                              handleUpdateGuide(idx, "title", e.target.value)
                            }
                            className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                            Tag Badge
                          </label>
                          <input
                            type="text"
                            value={guide.tag}
                            onChange={(e) =>
                              handleUpdateGuide(idx, "tag", e.target.value)
                            }
                            className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={2}
                          value={guide.description}
                          onChange={(e) =>
                            handleUpdateGuide(idx, "description", e.target.value)
                          }
                          className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: API Access */}
          {activeTab === "apiAccess" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                API Access & Enterprise Endpoints Configuration
              </h2>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Section Title
                </label>
                <input
                  type="text"
                  value={config.apiAccess.sectionTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      apiAccess: {
                        ...config.apiAccess,
                        sectionTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={config.apiAccess.description}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      apiAccess: {
                        ...config.apiAccess,
                        description: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Base API URL
                  </label>
                  <input
                    type="text"
                    value={config.apiAccess.baseUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        apiAccess: {
                          ...config.apiAccess,
                          baseUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Rate Limit Badge
                  </label>
                  <input
                    type="text"
                    value={config.apiAccess.rateLimit}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        apiAccess: {
                          ...config.apiAccess,
                          rateLimit: e.target.value,
                        },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Authorization Header Spec
                </label>
                <input
                  type="text"
                  value={config.apiAccess.authHeader}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      apiAccess: {
                        ...config.apiAccess,
                        authHeader: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>

              {/* Endpoints */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <span className="text-xs font-jetbrains text-white font-bold uppercase tracking-wider">
                  Featured API Endpoints
                </span>

                {/* Endpoint 1 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <span className="text-xs font-jetbrains text-teal-400 font-bold">
                    Endpoint 1
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                        Method
                      </label>
                      <input
                        type="text"
                        value={config.apiAccess.endpoint1Method}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            apiAccess: {
                              ...config.apiAccess,
                              endpoint1Method: e.target.value,
                            },
                          })
                        }
                        className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                        Path
                      </label>
                      <input
                        type="text"
                        value={config.apiAccess.endpoint1Path}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            apiAccess: {
                              ...config.apiAccess,
                              endpoint1Path: e.target.value,
                            },
                          })
                        }
                        className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={config.apiAccess.endpoint1Desc}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          apiAccess: {
                            ...config.apiAccess,
                            endpoint1Desc: e.target.value,
                          },
                        })
                      }
                      className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Endpoint 2 */}
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3">
                  <span className="text-xs font-jetbrains text-blue-400 font-bold">
                    Endpoint 2
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                        Method
                      </label>
                      <input
                        type="text"
                        value={config.apiAccess.endpoint2Method}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            apiAccess: {
                              ...config.apiAccess,
                              endpoint2Method: e.target.value,
                            },
                          })
                        }
                        className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                        Path
                      </label>
                      <input
                        type="text"
                        value={config.apiAccess.endpoint2Path}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            apiAccess: {
                              ...config.apiAccess,
                              endpoint2Path: e.target.value,
                            },
                          })
                        }
                        className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={config.apiAccess.endpoint2Desc}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          apiAccess: {
                            ...config.apiAccess,
                            endpoint2Desc: e.target.value,
                          },
                        })
                      }
                      className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Action */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-8 py-3.5 text-xs font-jetbrains font-bold rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>SAVING CHANGES…</span>
                </>
              ) : (
                <span>SAVE DOCUMENTATION CHANGES</span>
              )}
            </button>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
