import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  LaunchpadConfig,
  LaunchpadFeaturedSlide,
  AppLabItem,
} from "@/types/launchpad";
import {
  getLaunchpadConfig,
  updateLaunchpadConfig,
  resetLaunchpadConfigToDefault,
  uploadLaunchpadImage,
  DEFAULT_LAUNCHPAD_CONFIG,
  getCleanAppThumbnail,
  uploadAppLabImage,
  updateAppLabApp,
  seedAppLabDummyImages,
  seedDefaultAppLabApps,
  DUMMY_APP_IMAGES,
} from "@/lib/services/launchpadService";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type LaunchpadTab = "overview" | "carousel" | "mobileApp" | "storeBanner" | "categories";

export default function ManageLaunchpadPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<LaunchpadTab>("overview");
  const [config, setConfig] = useState<LaunchpadConfig>(DEFAULT_LAUNCHPAD_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [appLabApps, setAppLabApps] = useState<AppLabItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [syncingDummyImages, setSyncingDummyImages] = useState(false);
  const [editingImageUrls, setEditingImageUrls] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchApps = async () => {
    try {
      setLoadingApps(true);
      const col = collection(db, "appLab");
      const snap = await getDocs(col);
      const list = snap.docs.map(
        (d) => ({ id: d.id, slug: d.id, ...d.data() } as AppLabItem)
      );
      setAppLabApps(list);
    } catch (err) {
      console.error("Failed to load appLab apps:", err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Admin auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-launchpad");
    });
    return () => unsub();
  }, [router]);

  // Load config & apps
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getLaunchpadConfig();
        setConfig(data);
        await fetchApps();
      } catch (err: any) {
        setMessage({
          text: err?.message || "Failed to load launchpad configuration",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [isAdmin]);

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateLaunchpadConfig(config);
      setMessage({
        text: "Launchpad configuration saved successfully!",
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to save configuration",
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
        "Are you sure you want to reset all Launchpad configurations to default? All custom text and images will revert."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await resetLaunchpadConfigToDefault();
      setConfig(DEFAULT_LAUNCHPAD_CONFIG);
      setMessage({
        text: "Launchpad configuration reset to defaults!",
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to reset configuration",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  // Image Upload Helper
  const handleStageImageUpload = async (
    field: "leftImage" | "centerImage" | "rightImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadLaunchpadImage(file, `stage_${field}`);
      setConfig((prev) => ({
        ...prev,
        overview: {
          ...prev.overview,
          stage: {
            ...prev.overview.stage,
            [field]: url,
          },
        },
      }));
      setMessage({ text: `${field} uploaded successfully!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Carousel Slide Handlers
  const handleAddSlide = () => {
    const newSlide: LaunchpadFeaturedSlide = {
      id: `slide-${Date.now()}`,
      title: "New Featured Project",
      subtitle: "Mobile application subtitle",
      description: "Detailed description of application highlights and capabilities.",
      version: "v1.0.0",
      status: "LIVE",
      phoneImage:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
      googlePlayUrl: "",
      googlePlayMessage: "Coming soon to Google Play.",
      appStoreUrl: "",
      appStoreMessage: "iOS build is currently in review.",
    };
    setConfig((prev) => ({
      ...prev,
      featuredSlides: [...prev.featuredSlides, newSlide],
    }));
  };

  const handleUpdateSlide = (
    index: number,
    field: keyof LaunchpadFeaturedSlide,
    val: string
  ) => {
    const slides = [...config.featuredSlides];
    slides[index] = { ...slides[index], [field]: val };
    setConfig((prev) => ({ ...prev, featuredSlides: slides }));
  };

  const handleDeleteSlide = (index: number) => {
    if (config.featuredSlides.length <= 1) {
      alert("At least one slide must remain in the carousel.");
      return;
    }
    const slides = config.featuredSlides.filter((_, i) => i !== index);
    setConfig((prev) => ({ ...prev, featuredSlides: slides }));
  };

  const handleSlideImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadLaunchpadImage(file, `slide_${index}`);
      handleUpdateSlide(index, "phoneImage", url);
      setMessage({ text: `Slide #${index + 1} mockup uploaded!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Mobile App Section Mockups Upload
  const handleMobileAppUpload = async (
    field: "mainPhoneImage" | "secondaryPhoneImage",
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadLaunchpadImage(file, `app_${field}`);
      setConfig((prev) => ({
        ...prev,
        mobileAppSection: {
          ...prev.mobileAppSection,
          [field]: url,
        },
      }));
      setMessage({ text: "Mockup uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Category handlers
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const current = config.categories || ["All", "AI", "Productivity", "Education", "Creative"];
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({ text: `Category "${trimmed}" already exists.`, type: "error" });
      return;
    }
    setConfig({
      ...config,
      categories: [...current, trimmed],
    });
    setNewCategoryInput("");
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (catToDelete === "All") return;
    const current = config.categories || ["All", "AI", "Productivity", "Education", "Creative"];
    setConfig({
      ...config,
      categories: current.filter((c) => c.toLowerCase() !== catToDelete.toLowerCase()),
    });
  };

  // App Lab Management Handlers
  const handleUploadAppImage = async (
    appId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const downloadUrl = await uploadAppLabImage(file, appId);
      await updateAppLabApp(appId, { images: [downloadUrl] });
      setAppLabApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, images: [downloadUrl] } : a))
      );
      setMessage({
        text: `Image uploaded and saved for app "${appId}"!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to upload app image",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveAppImageUrl = async (appId: string) => {
    const url = editingImageUrls[appId]?.trim();
    if (!url) return;
    try {
      await updateAppLabApp(appId, { images: [url] });
      setAppLabApps((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, images: [url] } : a))
      );
      setMessage({
        text: `Image URL saved for app "${appId}"!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to save image URL",
        type: "error",
      });
    }
  };

  const handleSetAppDummyImage = async (app: AppLabItem) => {
    const lookupKey = (app.slug || app.id || "").toLowerCase();
    const dummy =
      DUMMY_APP_IMAGES[lookupKey] ||
      DUMMY_APP_IMAGES[lookupKey.replace(/-pro$/, "")] ||
      DUMMY_APP_IMAGES.default;
    try {
      await updateAppLabApp(app.id, { images: [dummy] });
      setAppLabApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, images: [dummy] } : a))
      );
      setMessage({
        text: `Set curated dummy image for ${app.name}!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to set dummy image",
        type: "error",
      });
    }
  };

  const handleToggleAppPublic = async (app: AppLabItem) => {
    try {
      const nextPublic = !app.isPublic;
      await updateDoc(doc(db, "appLab", app.id), { isPublic: nextPublic });
      setAppLabApps((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, isPublic: nextPublic } : a))
      );
      setMessage({
        text: `${app.name} is now ${nextPublic ? "PUBLIC" : "UNPUBLISHED"}!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to update publish state",
        type: "error",
      });
    }
  };

  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Are you sure you want to delete "${appName}" from App Lab?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "appLab", appId));
      setAppLabApps((prev) => prev.filter((a) => a.id !== appId));
      setMessage({
        text: `Deleted "${appName}" successfully.`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to delete app",
        type: "error",
      });
    }
  };

  const handleSeedAllDummyImages = async () => {
    try {
      setSyncingDummyImages(true);
      const res = await seedAppLabDummyImages();
      await fetchApps();
      setMessage({
        text: `Successfully synced & repaired dummy images for ${res.updated} apps in Firebase!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to seed dummy images to Firebase",
        type: "error",
      });
    } finally {
      setSyncingDummyImages(false);
    }
  };

  const handleSeedDefaultApps = async () => {
    if (!confirm("Seed or restore the 4 default user-side applications (Dialogix AI, Blume, SnapCaption AI, QuizCrafter Pro) to Firestore?")) {
      return;
    }
    try {
      setLoadingApps(true);
      const count = await seedDefaultAppLabApps();
      await fetchApps();
      setMessage({
        text: `Successfully seeded ${count} default applications into Firestore appLab collection!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to seed default apps",
        type: "error",
      });
    } finally {
      setLoadingApps(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Launchpad CMS | Admin</title>
        </Head>
        <div className="min-h-screen bg-black flex justify-center items-center">
          <HelixLoader />
        </div>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Launchpad & App Lab | DevEngine Admin</title>
      </Head>
        <main className="py-8 px-4 sm:px-8 max-w-7xl mx-auto text-white">
        {/* Header and Actions Bar */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-2">
              <Link
                href="/admin/dashboard"
                className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-500 hover:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-500">CMS Engine</span>
              <span className="text-gray-600">/</span>
              <Link
                href="/launchpad"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Public Launchpad</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Launchpad & App Lab CMS</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Showroom
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Manage advertisement stage, Google Play & App Store carousel, notice alerts, and app collection.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSeedDefaultApps}
              disabled={loadingApps}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-teal-500/30 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
              title="Populate appLab collection with 4 user-side apps"
            >
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span>Seed Default Apps</span>
            </button>

            <Link
              href="/launchpad"
              target="_blank"
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Preview Live</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              onClick={handleReset}
              disabled={saving}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.03] hover:bg-rose-500/10 text-rose-300 hover:text-rose-200 border border-white/[0.08] hover:border-rose-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_28px_rgba(20,184,166,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Launchpad Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm flex items-center justify-between backdrop-blur-xl ${
              message.type === "success"
                ? "bg-teal-950/40 border-teal-500/40 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === "success" ? (
                <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium text-xs sm:text-sm">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white ml-4 text-xs font-bold p-1 rounded-lg hover:bg-white/[0.05] transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/40 border border-white/[0.08] rounded-2xl mb-8 backdrop-blur-xl shadow-inner">
          {[
            {
              id: "overview",
              label: "01. Overview & Ad Stage",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: "carousel",
              label: "02. Featured Carousel",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: "mobileApp",
              label: "03. DevEngine Mobile App",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: "storeBanner",
              label: "04. Store Banner",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              ),
            },
            {
              id: "categories",
              label: "05. App Lab & Categories",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as LaunchpadTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(20,184,166,0.35)]"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* =========================================================================
            TAB 1: OVERVIEW & ADVERTISE DEVICE STAGE
        ========================================================================= */}
        {activeTab === "overview" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Overview Header & 3D Advertisement Stage
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                Hero showcase headline and 3D device stage phone mockups
              </span>
            </div>

            {/* Header Text Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Top Badge Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. EARLY ACCESS / EXPERIMENTAL"
                  value={config.overview.badgeText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: { ...config.overview, badgeText: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Title Prefix
                </label>
                <input
                  type="text"
                  placeholder="e.g. DevEngine"
                  value={config.overview.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: { ...config.overview, title: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Title Highlight (Gradient)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Launchpad"
                  value={config.overview.titleHighlight}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      overview: { ...config.overview, titleHighlight: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-teal-300 font-bold placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Subtitle Description
              </label>
              <textarea
                rows={3}
                placeholder="Brief introduction displayed beneath the title headline..."
                value={config.overview.subtitle}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    overview: { ...config.overview, subtitle: e.target.value },
                  })
                }
                className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl p-4 text-sm text-white placeholder-gray-500 transition focus:outline-none resize-y"
              />
            </div>

            {/* 3D Device Stage Ad Cards */}
            <div className="border-t border-white/[0.06] pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Device Stage Showcase (3 Phone Frames)
                </h3>
                <span className="text-xs text-teal-400/90 font-medium">
                  Interactive 3D phone mockups in the hero stage
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Device */}
                <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold text-teal-300">
                      Left Phone Mockup
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Side Angle
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Upload Screenshot File
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleStageImageUpload("leftImage", e)}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 file:cursor-pointer transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Or Direct Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.overview.stage.leftImage}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, leftImage: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Caption Pill
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Analytics Suite"
                      value={config.overview.stage.leftCaption || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, leftCaption: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                </div>

                {/* Center Device */}
                <div className="p-6 rounded-2xl bg-teal-500/[0.03] border border-teal-500/30 space-y-4 shadow-[0_0_20px_rgba(20,184,166,0.08)]">
                  <div className="flex items-center justify-between pb-2 border-b border-teal-500/20">
                    <span className="text-xs font-bold text-teal-300">
                      Center Hero Phone Mockup
                    </span>
                    <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20 uppercase tracking-wider">
                      Centerpiece
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Upload Screenshot File
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleStageImageUpload("centerImage", e)}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 file:cursor-pointer transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Or Direct Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.overview.stage.centerImage}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, centerImage: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-teal-500/30 focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Caption Pill
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AI Core Assistant"
                      value={config.overview.stage.centerCaption || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, centerCaption: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-teal-500/30 focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right Device */}
                <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                    <span className="text-xs font-bold text-teal-300">
                      Right Phone Mockup
                    </span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Side Angle
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Upload Screenshot File
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleStageImageUpload("rightImage", e)}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 file:cursor-pointer transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Or Direct Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.overview.stage.rightImage}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, rightImage: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Caption Pill
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Cloud Sync Engine"
                      value={config.overview.stage.rightCaption || ""}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          overview: {
                            ...config.overview,
                            stage: { ...config.overview.stage, rightCaption: e.target.value },
                          },
                        })
                      }
                      className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-3 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: FEATURED CAROUSEL (GOOGLE PLAY & APP STORE LIVE APPS)
        ========================================================================= */}
        {activeTab === "carousel" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Featured Projects Carousel
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Manage live project slides with Google Play and App Store actions & fallback notice messages.
                </p>
              </div>

              <button
                onClick={handleAddSlide}
                className="px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-semibold text-xs transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Featured Slide</span>
              </button>
            </div>

            <div className="space-y-6">
              {config.featuredSlides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs font-mono text-[#38f2ff] font-bold">
                      Slide #{idx + 1}: {slide.title}
                    </span>
                    <button
                      onClick={() => handleDeleteSlide(idx)}
                      className="text-xs font-mono text-red-400 hover:text-red-300"
                    >
                      Delete Slide
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Project Title
                      </label>
                      <input
                        type="text"
                        value={slide.title}
                        onChange={(e) => handleUpdateSlide(idx, "title", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={slide.subtitle}
                        onChange={(e) => handleUpdateSlide(idx, "subtitle", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 mb-1">
                          Version Tag
                        </label>
                        <input
                          type="text"
                          value={slide.version}
                          onChange={(e) => handleUpdateSlide(idx, "version", e.target.value)}
                          className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 mb-1">
                          Status Badge
                        </label>
                        <input
                          type="text"
                          value={slide.status}
                          onChange={(e) => handleUpdateSlide(idx, "status", e.target.value)}
                          className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-[#38f2ff] font-bold font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={slide.description}
                      onChange={(e) => handleUpdateSlide(idx, "description", e.target.value)}
                      className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white"
                    />
                  </div>

                  {/* Phone Screenshot Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Phone Frame Screenshot
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={slide.phoneImage}
                          onChange={(e) => handleUpdateSlide(idx, "phoneImage", e.target.value)}
                          className="flex-1 bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                        />
                        <label className="px-3 py-2 bg-[#38f2ff] text-black text-xs font-mono font-bold rounded cursor-pointer hover:bg-[#00dbe8] shrink-0">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSlideImageUpload(idx, e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-20 rounded-lg overflow-hidden border border-white/20 bg-[#080e1a] shrink-0">
                        {slide.phoneImage && (
                          <Image
                            src={slide.phoneImage}
                            alt="Mockup preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Displayed inside simulated 3D phone mockup
                      </span>
                    </div>
                  </div>

                  {/* Store URLs & Fallback Notice Messages */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
                    {/* Google Play */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-emerald-400 font-bold">
                        Google Play Store Link
                      </label>
                      <input
                        type="text"
                        placeholder="https://play.google.com/store/apps/details?id=..."
                        value={slide.googlePlayUrl || ""}
                        onChange={(e) => handleUpdateSlide(idx, "googlePlayUrl", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                      />
                      <label className="block text-[10px] font-mono text-gray-400">
                        Message to show if NOT live on Google Play
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Currently in review. Expected live this week!"
                        value={slide.googlePlayMessage || ""}
                        onChange={(e) => handleUpdateSlide(idx, "googlePlayMessage", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-gray-300"
                      />
                    </div>

                    {/* Apple App Store */}
                    <div className="space-y-2">
                      <label className="block text-[11px] font-mono text-[#38f2ff] font-bold">
                        Apple App Store Link
                      </label>
                      <input
                        type="text"
                        placeholder="https://apps.apple.com/app/id..."
                        value={slide.appStoreUrl || ""}
                        onChange={(e) => handleUpdateSlide(idx, "appStoreUrl", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                      />
                      <label className="block text-[10px] font-mono text-gray-400">
                        Message to show if NOT live on App Store
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. iOS build undergoing TestFlight review."
                        value={slide.appStoreMessage || ""}
                        onChange={(e) => handleUpdateSlide(idx, "appStoreMessage", e.target.value)}
                        className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-gray-300"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: DEVENGINE MOBILE APP SECTION CONFIG
        ========================================================================= */}
        {activeTab === "mobileApp" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  DevEngine Official Mobile App Section
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Configure the bottom mobile app showroom and the exact messages shown when users tap &quot;Download on Google Play&quot; and &quot;Download on App Store&quot;.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={config.mobileAppSection.badgeText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        badgeText: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Title Prefix
                </label>
                <input
                  type="text"
                  value={config.mobileAppSection.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Title Highlight
                </label>
                <input
                  type="text"
                  value={config.mobileAppSection.titleHighlight}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        titleHighlight: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-[#38f2ff] font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Subtitle Description
              </label>
              <textarea
                rows={3}
                value={config.mobileAppSection.subtitle}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mobileAppSection: {
                      ...config.mobileAppSection,
                      subtitle: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2">
                Version & Requirements Specs Text
              </label>
              <input
                type="text"
                value={config.mobileAppSection.versionInfo}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    mobileAppSection: {
                      ...config.mobileAppSection,
                      versionInfo: e.target.value,
                    },
                  })
                }
                className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white font-mono"
              />
            </div>

            {/* Custom Messages on Button Tap */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
              <div className="p-4 rounded-xl bg-[#161c28] border border-emerald-500/30 space-y-2">
                <label className="block text-xs font-mono text-emerald-400 font-bold">
                  Message on &quot;Download on Google Play&quot; Tap
                </label>
                <textarea
                  rows={3}
                  value={config.mobileAppSection.googlePlayMessage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        googlePlayMessage: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#080e1a] border border-white/10 rounded p-2.5 text-xs text-white leading-relaxed"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#161c28] border border-[#38f2ff]/30 space-y-2">
                <label className="block text-xs font-mono text-[#38f2ff] font-bold">
                  Message on &quot;Download on App Store&quot; Tap
                </label>
                <textarea
                  rows={3}
                  value={config.mobileAppSection.appStoreMessage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        appStoreMessage: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#080e1a] border border-white/10 rounded p-2.5 text-xs text-white leading-relaxed"
                />
              </div>
            </div>

            {/* Mockups Upload */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-6">
              <div className="p-4 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                <span className="text-xs font-mono text-white font-bold block">
                  Main Front Phone Mockup
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMobileAppUpload("mainPhoneImage", e)}
                  disabled={uploadingImage}
                  className="w-full text-xs text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                />
                <input
                  type="text"
                  value={config.mobileAppSection.mainPhoneImage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        mainPhoneImage: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                <span className="text-xs font-mono text-white font-bold block">
                  Secondary Offset Phone Mockup
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleMobileAppUpload("secondaryPhoneImage", e)}
                  disabled={uploadingImage}
                  className="w-full text-xs text-gray-300 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                />
                <input
                  type="text"
                  value={config.mobileAppSection.secondaryPhoneImage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      mobileAppSection: {
                        ...config.mobileAppSection,
                        secondaryPhoneImage: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: STORE BANNER
        ========================================================================= */}
        {activeTab === "storeBanner" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  DevEngine Store Footer Banner
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Headline
                </label>
                <input
                  type="text"
                  value={config.storeBanner.headline}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storeBanner: { ...config.storeBanner, headline: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={config.storeBanner.description}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      storeBanner: { ...config.storeBanner, description: e.target.value },
                    })
                  }
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-2">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={config.storeBanner.buttonText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        storeBanner: { ...config.storeBanner, buttonText: e.target.value },
                      })
                    }
                    className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-2">
                    Button Destination URL
                  </label>
                  <input
                    type="text"
                    value={config.storeBanner.buttonUrl || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        storeBanner: { ...config.storeBanner, buttonUrl: e.target.value },
                      })
                    }
                    className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: CATEGORIES & APP LAB COLLECTION MANAGEMENT
        ========================================================================= */}
        {activeTab === "categories" && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row justify-between lg:items-center gap-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
                    <span>App Collection Management</span>
                    <span className="text-[10px] font-semibold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20 font-mono">
                      Firebase Firestore
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Manage applications in Firestore collection &quot;appLab&quot;, configure filter categories, and assign showroom images.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSeedAllDummyImages}
                  disabled={syncingDummyImages}
                  className="px-3.5 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {syncingDummyImages ? (
                    <>
                      <div className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
                      <span>Syncing Images...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Auto-Set Modern Dummy Images</span>
                    </>
                  )}
                </button>

                <Link
                  href="/admin/app-lab/manage"
                  className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-white/[0.15] text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Manage Apps</span>
                </Link>

                <Link
                  href="/admin/app-lab/add"
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                >
                  <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New App</span>
                </Link>
              </div>
            </div>

            {/* Category Pills Editor */}
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-teal-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Filter Category Pills
                  </h3>
                </div>
                <span className="text-xs text-gray-400">
                  Active filter tags shown on the public Launchpad showroom
                </span>
              </div>

              {/* Pills List */}
              <div className="flex flex-wrap gap-2 items-center">
                {(config.categories || ["All", "AI", "Productivity", "Education", "Creative"]).map(
                  (cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] hover:border-white/[0.15] text-xs font-semibold text-gray-200 shadow-sm transition"
                    >
                      <span>{cat}</span>
                      {cat !== "All" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-0.5 rounded-full hover:bg-rose-500/20 text-gray-400 hover:text-rose-300 transition text-xs font-bold"
                          title={`Remove ${cat}`}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  )
                )}
              </div>

              {/* Add Category Input Form */}
              <div className="flex flex-wrap gap-2.5 pt-1">
                <input
                  type="text"
                  placeholder="New Category Name..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="w-full sm:w-80 h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-5 h-11 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Category</span>
                </button>
              </div>
            </div>

            {/* Apps Grid with Full Image Upload & URL Management */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-mono text-white font-bold tracking-wider uppercase">
                  Current Firestore Apps ({appLabApps.length})
                </h3>
                <button
                  type="button"
                  onClick={fetchApps}
                  className="text-xs text-[#38f2ff] hover:underline font-mono"
                >
                  ↻ Refresh Apps
                </button>
              </div>

              {loadingApps ? (
                <div className="p-8 text-center bg-[#0e131f] rounded-xl border border-white/10">
                  <div className="w-5 h-5 border-2 border-[#38f2ff] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-mono">Loading apps from Firestore…</p>
                </div>
              ) : appLabApps.length === 0 ? (
                <div className="p-8 text-center bg-[#0e131f] rounded-xl border border-white/10 space-y-3">
                  <p className="text-sm text-gray-300 font-mono">
                    No apps found in Firestore &quot;appLab&quot; collection.
                  </p>
                  <p className="text-xs text-gray-400 font-mono">
                    Click &quot;⚡ Auto-Set Modern Dummy Images in Firebase&quot; or &quot;+ Add New App&quot; to populate your showroom!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {appLabApps.map((app) => {
                    const currentImg = getCleanAppThumbnail(app);
                    return (
                      <div
                        key={app.id}
                        className="bg-[#0e131f] border border-white/10 rounded-xl p-5 flex flex-col sm:flex-row gap-5 hover:border-[#38f2ff]/30 transition"
                      >
                        {/* Thumbnail & Image Controls */}
                        <div className="w-full sm:w-[150px] shrink-0 space-y-2">
                          <div className="w-full h-[180px] bg-[#161c28] rounded-lg overflow-hidden border border-white/10 relative">
                            <img
                              src={currentImg}
                              alt={app.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = DUMMY_APP_IMAGES.default;
                              }}
                            />
                          </div>

                          {/* Upload Image File Button */}
                          <label className="block w-full text-center px-2 py-1.5 bg-[#38f2ff]/10 hover:bg-[#38f2ff]/20 text-[#38f2ff] border border-[#38f2ff]/30 rounded text-[11px] font-mono font-bold cursor-pointer transition">
                            {uploadingImage ? "Uploading…" : "Upload Image File"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingImage}
                              onChange={(e) => handleUploadAppImage(app.id, e)}
                            />
                          </label>

                          {/* Quick Dummy Image Button */}
                          <button
                            type="button"
                            onClick={() => handleSetAppDummyImage(app)}
                            className="w-full text-center px-2 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded text-[10px] font-mono transition cursor-pointer"
                          >
                            Set Dummy Image
                          </button>
                        </div>

                        {/* App Information & Actions */}
                        <div className="flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-base font-bold text-white font-mono">
                                  {app.name}
                                </h4>
                                <p className="text-xs text-[#38f2ff] font-mono">
                                  {app.subtitle || "No tagline"}
                                </p>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  app.isPublic
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                }`}
                              >
                                {app.isPublic ? "LIVE" : "DRAFT"}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-gray-400">
                              <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                                v{app.version || "1.0.0"}
                              </span>
                              <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                                {app.platform || "android"}
                              </span>
                              {app.category && (
                                <span className="px-1.5 py-0.5 bg-white/5 rounded border border-white/5">
                                  {app.category}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                              {app.description}
                            </p>
                          </div>

                          {/* Image Link Input */}
                          <div className="space-y-1.5 border-t border-white/5 pt-2">
                            <label className="block text-[10px] font-mono text-gray-400">
                              Or Paste Image URL Link
                            </label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                placeholder={currentImg}
                                value={
                                  editingImageUrls[app.id] !== undefined
                                    ? editingImageUrls[app.id]
                                    : (app.images?.[0] || "")
                                }
                                onChange={(e) =>
                                  setEditingImageUrls({
                                    ...editingImageUrls,
                                    [app.id]: e.target.value,
                                  })
                                }
                                className="flex-1 bg-[#080e1a] border border-white/10 rounded px-2.5 py-1 text-xs text-white font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveAppImageUrl(app.id)}
                                className="px-2.5 py-1 bg-[#38f2ff] text-black text-[11px] font-mono font-bold rounded hover:bg-[#00dbe8] transition cursor-pointer"
                              >
                                Save Link
                              </button>
                            </div>
                          </div>

                          {/* Bottom Actions */}
                          <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAppPublic(app)}
                              className={`px-3 py-1 rounded text-xs font-mono font-bold cursor-pointer transition ${
                                app.isPublic
                                  ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                                  : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                              }`}
                            >
                              {app.isPublic ? "Unpublish" : "Publish"}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteApp(app.id, app.name)}
                              className="px-3 py-1 rounded text-xs font-mono text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
