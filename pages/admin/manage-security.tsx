import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { SecurityConfig } from "@/types/security";
import {
  getSecurityConfig,
  updateSecurityConfig,
  resetSecurityConfigToDefault,
  DEFAULT_SECURITY_CONFIG,
} from "@/lib/services/securityService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type SecurityTab = "header" | "encryption" | "infrastructure" | "accessControl";

export default function ManageSecurityPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<SecurityTab>("header");
  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
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
      if (!ok) router.replace("/login?redirect=/admin/manage-security");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getSecurityConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to load security config",
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
      await updateSecurityConfig(config);
      setMessage({
        text: "Security Protocol configuration saved successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err?.message || "Failed to save security config",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to reset Security Protocol to standard defaults? All custom text will be replaced."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await resetSecurityConfigToDefault();
      setConfig(DEFAULT_SECURITY_CONFIG);
      setMessage({
        text: "Security Protocol reset to defaults successfully!",
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

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Security Protocol CMS | Admin</title>
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
          <title>Security Protocol CMS | Admin</title>
        </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <div className="flex flex-col items-center justify-center">
            <HelixLoader size={56} color="#38f2ff" />
            <p className="mt-4 text-[#849495] font-mono">
              Loading Security Protocol CMS…
            </p>
          </div>
        </main>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Security Protocol | DevEngine Admin</title>
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
                href="/security-protocol"
                target="_blank"
                className="text-xs font-mono text-gray-400 hover:text-white flex items-center gap-1"
              >
                View Public Security Page ↗
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2 flex items-center gap-3">
              Security Protocol CMS
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

        {/* Message */}
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

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-white/10 pb-4">
          {[
            { id: "header", label: "Hero & Verified Badge" },
            { id: "encryption", label: "Encryption & Bento Nodes" },
            { id: "infrastructure", label: "Infrastructure Security" },
            { id: "accessControl", label: "Zero-Trust Access Control" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SecurityTab)}
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
              Hero Section Configuration
            </h2>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Status Badge Text
              </label>
              <input
                type="text"
                value={config.header.statusBadge}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    header: { ...config.header, statusBadge: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Headline Title
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

        {/* Tab 2: Encryption */}
        {activeTab === "encryption" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              Data Encryption & Bento Nodes
            </h2>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={config.encryption.title}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    encryption: { ...config.encryption, title: e.target.value },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Detailed Description
              </label>
              <textarea
                rows={4}
                value={config.encryption.description}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    encryption: {
                      ...config.encryption,
                      description: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Bullet 1
                </label>
                <input
                  type="text"
                  value={config.encryption.bullet1}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      encryption: {
                        ...config.encryption,
                        bullet1: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Bullet 2
                </label>
                <input
                  type="text"
                  value={config.encryption.bullet2}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      encryption: {
                        ...config.encryption,
                        bullet2: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Bullet 3
                </label>
                <input
                  type="text"
                  value={config.encryption.bullet3}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      encryption: {
                        ...config.encryption,
                        bullet3: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>

            {/* Bento Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {/* Node 1 */}
              <div className="p-4 rounded-xl bg-[#161c28] border border-white/5 space-y-3">
                <span className="text-xs font-mono text-[#38f2ff] font-bold">
                  Node 1 (Client Node)
                </span>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node1Title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node1Title: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node1Desc}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node1Desc: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Badge
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node1Badge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node1Badge: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Node 2 */}
              <div className="p-4 rounded-xl bg-[#161c28] border border-white/5 space-y-3">
                <span className="text-xs font-mono text-[#c4c0ff] font-bold">
                  Node 2 (Storage Node)
                </span>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node2Title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node2Title: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node2Desc}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node2Desc: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Badge
                  </label>
                  <input
                    type="text"
                    value={config.encryption.node2Badge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        encryption: {
                          ...config.encryption,
                          node2Badge: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Diagram Card */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <span className="text-xs font-mono text-white font-bold">
                Spanning Flow Card
              </span>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  value={config.encryption.diagramTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      encryption: {
                        ...config.encryption,
                        diagramTitle: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded p-3 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Card Description
                </label>
                <textarea
                  rows={2}
                  value={config.encryption.diagramDesc}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      encryption: {
                        ...config.encryption,
                        diagramDesc: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded p-3 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Infrastructure */}
        {activeTab === "infrastructure" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              Infrastructure Security Configuration
            </h2>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={config.infrastructure.title}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    infrastructure: {
                      ...config.infrastructure,
                      title: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Description
              </label>
              <textarea
                rows={3}
                value={config.infrastructure.description}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    infrastructure: {
                      ...config.infrastructure,
                      description: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* Clusters */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <span className="text-xs font-mono text-white font-bold">
                Regional Hubs & Compliance
              </span>

              {/* Cluster 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#161c28] border border-white/5">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 1 Region
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster1Region}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster1Region: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 1 Badge
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster1Badge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster1Badge: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cluster 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#161c28] border border-white/5">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 2 Region
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster2Region}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster2Region: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 2 Badge
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster2Badge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster2Badge: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Cluster 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-[#161c28] border border-white/5">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 3 Region
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster3Region}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster3Region: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Cluster 3 Badge
                  </label>
                  <input
                    type="text"
                    value={config.infrastructure.cluster3Badge}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        infrastructure: {
                          ...config.infrastructure,
                          cluster3Badge: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Access Control */}
        {activeTab === "accessControl" && (
          <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-6">
            <h2 className="text-lg font-bold text-[#38f2ff] font-mono">
              Zero-Trust Access Control Configuration
            </h2>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Title
              </label>
              <input
                type="text"
                value={config.accessControl.title}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    accessControl: {
                      ...config.accessControl,
                      title: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Section Description
              </label>
              <textarea
                rows={3}
                value={config.accessControl.description}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    accessControl: {
                      ...config.accessControl,
                      description: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
              {/* Method 1 */}
              <div className="p-4 rounded-xl bg-[#161c28] border border-white/5 space-y-3">
                <span className="text-xs font-mono text-[#38f2ff] font-bold">
                  Method 1 (Hardware Security Keys)
                </span>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.accessControl.method1Title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        accessControl: {
                          ...config.accessControl,
                          method1Title: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={config.accessControl.method1Desc}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        accessControl: {
                          ...config.accessControl,
                          method1Desc: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* Method 2 */}
              <div className="p-4 rounded-xl bg-[#161c28] border border-white/5 space-y-3">
                <span className="text-xs font-mono text-[#c4c0ff] font-bold">
                  Method 2 (Biometric Verification)
                </span>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.accessControl.method2Title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        accessControl: {
                          ...config.accessControl,
                          method2Title: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={config.accessControl.method2Desc}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        accessControl: {
                          ...config.accessControl,
                          method2Desc: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#0e131f] border border-white/10 rounded p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
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
            className="px-8 py-3 text-sm font-mono font-bold rounded-lg bg-[#38f2ff] hover:bg-[#00dbe8] text-black shadow-lg shadow-[#38f2ff]/20 transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Saving Changes...
              </>
            ) : (
              "Save Security Protocol Changes"
            )}
          </button>
        </div>
      </main>
    </AdminLayout>
  );
}
