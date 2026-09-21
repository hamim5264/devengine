import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  LandingConfig,
  HeroConfig,
  IntroConfig,
  TechStackConfig,
  MobileConfig,
  WebPlatformConfig,
  AILabConfig,
  DefenseConfig,
  CustomSolutionsConfig,
  FeaturedProductsConfig,
  ProcessConfig,
  TestimonialsConfig,
  ContactConfig,
} from "@/types/landing";
import {
  getLandingConfig,
  updateLandingSection,
  uploadLandingImage,
  seedDefaultLandingConfig,
  DEFAULT_LANDING_CONFIG,
} from "@/lib/services/landingService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type SectionTab =
  | "hero"
  | "intro"
  | "techStack"
  | "mobile"
  | "webPlatform"
  | "aiLab"
  | "defense"
  | "customSolutions"
  | "featuredProducts"
  | "process"
  | "testimonials"
  | "contact";

export default function ManageLandingPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<SectionTab>("hero");
  const [config, setConfig] = useState<LandingConfig>(DEFAULT_LANDING_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Admin gate check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-landing");
    });
    return () => unsub();
  }, [router]);

  // Load configuration
  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getLandingConfig();
      setConfig(data);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load landing config", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Save current section
  const handleSaveSection = async (sectionKey: SectionTab) => {
    try {
      setSaving(true);
      setMessage(null);
      await updateLandingSection(sectionKey, config[sectionKey]);
      setMessage({ text: `Section "${sectionKey}" saved successfully!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save section", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Handle image upload
  const handleImageFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onUrlReady: (url: string) => void,
    fieldId: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(fieldId);
      const url = await uploadLandingImage(file, "landing");
      onUrlReady(url);
      setMessage({ text: "Image uploaded and applied successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Image upload failed", type: "error" });
    } finally {
      setUploadingImage(null);
    }
  };

  // Seed default configuration
  const handleSeedDefaults = async () => {
    if (
      !confirm(
        "Do you want to reset all landing sections to the default cinematic design? (This will overwrite changes)"
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await seedDefaultLandingConfig();
      await loadData();
      setMessage({ text: "Default reference content seeded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Seed failed", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <HelixLoader size={50} color="#3EF3FF" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <Head>
        <title>Manage Dashboard Landing Page - DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#02040A] text-[#dde2f3] flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-jetbrains text-xs">
                <Link
                  href="/admin/dashboard"
                  className="text-[#3EF3FF] hover:underline flex items-center gap-1"
                >
                  ← Back to Dashboard
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">Landing CMS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Dashboard Landing CMS
              </h1>
              <p className="text-sm text-[#849495] mt-1">
                Edit headlines, descriptions, statistics, and upload mockup images for all landing sections.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSeedDefaults}
                className="px-4 py-2 text-xs font-jetbrains rounded-lg border border-[#3EF3FF]/30 text-[#3EF3FF] hover:bg-[#3EF3FF]/10 transition-colors"
              >
                Reset / Seed Defaults
              </button>
              <Link
                href="/home"
                target="_blank"
                className="px-5 py-2.5 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-[#3EF3FF]/30 hover:scale-105 transition-all"
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
                  ? "bg-[#3EF3FF]/10 border-[#3EF3FF]/40 text-[#3EF3FF]"
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
              { id: "hero", label: "1. Hero (3D Frames)" },
              { id: "intro", label: "2. Intro" },
              { id: "techStack", label: "3. Tech Stack" },
              { id: "mobile", label: "4. Native Mobile" },
              { id: "webPlatform", label: "5. Enterprise Web" },
              { id: "aiLab", label: "6. AI Lab" },
              { id: "defense", label: "7. Defense" },
              { id: "customSolutions", label: "8. Custom Solutions" },
              { id: "featuredProducts", label: "9. Products" },
              { id: "process", label: "10. Process Steps" },
              { id: "testimonials", label: "11. Testimonials" },
              { id: "contact", label: "12. Contact" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SectionTab)}
                className={`px-4 py-2 rounded-lg font-jetbrains text-xs whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? "bg-[#3EF3FF] text-[#02040A] font-bold shadow-[0_0_15px_rgba(62,243,255,0.4)]"
                    : "bg-[#0A0F1D] text-[#849495] hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="rounded-2xl bg-[#0A0F1D]/80 border border-white/10 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* 1. HERO SECTION EDITOR */}
            {activeTab === "hero" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Hero Section Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("hero")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Hero Section"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={config.hero.badgeText}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, badgeText: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title Prefix
                    </label>
                    <input
                      type="text"
                      value={config.hero.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Title Gradient Highlight
                  </label>
                  <input
                    type="text"
                    value={config.hero.titleHighlight}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: { ...config.hero, titleHighlight: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Subtitle Description
                  </label>
                  <textarea
                    rows={3}
                    value={config.hero.subtitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        hero: { ...config.hero, subtitle: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#849495] uppercase mb-1">
                      Stat 1 Value
                    </label>
                    <input
                      type="text"
                      value={config.hero.stat1Value}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, stat1Value: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-jetbrains text-[#849495] uppercase mb-1">
                      Stat 1 Label
                    </label>
                    <input
                      type="text"
                      value={config.hero.stat1Label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, stat1Label: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-jetbrains text-[#849495] uppercase mb-1">
                      Stat 2 Value
                    </label>
                    <input
                      type="text"
                      value={config.hero.stat2Value}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, stat2Value: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-jetbrains text-[#849495] uppercase mb-1">
                      Stat 2 Label
                    </label>
                    <input
                      type="text"
                      value={config.hero.stat2Label}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, stat2Label: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                {/* 3D Device Frames Image Uploaders */}
                <div className="border-t border-white/10 pt-6 space-y-6">
                  <h3 className="font-space-grotesk text-lg font-bold text-white">
                    3D Perspective Device Mockup Images
                  </h3>

                  {/* Desktop Mockup Frame Image */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                        1. Desktop Mockup Frame Image
                      </span>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                        {uploadingImage === "hero_desktop" ? "Uploading..." : "Upload Local File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileChange(
                              e,
                              (url) =>
                                setConfig({
                                  ...config,
                                  hero: { ...config.hero, desktopImageUrl: url },
                                }),
                              "hero_desktop"
                            )
                          }
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.hero.desktopImageUrl}
                      placeholder="Image URL or upload a file above"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, desktopImageUrl: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                    />
                    {config.hero.desktopImageUrl && (
                      <div className="w-48 h-28 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img
                          src={config.hero.desktopImageUrl}
                          alt="Desktop preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Tablet Mockup Frame Image */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                        2. Tablet Mockup Frame Image
                      </span>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                        {uploadingImage === "hero_tablet" ? "Uploading..." : "Upload Local File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileChange(
                              e,
                              (url) =>
                                setConfig({
                                  ...config,
                                  hero: { ...config.hero, tabletImageUrl: url },
                                }),
                              "hero_tablet"
                            )
                          }
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.hero.tabletImageUrl}
                      placeholder="Image URL or upload a file above"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, tabletImageUrl: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                    />
                    {config.hero.tabletImageUrl && (
                      <div className="w-36 h-28 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img
                          src={config.hero.tabletImageUrl}
                          alt="Tablet preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Mobile Mockup Frame Image */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                        3. Mobile Mockup Frame Image
                      </span>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                        {uploadingImage === "hero_mobile" ? "Uploading..." : "Upload Local File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileChange(
                              e,
                              (url) =>
                                setConfig({
                                  ...config,
                                  hero: { ...config.hero, mobileImageUrl: url },
                                }),
                              "hero_mobile"
                            )
                          }
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.hero.mobileImageUrl}
                      placeholder="Image URL or upload a file above"
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          hero: { ...config.hero, mobileImageUrl: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                    />
                    {config.hero.mobileImageUrl && (
                      <div className="w-20 h-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img
                          src={config.hero.mobileImageUrl}
                          alt="Mobile preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 2. INTRO SECTION */}
            {activeTab === "intro" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Intro Headline Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("intro")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Intro"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Heading Prefix
                  </label>
                  <input
                    type="text"
                    value={config.intro.headingPrefix}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        intro: { ...config.intro, headingPrefix: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Heading Highlight
                  </label>
                  <input
                    type="text"
                    value={config.intro.headingHighlight}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        intro: { ...config.intro, headingHighlight: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 3. TECH STACK */}
            {activeTab === "techStack" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Tech Stack Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("techStack")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Tech Stack"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.techStack.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          techStack: { ...config.techStack, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.techStack.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          techStack: { ...config.techStack, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Technologies (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={config.techStack.techList.join(", ")}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        techStack: {
                          ...config.techStack,
                          techList: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                  />
                </div>
              </div>
            )}

            {/* 4. NATIVE MOBILE */}
            {activeTab === "mobile" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Native Mobile Section
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("mobile")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Mobile Section"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.mobile.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mobile: { ...config.mobile, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.mobile.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mobile: { ...config.mobile, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={config.mobile.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        mobile: { ...config.mobile, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                {/* Mobile Mockup Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                        Phone 1 Image (Front)
                      </span>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                        {uploadingImage === "phone_1" ? "Uploading..." : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileChange(
                              e,
                              (url) =>
                                setConfig({
                                  ...config,
                                  mobile: { ...config.mobile, phone1ImageUrl: url },
                                }),
                              "phone_1"
                            )
                          }
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.mobile.phone1ImageUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mobile: { ...config.mobile, phone1ImageUrl: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                    />
                    {config.mobile.phone1ImageUrl && (
                      <div className="w-20 h-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img
                          src={config.mobile.phone1ImageUrl}
                          alt="Phone 1 preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                        Phone 2 Image (Back)
                      </span>
                      <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                        {uploadingImage === "phone_2" ? "Uploading..." : "Upload File"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handleImageFileChange(
                              e,
                              (url) =>
                                setConfig({
                                  ...config,
                                  mobile: { ...config.mobile, phone2ImageUrl: url },
                                }),
                              "phone_2"
                            )
                          }
                        />
                      </label>
                    </div>
                    <input
                      type="text"
                      value={config.mobile.phone2ImageUrl}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          mobile: { ...config.mobile, phone2ImageUrl: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                    />
                    {config.mobile.phone2ImageUrl && (
                      <div className="w-20 h-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                        <img
                          src={config.mobile.phone2ImageUrl}
                          alt="Phone 2 preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. ENTERPRISE WEB PLATFORM */}
            {activeTab === "webPlatform" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Enterprise Web Platform Section
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("webPlatform")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Web Platform"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.webPlatform.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          webPlatform: { ...config.webPlatform, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.webPlatform.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          webPlatform: { ...config.webPlatform, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Browser Frame URL Bar Text
                  </label>
                  <input
                    type="text"
                    value={config.webPlatform.browserUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        webPlatform: { ...config.webPlatform, browserUrl: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                  />
                </div>

                {/* Web Screen Image Uploader */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase font-bold">
                      Enterprise Dashboard Screen Image
                    </span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                      {uploadingImage === "web_screen" ? "Uploading..." : "Upload File"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageFileChange(
                            e,
                            (url) =>
                              setConfig({
                                ...config,
                                webPlatform: { ...config.webPlatform, screenImageUrl: url },
                              }),
                            "web_screen"
                          )
                        }
                      />
                    </label>
                  </div>
                  <input
                    type="text"
                    value={config.webPlatform.screenImageUrl}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        webPlatform: { ...config.webPlatform, screenImageUrl: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                  />
                  {config.webPlatform.screenImageUrl && (
                    <div className="w-56 h-32 rounded-lg overflow-hidden border border-white/10 bg-black">
                      <img
                        src={config.webPlatform.screenImageUrl}
                        alt="Screen preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. AI LAB */}
            {activeTab === "aiLab" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    AI Lab Section Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("aiLab")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save AI Lab"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.aiLab.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          aiLab: { ...config.aiLab, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.aiLab.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          aiLab: { ...config.aiLab, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={config.aiLab.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        aiLab: { ...config.aiLab, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 7. DEFENSE */}
            {activeTab === "defense" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Defense & Academic Precision
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("defense")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Defense"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={config.defense.title}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defense: { ...config.defense, title: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    value={config.defense.description}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        defense: { ...config.defense, description: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>
            )}

            {/* 8. CUSTOM SOLUTIONS */}
            {activeTab === "customSolutions" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Custom Solutions Bento Grid
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("customSolutions")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Custom Solutions"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.customSolutions.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customSolutions: { ...config.customSolutions, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.customSolutions.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          customSolutions: { ...config.customSolutions, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Cards Editors */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    Bento Grid Cards
                  </h3>

                  {config.customSolutions.cards.map((card, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="font-jetbrains text-xs text-[#3EF3FF] font-bold">
                        Card #{idx + 1} {card.isLarge ? "(Large 2x2)" : "(1x1)"}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Card Title"
                          value={card.title}
                          onChange={(e) => {
                            const updated = [...config.customSolutions.cards];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setConfig({
                              ...config,
                              customSolutions: { ...config.customSolutions, cards: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Material Symbol Icon (e.g. cloud_sync, insights)"
                          value={card.icon}
                          onChange={(e) => {
                            const updated = [...config.customSolutions.cards];
                            updated[idx] = { ...updated[idx], icon: e.target.value };
                            setConfig({
                              ...config,
                              customSolutions: { ...config.customSolutions, cards: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Description"
                        value={card.description}
                        onChange={(e) => {
                          const updated = [...config.customSolutions.cards];
                          updated[idx] = { ...updated[idx], description: e.target.value };
                          setConfig({
                            ...config,
                            customSolutions: { ...config.customSolutions, cards: updated },
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                      />
                      {card.isLarge && (
                        <div>
                          <label className="block text-[11px] font-jetbrains text-gray-400 mb-1">
                            Background Image URL
                          </label>
                          <input
                            type="text"
                            value={card.imageUrl || ""}
                            onChange={(e) => {
                              const updated = [...config.customSolutions.cards];
                              updated[idx] = { ...updated[idx], imageUrl: e.target.value };
                              setConfig({
                                ...config,
                                customSolutions: { ...config.customSolutions, cards: updated },
                              });
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9. FEATURED PRODUCTS */}
            {activeTab === "featuredProducts" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Featured Products Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("featuredProducts")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Products"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.featuredProducts.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          featuredProducts: { ...config.featuredProducts, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.featuredProducts.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          featuredProducts: { ...config.featuredProducts, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Product Items */}
                <div className="space-y-6 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    Product Showcases
                  </h3>

                  {config.featuredProducts.products.map((prod, pIdx) => (
                    <div key={pIdx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-jetbrains text-xs text-[#3EF3FF] font-bold">
                          Product #{pIdx + 1}
                        </span>
                        <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-jetbrains text-white transition-colors">
                          {uploadingImage === `prod_${pIdx}` ? "Uploading..." : "Upload Cover Image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleImageFileChange(
                                e,
                                (url) => {
                                  const updated = [...config.featuredProducts.products];
                                  updated[pIdx] = { ...updated[pIdx], imageUrl: url };
                                  setConfig({
                                    ...config,
                                    featuredProducts: { ...config.featuredProducts, products: updated },
                                  });
                                },
                                `prod_${pIdx}`
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Product Name (e.g. Nexus ERP)"
                          value={prod.title}
                          onChange={(e) => {
                            const updated = [...config.featuredProducts.products];
                            updated[pIdx] = { ...updated[pIdx], title: e.target.value };
                            setConfig({
                              ...config,
                              featuredProducts: { ...config.featuredProducts, products: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Badge Tag (e.g. ENTERPRISE, AI PLATFORM)"
                          value={prod.tag || ""}
                          onChange={(e) => {
                            const updated = [...config.featuredProducts.products];
                            updated[pIdx] = { ...updated[pIdx], tag: e.target.value };
                            setConfig({
                              ...config,
                              featuredProducts: { ...config.featuredProducts, products: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm font-jetbrains"
                        />
                      </div>

                      <textarea
                        rows={2}
                        placeholder="Description"
                        value={prod.description}
                        onChange={(e) => {
                          const updated = [...config.featuredProducts.products];
                          updated[pIdx] = { ...updated[pIdx], description: e.target.value };
                          setConfig({
                            ...config,
                            featuredProducts: { ...config.featuredProducts, products: updated },
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                      />

                      <input
                        type="text"
                        placeholder="Image URL"
                        value={prod.imageUrl}
                        onChange={(e) => {
                          const updated = [...config.featuredProducts.products];
                          updated[pIdx] = { ...updated[pIdx], imageUrl: e.target.value };
                          setConfig({
                            ...config,
                            featuredProducts: { ...config.featuredProducts, products: updated },
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                      />

                      {prod.imageUrl && (
                        <div className="w-36 h-24 rounded-lg overflow-hidden border border-white/10 bg-black">
                          <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. PROCESS STEPS */}
            {activeTab === "process" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Development Process Stages
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("process")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Process"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.process.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          process: { ...config.process, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.process.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          process: { ...config.process, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Stages List */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    5 Execution Stages
                  </h3>

                  {config.process.stages.map((stage, sIdx) => (
                    <div key={sIdx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="flex gap-4">
                        <input
                          type="text"
                          value={stage.stageNumber}
                          placeholder="STAGE 01"
                          onChange={(e) => {
                            const updated = [...config.process.stages];
                            updated[sIdx] = { ...updated[sIdx], stageNumber: e.target.value };
                            setConfig({ ...config, process: { ...config.process, stages: updated } });
                          }}
                          className="w-32 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[#3EF3FF] font-jetbrains text-xs"
                        />
                        <input
                          type="text"
                          value={stage.title}
                          placeholder="Stage Title"
                          onChange={(e) => {
                            const updated = [...config.process.stages];
                            updated[sIdx] = { ...updated[sIdx], title: e.target.value };
                            setConfig({ ...config, process: { ...config.process, stages: updated } });
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={stage.description}
                        placeholder="Description"
                        onChange={(e) => {
                          const updated = [...config.process.stages];
                          updated[sIdx] = { ...updated[sIdx], description: e.target.value };
                          setConfig({ ...config, process: { ...config.process, stages: updated } });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 11. TESTIMONIALS */}
            {activeTab === "testimonials" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Testimonials Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("testimonials")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Testimonials"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.testimonials.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          testimonials: { ...config.testimonials, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.testimonials.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          testimonials: { ...config.testimonials, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <h3 className="font-space-grotesk text-base font-bold text-white">
                    Client Reviews
                  </h3>

                  {config.testimonials.testimonials.map((t, tIdx) => (
                    <div key={tIdx} className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          placeholder="Client Name"
                          value={t.name}
                          onChange={(e) => {
                            const updated = [...config.testimonials.testimonials];
                            updated[tIdx] = { ...updated[tIdx], name: e.target.value };
                            setConfig({
                              ...config,
                              testimonials: { ...config.testimonials, testimonials: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Role / Company"
                          value={t.role}
                          onChange={(e) => {
                            const updated = [...config.testimonials.testimonials];
                            updated[tIdx] = { ...updated[tIdx], role: e.target.value };
                            setConfig({
                              ...config,
                              testimonials: { ...config.testimonials, testimonials: updated },
                            });
                          }}
                          className="px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Quote"
                        value={t.quote}
                        onChange={(e) => {
                          const updated = [...config.testimonials.testimonials];
                          updated[tIdx] = { ...updated[tIdx], quote: e.target.value };
                          setConfig({
                            ...config,
                            testimonials: { ...config.testimonials, testimonials: updated },
                          });
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs italic"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 12. CONTACT */}
            {activeTab === "contact" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="font-space-grotesk text-xl font-bold text-white">
                    Contact Sequence Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => handleSaveSection("contact")}
                    disabled={saving}
                    className="px-6 py-2 bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Contact"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Tag
                    </label>
                    <input
                      type="text"
                      value={config.contact.tag}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contact: { ...config.contact, tag: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={config.contact.title}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          contact: { ...config.contact, title: e.target.value },
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#3EF3FF] uppercase mb-1">
                    Subtitle Description
                  </label>
                  <textarea
                    rows={3}
                    value={config.contact.subtitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        contact: { ...config.contact, subtitle: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-white/10 text-white text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </main>      </div>
    </AdminLayout>
  );
}
