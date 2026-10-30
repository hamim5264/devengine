import { onAdminPageAccess } from "@/lib/services/staffAuth";
﻿import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  LandingConfig,
  HeroConfig,
  HeroShowcaseImage,
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
  DEFAULT_HERO_SHOWCASE_IMAGES,
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
    const unsub = onAdminPageAccess(router, async (user) => {
      setIsAdmin(true);
      setAuthReady(true);
    }, () => {
      setIsAdmin(false);
      setAuthReady(false);
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

  // Orbit Showcase Images Handlers
  const handleAddOrbitImage = () => {
    const currentImages = config.hero.showcaseImages || [];
    const newImage: HeroShowcaseImage = {
      id: `showcase_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      imageUrl: "",
      title: `Showcase #${currentImages.length + 1}`,
      link: "#products",
      isTall: false,
    };
    setConfig({
      ...config,
      hero: {
        ...config.hero,
        showcaseImages: [...currentImages, newImage],
      },
    });
  };

  const handleUpdateOrbitImage = (idx: number, patch: Partial<HeroShowcaseImage>) => {
    const current = [...(config.hero.showcaseImages || [])];
    if (!current[idx]) return;
    current[idx] = { ...current[idx], ...patch };
    setConfig({
      ...config,
      hero: {
        ...config.hero,
        showcaseImages: current,
      },
    });
  };

  const handleRemoveOrbitImage = (idx: number) => {
    const current = [...(config.hero.showcaseImages || [])];
    current.splice(idx, 1);
    setConfig({
      ...config,
      hero: {
        ...config.hero,
        showcaseImages: current,
      },
    });
  };

  const handleMoveOrbitImage = (idx: number, direction: "up" | "down") => {
    const current = [...(config.hero.showcaseImages || [])];
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const temp = current[idx];
    current[idx] = current[targetIdx];
    current[targetIdx] = temp;
    setConfig({
      ...config,
      hero: {
        ...config.hero,
        showcaseImages: current,
      },
    });
  };

  const handleResetOrbitImages = () => {
    if (
      !confirm(
        "Reset all moving orbit images to the recommended default showcase set?"
      )
    ) {
      return;
    }
    setConfig({
      ...config,
      hero: {
        ...config.hero,
        showcaseImages: [...DEFAULT_HERO_SHOWCASE_IMAGES],
      },
    });
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
        <HelixLoader size={50} color="#2cecf7" />
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
                  className="text-[#2cecf7] hover:underline flex items-center gap-1"
                >
                  ← Back to Dashboard
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400">Landing CMS</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Dashboard Landing CMS
              </h1>
              <p className="text-sm text-[#849495] mt-1">Update landing content, images, and statistics.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSeedDefaults}
                className="px-4 py-2 text-xs font-jetbrains rounded-lg border border-[#2cecf7]/30 text-[#2cecf7] hover:bg-[#2cecf7]/10 transition-colors"
              >
                Reset / Seed Defaults
              </button>
              <Link
                href="/home"
                target="_blank"
                className="px-5 py-2.5 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg shadow-[#2cecf7]/30 hover:scale-105 transition-all"
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
                  ? "bg-[#2cecf7]/10 border-[#2cecf7]/40 text-[#2cecf7]"
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
              { id: "hero", label: "1. Hero & Orbit Images" },
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
                    ? "bg-[#2cecf7] text-[#02040A] font-bold shadow-[0_0_15px_rgba(62,243,255,0.4)]"
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Hero Section"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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

                {/* MOVING ORBIT SHOWCASE IMAGES (TOP HERO MOVING MOCKUPS) */}
                <div className="border-t border-white/10 pt-6 space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#2cecf7]/5 border border-[#2cecf7]/20 p-4 sm:p-5 rounded-2xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#2cecf7] text-xl">
                          motion_photos_on
                        </span>
                        <h3 className="font-space-grotesk text-lg font-bold text-white">
                          Moving Orbit Showcase Images
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-jetbrains font-bold uppercase tracking-wider bg-[#2cecf7] text-[#02040A]">
                          {(config.hero.showcaseImages || []).length} Active
                        </span>
                      </div>
                      <p className="text-xs text-[#849495] mt-1 max-w-2xl leading-relaxed">
                        These images dynamically float and orbit around the headline on the homepage hero section.
                        Add as many showcase mockups as you like, upload files, set titles and click URLs, toggle portrait orientation, and reorder.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleResetOrbitImages}
                        className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-xs font-jetbrains text-gray-300 hover:text-white transition-colors"
                      >
                        Reset Defaults
                      </button>
                      <button
                        type="button"
                        onClick={handleAddOrbitImage}
                        className="px-4 py-1.5 rounded-lg bg-[#2cecf7] text-[#02040A] text-xs font-jetbrains font-bold uppercase hover:brightness-110 shadow-[0_0_15px_rgba(44,236,247,0.3)] transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">add</span>
                        Add Orbit Image
                      </button>
                    </div>
                  </div>

                  {/* Orbit Images List */}
                  <div className="space-y-4">
                    {(!config.hero.showcaseImages || config.hero.showcaseImages.length === 0) ? (
                      <div className="p-8 rounded-xl border border-dashed border-white/10 text-center space-y-3">
                        <p className="text-sm text-gray-400">
                          No custom orbit images added yet. Click below to add your first image or restore defaults.
                        </p>
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={handleAddOrbitImage}
                            className="px-4 py-2 bg-[#2cecf7] text-[#02040A] rounded-lg text-xs font-jetbrains font-bold"
                          >
                            + Add First Orbit Image
                          </button>
                          <button
                            type="button"
                            onClick={handleResetOrbitImages}
                            className="px-4 py-2 border border-white/20 text-white rounded-lg text-xs font-jetbrains"
                          >
                            Load Recommended Defaults
                          </button>
                        </div>
                      </div>
                    ) : (
                      config.hero.showcaseImages.map((item, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === (config.hero.showcaseImages?.length || 0) - 1;
                        const uploadKey = `hero_orbit_${item.id || idx}`;

                        return (
                          <div
                            key={item.id || idx}
                            className="p-4 sm:p-5 rounded-xl bg-black/50 border border-white/10 hover:border-[#2cecf7]/30 transition-all space-y-4 shadow-lg"
                          >
                            {/* Card Header */}
                            <div className="flex flex-wrap justify-between items-center gap-2 pb-3 border-b border-white/5">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-[#2cecf7]/10 text-[#2cecf7] text-xs font-jetbrains font-bold flex items-center justify-center border border-[#2cecf7]/30">
                                  {idx + 1}
                                </span>
                                <span className="font-jetbrains text-xs text-white font-bold">
                                  {item.title || `Orbit Card #${idx + 1}`}
                                </span>
                                {item.isTall && (
                                  <span className="text-[10px] font-jetbrains px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Portrait / Mobile
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons: Move Up, Move Down, Delete */}
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  title="Move Up"
                                  disabled={isFirst}
                                  onClick={() => handleMoveOrbitImage(idx, "up")}
                                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors"
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  title="Move Down"
                                  disabled={isLast}
                                  onClick={() => handleMoveOrbitImage(idx, "down")}
                                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 text-xs text-gray-300 hover:text-white transition-colors"
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  title="Remove Orbit Image"
                                  onClick={() => handleRemoveOrbitImage(idx)}
                                  className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 text-xs font-jetbrains transition-colors flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-xs">delete</span>
                                  Remove
                                </button>
                              </div>
                            </div>

                            {/* Card Body: Left thumbnail preview, Right form fields */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                              {/* Preview Thumbnail */}
                              <div className="md:col-span-4 flex flex-col items-center gap-2">
                                <div
                                  className={`w-full ${
                                    item.isTall ? "max-w-[150px] aspect-[9/16]" : "aspect-[16/10]"
                                  } rounded-lg overflow-hidden border border-white/10 bg-black/80 flex items-center justify-center relative group`}
                                >
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.title || "Showcase preview"}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex flex-col items-center justify-center text-gray-500 text-xs p-3 text-center">
                                      <span className="material-symbols-outlined text-2xl text-gray-600 mb-1">
                                        image
                                      </span>
                                      <span>No image specified</span>
                                    </div>
                                  )}
                                </div>

                                {/* Upload Local File Button */}
                                <label className="cursor-pointer w-full py-1.5 px-3 rounded-lg bg-white/10 hover:bg-[#2cecf7]/20 hover:text-[#2cecf7] text-xs font-jetbrains text-gray-300 transition-colors flex items-center justify-center gap-1.5 border border-white/10">
                                  <span className="material-symbols-outlined text-sm">
                                    {uploadingImage === uploadKey ? "hourglass_top" : "upload"}
                                  </span>
                                  <span>
                                    {uploadingImage === uploadKey ? "Uploading..." : "Upload File"}
                                  </span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) =>
                                      handleImageFileChange(
                                        e,
                                        (url) => handleUpdateOrbitImage(idx, { imageUrl: url }),
                                        uploadKey
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              {/* Form Inputs */}
                              <div className="md:col-span-8 space-y-3">
                                <div>
                                  <label className="block text-[11px] font-jetbrains text-[#2cecf7] uppercase mb-1">
                                    Image URL
                                  </label>
                                  <input
                                    type="text"
                                    value={item.imageUrl}
                                    placeholder="https://... or upload local file"
                                    onChange={(e) =>
                                      handleUpdateOrbitImage(idx, { imageUrl: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                                  />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[11px] font-jetbrains text-gray-400 uppercase mb-1">
                                      Title / Label (Shown on Hover)
                                    </label>
                                    <input
                                      type="text"
                                      value={item.title}
                                      placeholder="e.g. Web Analytics, FinTech App"
                                      onChange={(e) =>
                                        handleUpdateOrbitImage(idx, { title: e.target.value })
                                      }
                                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-jetbrains text-gray-400 uppercase mb-1">
                                      Click Link (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      value={item.link || ""}
                                      placeholder="e.g. #products, #contact, /services"
                                      onChange={(e) =>
                                        handleUpdateOrbitImage(idx, { link: e.target.value })
                                      }
                                      className="w-full px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-white text-xs font-jetbrains"
                                    />
                                  </div>
                                </div>

                                {/* Portrait Toggle */}
                                <div className="pt-1">
                                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={!!item.isTall}
                                      onChange={(e) =>
                                        handleUpdateOrbitImage(idx, { isTall: e.target.checked })
                                      }
                                      className="w-4 h-4 rounded bg-black/60 border-white/20 text-[#2cecf7] focus:ring-[#2cecf7] cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-300 font-jetbrains">
                                      Portrait / Mobile Format (Renders narrower vertical phone card)
                                    </span>
                                  </label>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Add Button at bottom of list */}
                  {config.hero.showcaseImages && config.hero.showcaseImages.length > 0 && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={handleAddOrbitImage}
                        className="px-5 py-2 rounded-lg border border-[#2cecf7]/30 text-[#2cecf7] hover:bg-[#2cecf7]/10 text-xs font-jetbrains font-bold uppercase transition-all flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">add</span>
                        + Add Another Orbit Image
                      </button>
                    </div>
                  )}
                </div>

                {/* Legacy 3D Device Frames Image Uploaders */}
                <div className="border-t border-white/10 pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-space-grotesk text-lg font-bold text-white">
                        Fallback 3D Perspective Device Mockup Images
                      </h3>
                      <p className="text-xs text-[#849495] mt-0.5">
                        Optional background frames used as fallback when orbit images are not configured.
                      </p>
                    </div>
                  </div>

                  {/* Desktop Mockup Frame Image */}
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                      <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                      <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                      <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Intro"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Tech Stack"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Mobile Section"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                      <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                      <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Web Platform"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <span className="font-jetbrains text-xs text-[#2cecf7] uppercase font-bold">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save AI Lab"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Defense"}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Custom Solutions"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                      <div className="font-jetbrains text-xs text-[#2cecf7] font-bold">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Products"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                        <span className="font-jetbrains text-xs text-[#2cecf7] font-bold">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Process"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                          className="w-32 px-3 py-2 rounded-lg bg-black/60 border border-white/10 text-[#2cecf7] font-jetbrains text-xs"
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Testimonials"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    className="px-6 py-2 bg-[#2cecf7] text-[#02040A] font-jetbrains text-xs font-bold uppercase rounded-lg shadow hover:scale-105 transition-all disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Contact"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                    <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
                  <label className="block text-xs font-jetbrains text-[#2cecf7] uppercase mb-1">
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
