import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  ArchiveConfig,
  ArchiveOfferSlide,
  CaseStudyContent,
  CaseStudyFeature,
  CaseStudyResult,
  CaseStudyTimeline,
} from "@/types/archive";
import {
  getArchiveConfig,
  updateArchiveConfig,
  resetArchiveConfigToDefault,
  uploadArchiveImage,
  uploadCaseStudyImage,
  DEFAULT_ARCHIVE_CONFIG,
  DEFAULT_CASE_STUDY_CONTENT,
} from "@/lib/services/archiveService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

type ArchiveTab = "featured" | "caseStudy" | "offers" | "lab" | "categories" | "heroStats";

interface ProjectOption {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: string | number;
  discount?: string | number;
  imageUrl?: string;
  tags?: string[];
}

export default function ManageArchivePage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [activeTab, setActiveTab] = useState<ArchiveTab>("featured");
  const [config, setConfig] = useState<ArchiveConfig>(DEFAULT_ARCHIVE_CONFIG);
  const [projectsList, setProjectsList] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
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
      if (!ok) router.replace("/login?redirect=/admin/manage-archive");
    });
    return () => unsub();
  }, [router]);

  // Load Archive CMS Config & Projects List
  const loadData = async () => {
    try {
      setLoading(true);
      const [archiveData, projectsSnap] = await Promise.all([
        getArchiveConfig(),
        getDocs(collection(db, "projects")),
      ]);

      setConfig(archiveData);

      const pList = projectsSnap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          slug: d.id,
          title: data.title || d.id,
          subtitle: data.subtitle || "",
          category: data.category || "general",
          price: data.price ?? "0",
          discount: data.discount,
          imageUrl: data.imageUrl || data.image || "",
          tags: data.tags || [],
        };
      });
      setProjectsList(pList);
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to load archive config",
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

  // Save changes
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateArchiveConfig(config);
      setMessage({
        text: "Archive configuration saved successfully!",
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setMessage({
        text: err?.message || "Failed to save archive config",
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
        "Are you sure you want to reset the Archive layout and texts to standard defaults? All custom text will be replaced."
      )
    ) {
      return;
    }
    try {
      setSaving(true);
      setMessage(null);
      await resetArchiveConfigToDefault();
      setConfig(DEFAULT_ARCHIVE_CONFIG);
      setMessage({
        text: "Archive reset to default configuration successfully!",
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

  // Handle Project Selection for Featured Case Study
  const handleSelectFeaturedProject = (projectId: string) => {
    const proj = projectsList.find((p) => p.slug === projectId || p.id === projectId);
    if (!proj) {
      setConfig({
        ...config,
        featuredCaseStudy: {
          ...config.featuredCaseStudy,
          projectId: "",
        },
      });
      return;
    }

    setConfig({
      ...config,
      featuredCaseStudy: {
        ...config.featuredCaseStudy,
        projectId: proj.slug,
        title: proj.title,
        titleHighlight: proj.subtitle,
        phoneImage: proj.imageUrl || config.featuredCaseStudy.phoneImage,
        techStack: proj.tags && proj.tags.length > 0 ? proj.tags.join(", ") : config.featuredCaseStudy.techStack,
      },
    });
  };

  // Phone Frame Image Upload
  const handlePhoneImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadArchiveImage(file, "phone_frame");
      setConfig({
        ...config,
        featuredCaseStudy: {
          ...config.featuredCaseStudy,
          phoneImage: url,
        },
      });
      setMessage({
        text: "Phone frame mockup image uploaded successfully!",
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to upload image",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Live Offers Slide Image Upload
  const handleSlideImageUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const url = await uploadArchiveImage(file, `offer_slide_${index}`);
      const updated = [...config.liveOffers.slides];
      updated[index] = { ...updated[index], frameImage: url };
      setConfig({
        ...config,
        liveOffers: { ...config.liveOffers, slides: updated },
      });
      setMessage({
        text: "Offer slide banner image uploaded successfully!",
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to upload slide image",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Add / Delete Offer Slide
  const handleAddOfferSlide = () => {
    const defaultProj = projectsList[0]?.slug || "snapcaption-ai";
    const newSlide: ArchiveOfferSlide = {
      id: `offer_${Date.now()}`,
      projectId: defaultProj,
      tag: "SPECIAL PROMOTION",
      title: "New Architectural System",
      discountBadge: "20% OFF",
      description: "Limited time engineering discount for early adopters.",
      originalPrice: "৳ 20,000",
      offerPrice: "৳ 16,000",
      claimButtonText: "CLAIM OFFER",
      frameImage:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop",
    };
    setConfig({
      ...config,
      liveOffers: {
        ...config.liveOffers,
        slides: [...config.liveOffers.slides, newSlide],
      },
    });
  };

  const handleDeleteOfferSlide = (index: number) => {
    const updated = config.liveOffers.slides.filter((_, i) => i !== index);
    setConfig({
      ...config,
      liveOffers: { ...config.liveOffers, slides: updated },
    });
  };

  const handleUpdateOfferSlide = (
    index: number,
    field: keyof ArchiveOfferSlide,
    value: string
  ) => {
    const updated = [...config.liveOffers.slides];
    updated[index] = { ...updated[index], [field]: value };
    setConfig({
      ...config,
      liveOffers: { ...config.liveOffers, slides: updated },
    });
  };

  // Category management handlers
  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const current =
      config.categories || ["android", "ios", "web", "ai", "automation"];
    if (current.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({
        text: `Category "${trimmed}" already exists.`,
        type: "error",
      });
      return;
    }
    setConfig({
      ...config,
      categories: [...current, trimmed],
    });
    setNewCategoryInput("");
    setMessage({
      text: `Category "${trimmed}" added! Click "Save Archive Changes" to apply.`,
      type: "success",
    });
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const current =
      config.categories || ["android", "ios", "web", "ai", "automation"];
    setConfig({
      ...config,
      categories: current.filter(
        (c) => c.toLowerCase() !== catToDelete.toLowerCase()
      ),
    });
  };

  // Default project dummy images management handlers
  const handleUpdateDefaultImage = (index: number, url: string) => {
    const current = [...(config.defaultProjectImages || [])];
    current[index] = url;
    setConfig({
      ...config,
      defaultProjectImages: current,
    });
  };

  const handleUploadDefaultImage = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadArchiveImage(file, `default_proj_${index}`);
      handleUpdateDefaultImage(index, url);
      setMessage({
        text: `Project dummy image ${index + 1} uploaded successfully!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({
        text: err?.message || "Failed to upload image",
        type: "error",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  // Case Study Content Handlers
  const currentCaseStudy: CaseStudyContent =
    config.featuredCaseStudy.caseStudyContent || DEFAULT_CASE_STUDY_CONTENT;

  const updateCaseStudy = (patch: Partial<CaseStudyContent>) => {
    setConfig((prev) => ({
      ...prev,
      featuredCaseStudy: {
        ...prev.featuredCaseStudy,
        caseStudyContent: {
          ...(prev.featuredCaseStudy.caseStudyContent || DEFAULT_CASE_STUDY_CONTENT),
          ...patch,
        },
      },
    }));
  };

  const handleCaseStudyHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadCaseStudyImage(file, "hero");
      updateCaseStudy({ heroImage: url });
      setMessage({ text: "Hero image uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to upload hero image", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleArchitectureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadCaseStudyImage(file, "architecture");
      updateCaseStudy({ architectureDiagram: url });
      setMessage({ text: "Architecture diagram uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to upload diagram", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Features
  const handleAddFeature = () => {
    const features = [
      ...currentCaseStudy.keyFeatures,
      { title: "New Feature", description: "", image: "" },
    ];
    updateCaseStudy({ keyFeatures: features });
  };

  const handleUpdateFeature = (
    index: number,
    field: keyof CaseStudyFeature,
    val: string
  ) => {
    const features = [...currentCaseStudy.keyFeatures];
    features[index] = { ...features[index], [field]: val };
    updateCaseStudy({ keyFeatures: features });
  };

  const handleRemoveFeature = (index: number) => {
    const features = currentCaseStudy.keyFeatures.filter((_, i) => i !== index);
    updateCaseStudy({ keyFeatures: features });
  };

  const handleFeatureImageUpload = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadCaseStudyImage(file, `feature_${index}`);
      handleUpdateFeature(index, "image", url);
      setMessage({ text: `Feature ${index + 1} image uploaded!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  // Results
  const handleAddResult = () => {
    const results = [
      ...currentCaseStudy.results,
      { metric: "Metric", value: "100%", description: "Description" },
    ];
    updateCaseStudy({ results });
  };

  const handleUpdateResult = (
    index: number,
    field: keyof CaseStudyResult,
    val: string
  ) => {
    const results = [...currentCaseStudy.results];
    results[index] = { ...results[index], [field]: val };
    updateCaseStudy({ results });
  };

  const handleRemoveResult = (index: number) => {
    const results = currentCaseStudy.results.filter((_, i) => i !== index);
    updateCaseStudy({ results });
  };

  // Timeline
  const handleAddTimeline = () => {
    const timeline = [
      ...currentCaseStudy.timeline,
      {
        phase: `Phase ${currentCaseStudy.timeline.length + 1}`,
        title: "New Phase",
        description: "",
      },
    ];
    updateCaseStudy({ timeline });
  };

  const handleUpdateTimeline = (
    index: number,
    field: keyof CaseStudyTimeline,
    val: string
  ) => {
    const timeline = [...currentCaseStudy.timeline];
    timeline[index] = { ...timeline[index], [field]: val };
    updateCaseStudy({ timeline });
  };

  const handleRemoveTimeline = (index: number) => {
    const timeline = currentCaseStudy.timeline.filter((_, i) => i !== index);
    updateCaseStudy({ timeline });
  };

  // Gallery
  const handleAddGalleryImage = (url: string) => {
    if (!url.trim()) return;
    updateCaseStudy({ gallery: [...currentCaseStudy.gallery, url.trim()] });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingImage(true);
      const url = await uploadCaseStudyImage(file, "gallery");
      handleAddGalleryImage(url);
      setMessage({ text: "Gallery image uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Upload failed", type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const gallery = currentCaseStudy.gallery.filter((_, i) => i !== index);
    updateCaseStudy({ gallery });
  };

  const handleUpdateGalleryImage = (index: number, url: string) => {
    const gallery = [...currentCaseStudy.gallery];
    gallery[index] = url;
    updateCaseStudy({ gallery });
  };

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Archive CMS | Admin</title>
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
          <title>Archive CMS | Admin</title>
        </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <div className="flex flex-col items-center justify-center">
            <HelixLoader size={56} color="#38f2ff" />
            <p className="mt-4 text-[#849495] font-mono">Loading Archive CMS…</p>
          </div>
        </main>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Archive & Projects | DevEngine Admin</title>
      </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-white/[0.08]">
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
                href="/projects"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Public Archive</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>DevEngine Archive CMS</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Firestore
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] hover:border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_28px_rgba(20,184,166,0.5)] transition-all flex items-center gap-2 disabled:opacity-50 active:scale-[0.98]"
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
                  <span>Save Archive Changes</span>
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
              id: "featured",
              label: "Featured Case Study & Phone Frame",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: "caseStudy",
              label: "Case Study Content",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
            },
            {
              id: "offers",
              label: "Live Offers Banner Carousel",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              ),
            },
            {
              id: "lab",
              label: "In The Lab & Countdown",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              ),
            },
            {
              id: "categories",
              label: "Categories & Project Images",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ),
            },
            {
              id: "heroStats",
              label: "Hero & Archive Metrics",
              icon: (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ArchiveTab)}
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
            TAB 1: FEATURED CASE STUDY & PHONE FRAME MOCKUP
        ========================================================================= */}
        {activeTab === "featured" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Featured Case Study Configuration
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                Selects the hero showcase project with 3D phone mockup
              </span>
            </div>

            {/* Showcase Mode Switcher: Link Existing Project vs Manual Custom Project */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">Showcase Configuration Mode</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Choose whether to link an existing project from your database or write a custom showcase manually.
                </p>
              </div>
              <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        isManual: false,
                      },
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !config.featuredCaseStudy.isManual
                      ? "bg-teal-500 text-black shadow-[0_0_12px_rgba(20,184,166,0.4)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Link Database Project
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        isManual: true,
                        projectId: "",
                      },
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    config.featuredCaseStudy.isManual
                      ? "bg-teal-500 text-black shadow-[0_0_12px_rgba(20,184,166,0.4)]"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Manual Custom Entry
                </button>
              </div>
            </div>

            {/* If Link Existing Project: Show Dropdown */}
            {!config.featuredCaseStudy.isManual ? (
              <div className="p-5 rounded-2xl bg-teal-500/[0.03] border border-teal-500/20 space-y-3">
                <label className="block text-xs font-semibold text-teal-300">
                  Select Existing Project from Database
                </label>
                <div className="relative">
                  <select
                    value={config.featuredCaseStudy.projectId}
                    onChange={(e) => handleSelectFeaturedProject(e.target.value)}
                    className="w-full h-11 bg-black/60 border border-teal-500/30 rounded-xl px-4 pr-10 text-sm text-white focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400/40 transition appearance-none cursor-pointer"
                  >
                    <option value="">-- Choose a Project --</option>
                    {projectsList.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.title} ({p.category.toUpperCase()}) — ৳ {p.discount || p.price}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Selecting a project automatically links the "VIEW CASE STUDY" button to its detail page.
                </p>
              </div>
            ) : (
              /* If Manual Custom Entry: Show Custom URL & Instructions */
              <div className="p-5 rounded-2xl bg-cyan-500/[0.04] border border-cyan-500/20 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                    Manual Custom Entry Mode Active
                  </label>
                </div>
                <p className="text-xs text-gray-400">
                  You can input all showcase details manually below (title, highlight, description, tech stack, phone screenshot). No existing database project is required.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Custom Target Link / Action URL (optional)
                  </label>
                  <input
                    type="text"
                    value={config.featuredCaseStudy.customProjectUrl || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        featuredCaseStudy: {
                          ...config.featuredCaseStudy,
                          customProjectUrl: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. /projects/case-study or /projects/custom-slug or external link"
                    className="w-full h-11 bg-black/60 border border-cyan-500/30 focus:border-cyan-400 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition font-mono focus:outline-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Leave blank to default to <code className="text-cyan-400 font-mono">/projects/case-study</code>.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Badge Text (Top Pill)
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.badgeText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        badgeText: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.buttonText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        buttonText: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Subtitle / Highlight
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.titleHighlight}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        titleHighlight: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={config.featuredCaseStudy.description}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    featuredCaseStudy: {
                      ...config.featuredCaseStudy,
                      description: e.target.value,
                    },
                  })
                }
                className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl p-4 text-sm text-white placeholder-gray-500 transition focus:outline-none resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Tech Stack
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.techStack}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        techStack: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  License
                </label>
                <input
                  type="text"
                  value={config.featuredCaseStudy.license}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      featuredCaseStudy: {
                        ...config.featuredCaseStudy,
                        license: e.target.value,
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            {/* Phone Mockup Frame Image (Upload or URL) */}
            <div className="p-6 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-white/[0.06]">
                <h3 className="text-sm text-white font-bold tracking-tight flex items-center gap-2">
                  <span>3D Mobile Phone Frame Screenshot</span>
                </h3>
                <span className="text-xs text-teal-400/90 font-medium">
                  Displayed inside simulated phone mockup
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Upload Screenshot File
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhoneImageUpload}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 file:cursor-pointer transition"
                    />
                    {uploadingImage && (
                      <p className="text-xs text-teal-400 mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                        Uploading to Firebase Storage…
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Or Paste Image URL Directly
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={config.featuredCaseStudy.phoneImage}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          featuredCaseStudy: {
                            ...config.featuredCaseStudy,
                            phoneImage: e.target.value,
                          },
                        })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                    />
                  </div>
                </div>

                {/* Preview Frame */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-black/60 border border-white/[0.08]">
                  <span className="text-xs font-medium text-gray-400 mb-3">
                    Mockup Preview
                  </span>
                  {config.featuredCaseStudy.phoneImage ? (
                    <div className="relative w-28 h-56 rounded-2xl overflow-hidden border-2 border-teal-400/50 shadow-[0_0_20px_rgba(45,212,191,0.2)]">
                      <Image
                        src={config.featuredCaseStudy.phoneImage}
                        alt="Phone mockup preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-56 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-center p-3 text-xs text-gray-500">
                      No custom image (Default chat UI is shown)
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: CASE STUDY CONTENT
        ========================================================================= */}
        {activeTab === "caseStudy" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2.5">
                    <span>Case Study Content Management</span>
                    <span className="bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] px-2.5 py-0.5 rounded-full font-mono uppercase">
                      /projects/case-study
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Manage all deep-dive engineering narrative sections, images, metrics, timeline, and results for the featured case study.
                </p>
              </div>
              <Link
                href="/projects/case-study"
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs text-teal-300 border border-teal-500/30 transition-all font-semibold"
              >
                <span>Preview Live Case Study</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>

            {/* 1. HERO BANNER IMAGE */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold flex items-center justify-between">
                <span>01. Hero Banner Image</span>
                <span className="text-xs text-[#38f2ff]">Top full-width background</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">
                      Upload Hero Banner File
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCaseStudyHeroUpload}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">
                      Or Direct Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={currentCaseStudy.heroImage}
                      onChange={(e) => updateCaseStudy({ heroImage: e.target.value })}
                      className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 bg-[#080e1a]">
                  {currentCaseStudy.heroImage ? (
                    <Image
                      src={currentCaseStudy.heroImage}
                      alt="Hero preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-gray-500">
                      No hero image configured
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. THE CHALLENGE */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
              <h3 className="text-sm font-mono text-white font-bold flex items-center justify-between">
                <span>02. The Challenge (Problem Statement)</span>
                <span className="text-xs text-gray-400">Detailed overview of problem</span>
              </h3>
              <textarea
                rows={4}
                value={currentCaseStudy.challenge}
                onChange={(e) => updateCaseStudy({ challenge: e.target.value })}
                placeholder="Describe the real-world engineering challenge, market gap, or technical bottleneck..."
                className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-3 text-xs text-white leading-relaxed focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* 3. THE APPROACH & ARCHITECTURE DIAGRAM */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold flex items-center justify-between">
                <span>03. The Approach & System Architecture</span>
                <span className="text-xs text-gray-400">Design philosophy & blueprint</span>
              </h3>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1.5">
                  Approach Description
                </label>
                <textarea
                  rows={4}
                  value={currentCaseStudy.approach}
                  onChange={(e) => updateCaseStudy({ approach: e.target.value })}
                  placeholder="Explain the architectural pattern, state management strategy, framework choice..."
                  className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-3 text-xs text-white leading-relaxed focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">
                      Upload Architecture Diagram
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleArchitectureUpload}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1.5">
                      Or Diagram Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={currentCaseStudy.architectureDiagram}
                      onChange={(e) => updateCaseStudy({ architectureDiagram: e.target.value })}
                      className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="relative h-32 rounded-xl overflow-hidden border border-white/10 bg-[#080e1a]">
                  {currentCaseStudy.architectureDiagram ? (
                    <Image
                      src={currentCaseStudy.architectureDiagram}
                      alt="Architecture preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-gray-500">
                      No diagram configured
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. KEY FEATURES SHOWCASE */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono text-white font-bold">
                    04. Key Features Showcase
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Feature breakdown with alternating layout and screenshots
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddFeature}
                  className="px-3 py-1.5 rounded-lg bg-[#38f2ff]/20 text-[#38f2ff] hover:bg-[#38f2ff]/30 text-xs font-mono font-bold transition"
                >
                  + Add Feature
                </button>
              </div>

              <div className="space-y-4">
                {currentCaseStudy.keyFeatures.map((feat, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#080e1a] border border-white/10 space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#38f2ff] font-bold">
                        Feature #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(idx)}
                        className="text-xs font-mono text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 mb-1">
                          Feature Title
                        </label>
                        <input
                          type="text"
                          value={feat.title}
                          onChange={(e) => handleUpdateFeature(idx, "title", e.target.value)}
                          className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-mono text-gray-400 mb-1">
                          Feature Image URL or File
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="https://..."
                            value={feat.image || ""}
                            onChange={(e) => handleUpdateFeature(idx, "image", e.target.value)}
                            className="flex-1 bg-[#161c28] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                          />
                          <label className="px-3 py-2 bg-[#38f2ff] text-black text-xs font-mono font-bold rounded-lg cursor-pointer hover:bg-[#00dbe8] shrink-0">
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFeatureImageUpload(idx, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-gray-400 mb-1">
                        Feature Description
                      </label>
                      <textarea
                        rows={2}
                        value={feat.description}
                        onChange={(e) => handleUpdateFeature(idx, "description", e.target.value)}
                        className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2.5 text-xs text-white leading-relaxed focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. DEVELOPMENT TIMELINE */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono text-white font-bold">
                    05. Development Timeline
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Chronological milestone roadmap (Phase, Title, Description)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTimeline}
                  className="px-3 py-1.5 rounded-lg bg-[#38f2ff]/20 text-[#38f2ff] hover:bg-[#38f2ff]/30 text-xs font-mono font-bold transition"
                >
                  + Add Phase
                </button>
              </div>

              <div className="space-y-3">
                {currentCaseStudy.timeline.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#080e1a] border border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-mono text-gray-400 mb-1">Phase Label</label>
                      <input
                        type="text"
                        value={item.phase}
                        onChange={(e) => handleUpdateTimeline(idx, "phase", e.target.value)}
                        className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none font-mono"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-mono text-gray-400 mb-1">Milestone Title</label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleUpdateTimeline(idx, "title", e.target.value)}
                        className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-mono text-gray-400 mb-1">Milestone Description</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleUpdateTimeline(idx, "description", e.target.value)}
                        className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveTimeline(idx)}
                        className="text-xs font-mono text-red-400 hover:text-red-300 p-2"
                        title="Remove Phase"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. RESULTS & IMPACT */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono text-white font-bold">
                    06. Measurable Results & Impact
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Benchmark statistics, throughput metrics, performance wins
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddResult}
                  className="px-3 py-1.5 rounded-lg bg-[#38f2ff]/20 text-[#38f2ff] hover:bg-[#38f2ff]/30 text-xs font-mono font-bold transition"
                >
                  + Add Metric
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCaseStudy.results.map((res, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#080e1a] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[#38f2ff] font-bold">
                        Stat #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveResult(idx)}
                        className="text-xs font-mono text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 mb-1">Metric Name</label>
                        <input
                          type="text"
                          value={res.metric}
                          onChange={(e) => handleUpdateResult(idx, "metric", e.target.value)}
                          placeholder="e.g. Latency"
                          className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 mb-1">Highlight Value</label>
                        <input
                          type="text"
                          value={res.value}
                          onChange={(e) => handleUpdateResult(idx, "value", e.target.value)}
                          placeholder="e.g. <150ms"
                          className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-[#38f2ff] font-bold focus:border-[#38f2ff] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono text-gray-400 mb-1">Short Description</label>
                      <input
                        type="text"
                        value={res.description}
                        onChange={(e) => handleUpdateResult(idx, "description", e.target.value)}
                        placeholder="e.g. 5x faster than previous version"
                        className="w-full bg-[#161c28] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. TECHNICAL DEEP-DIVE */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
              <h3 className="text-sm font-mono text-white font-bold flex items-center justify-between">
                <span>07. Technical Deep-Dive</span>
                <span className="text-xs text-gray-400">In-depth technical narrative</span>
              </h3>
              <textarea
                rows={5}
                value={currentCaseStudy.technicalDeepDive}
                onChange={(e) => updateCaseStudy({ technicalDeepDive: e.target.value })}
                placeholder="Detailed breakdown of stack, state management, caching layer, failover handling..."
                className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-3 text-xs text-white leading-relaxed focus:border-[#38f2ff] focus:outline-none"
              />
            </div>

            {/* 8. VISUAL GALLERY */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-mono text-white font-bold">
                    08. Visual Gallery
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Screenshots and UI renders displayed in a masonry showcase
                  </p>
                </div>
                <label className="px-4 py-2 rounded-lg bg-[#38f2ff] text-black font-mono text-xs font-bold hover:bg-[#00dbe8] transition cursor-pointer self-start sm:self-auto">
                  + Upload Screenshot
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGalleryUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Add direct URL */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or paste screenshot image URL directly (e.g. https://...)"
                  id="newGalleryUrlInput"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const target = e.currentTarget;
                      handleAddGalleryImage(target.value);
                      target.value = "";
                    }
                  }}
                  className="flex-1 bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById("newGalleryUrlInput") as HTMLInputElement;
                    if (input && input.value) {
                      handleAddGalleryImage(input.value);
                      input.value = "";
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-mono text-white font-bold"
                >
                  Add URL
                </button>
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                {currentCaseStudy.gallery.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative h-28 rounded-xl overflow-hidden border border-white/10 group bg-[#080e1a]"
                  >
                    <Image
                      src={imgUrl}
                      alt={`Gallery item ${idx + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="px-2.5 py-1 rounded bg-red-500/80 hover:bg-red-500 text-white text-[10px] font-mono font-bold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 9. TESTIMONIAL / ENDORSEMENT */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold">
                09. Testimonial / Endorsement (Optional)
              </h3>
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">
                  Quote
                </label>
                <textarea
                  rows={2}
                  value={currentCaseStudy.testimonial?.quote || ""}
                  onChange={(e) =>
                    updateCaseStudy({
                      testimonial: {
                        ...(currentCaseStudy.testimonial || { author: "", role: "", quote: "" }),
                        quote: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={currentCaseStudy.testimonial?.author || ""}
                    onChange={(e) =>
                      updateCaseStudy({
                        testimonial: {
                          ...(currentCaseStudy.testimonial || { author: "", role: "", quote: "" }),
                          author: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Author Role / Company
                  </label>
                  <input
                    type="text"
                    value={currentCaseStudy.testimonial?.role || ""}
                    onChange={(e) =>
                      updateCaseStudy({
                        testimonial: {
                          ...(currentCaseStudy.testimonial || { author: "", role: "", quote: "" }),
                          role: e.target.value,
                        },
                      })
                    }
                    className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 10. CALL TO ACTION (CTA) */}
            <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
              <h3 className="text-sm font-mono text-white font-bold">
                10. Bottom Call to Action (CTA)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    CTA Title
                  </label>
                  <input
                    type="text"
                    value={currentCaseStudy.ctaTitle}
                    onChange={(e) => updateCaseStudy({ ctaTitle: e.target.value })}
                    className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    CTA Description
                  </label>
                  <input
                    type="text"
                    value={currentCaseStudy.ctaDescription}
                    onChange={(e) => updateCaseStudy({ ctaDescription: e.target.value })}
                    className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: LIVE OFFERS BANNER CAROUSEL
        ========================================================================= */}
        {activeTab === "offers" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.06]">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Live Offers Banner Carousel
                  </h2>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Auto-swiping banner showcase with live countdown & discount strike-throughs
                </p>
              </div>

              <button
                onClick={handleAddOfferSlide}
                className="px-4 py-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-semibold text-xs transition-all flex items-center gap-2 self-start sm:self-auto shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Offer Slide</span>
              </button>
            </div>

            {/* Top Config Row - Equal Height Aligned Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Badge Text (Top Pill)
                  </label>
                  <input
                    type="text"
                    value={config.liveOffers.badgeText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        liveOffers: {
                          ...config.liveOffers,
                          badgeText: e.target.value,
                        },
                      })
                    }
                    placeholder="e.g. LIVE OFFERS"
                    className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Displayed as the category pill above the carousel section.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-teal-500/[0.03] border border-teal-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-teal-300">
                      Display Limit in Carousel
                    </label>
                    <span className="text-xs font-medium text-gray-400">
                      Total slides: <span className="text-white font-semibold">{config.liveOffers.slides.length}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      max={Math.max(config.liveOffers.slides.length, 10)}
                      value={
                        config.liveOffers.maxVisibleOffers ??
                        config.liveOffers.slides.length
                      }
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          liveOffers: {
                            ...config.liveOffers,
                            maxVisibleOffers: Math.max(
                              1,
                              Number(e.target.value) || 1
                            ),
                          },
                        })
                      }
                      className="w-24 h-11 bg-black/60 border border-teal-500/30 rounded-xl px-4 text-sm text-white font-bold focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400/40 transition"
                    />
                    <span className="text-xs text-gray-400">
                      active deals auto-swiping simultaneously
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-teal-400/70 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Controls how many deals appear in the public carousel banner.
                </p>
              </div>
            </div>

            {/* Slide Cards */}
            <div className="space-y-6 pt-2">
              {config.liveOffers.slides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className="p-6 sm:p-7 rounded-2xl sm:rounded-3xl bg-black/40 border border-white/[0.08] hover:border-white/[0.14] transition-all space-y-6 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        Slide #{idx + 1}
                      </span>
                      {slide.title && (
                        <span className="text-sm font-semibold text-gray-300 truncate max-w-[200px] sm:max-w-md">
                          — {slide.title}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteOfferSlide(idx)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete Slide
                    </button>
                  </div>

                  {/* Row 1: Tag, Title, Discount */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Tag Badge
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AI / ML BOILERPLATE"
                        value={slide.tag}
                        onChange={(e) =>
                          handleUpdateOfferSlide(idx, "tag", e.target.value)
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Offer Title
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Find It - Item Tracker"
                        value={slide.title}
                        onChange={(e) =>
                          handleUpdateOfferSlide(idx, "title", e.target.value)
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Discount Highlight
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 30% OFF"
                        value={slide.discountBadge}
                        onChange={(e) =>
                          handleUpdateOfferSlide(
                            idx,
                            "discountBadge",
                            e.target.value
                          )
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-teal-300 font-semibold placeholder-gray-500 transition focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 2: Regular Price, Offer Price, Button Text */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Regular Price (Strikethrough)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ৳ 10,000"
                        value={slide.originalPrice}
                        onChange={(e) =>
                          handleUpdateOfferSlide(
                            idx,
                            "originalPrice",
                            e.target.value
                          )
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-gray-400 placeholder-gray-500 transition focus:outline-none line-through"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Offer Price (Deal)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ৳ 7,000"
                        value={slide.offerPrice}
                        onChange={(e) =>
                          handleUpdateOfferSlide(
                            idx,
                            "offerPrice",
                            e.target.value
                          )
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-teal-300 font-bold placeholder-gray-500 transition focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Action Button Text
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. CLAIM OFFER"
                        value={slide.claimButtonText}
                        onChange={(e) =>
                          handleUpdateOfferSlide(
                            idx,
                            "claimButtonText",
                            e.target.value
                          )
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Row 3: Associated Project Dropdown & File Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-end">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Associated Project (Dropdown Link)
                      </label>
                      <div className="relative">
                        <select
                          value={slide.projectId || ""}
                          onChange={(e) =>
                            handleUpdateOfferSlide(idx, "projectId", e.target.value)
                          }
                          className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 pr-10 text-sm text-white transition focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="">-- None / Custom Offer --</option>
                          {projectsList.map((p) => (
                            <option key={p.slug} value={p.slug}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Upload Banner Image File
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleSlideImageUpload(idx, e)}
                        className="w-full text-xs text-gray-300 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 file:cursor-pointer transition"
                      />
                    </div>
                  </div>

                  {/* Row 4: Image URL & Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5 items-center">
                    <div className="md:col-span-3">
                      <label className="block text-xs font-semibold text-gray-300 mb-2">
                        Or Direct Banner Image URL
                      </label>
                      <input
                        type="text"
                        placeholder="https://images.unsplash.com/..."
                        value={slide.frameImage || ""}
                        onChange={(e) =>
                          handleUpdateOfferSlide(idx, "frameImage", e.target.value)
                        }
                        className="w-full h-11 bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-xs text-white placeholder-gray-500 transition focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-6 md:pt-0">
                      {slide.frameImage ? (
                        <div className="relative w-24 h-14 rounded-xl overflow-hidden border border-teal-500/30 shadow-md">
                          <Image
                            src={slide.frameImage}
                            alt="Slide banner preview"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-[10px] text-gray-500">
                          No Image
                        </div>
                      )}
                      <span className="text-xs text-gray-400 font-medium">
                        Preview
                      </span>
                    </div>
                  </div>

                  {/* Row 5: Description */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      Offer Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief highlight description of the deal or promotion..."
                      value={slide.description}
                      onChange={(e) =>
                        handleUpdateOfferSlide(idx, "description", e.target.value)
                      }
                      className="w-full bg-black/50 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl p-4 text-sm text-white placeholder-gray-500 transition focus:outline-none resize-y"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: IN THE LAB & COUNTDOWN
        ========================================================================= */}
        {activeTab === "lab" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  In The Lab (Upcoming Classified Development)
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                Featured R&D milestone preview & live countdown
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={config.lab.badgeText}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, badgeText: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Section Headline
                </label>
                <input
                  type="text"
                  value={config.lab.title}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, title: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Project Name (e.g. Project Aurora)
                </label>
                <input
                  type="text"
                  value={config.lab.projectName}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, projectName: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Tech Domain
                </label>
                <input
                  type="text"
                  value={config.lab.techDomain}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, techDomain: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Progress Percentage (0-100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.lab.progressPercentage}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: {
                        ...config.lab,
                        progressPercentage: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Expected Deployment Quarter
                </label>
                <input
                  type="text"
                  value={config.lab.expectedDeploy}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, expectedDeploy: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Target Launch Date (Countdown Clock)
                </label>
                <input
                  type="text"
                  placeholder="2026-12-31T23:59:59Z"
                  value={config.lab.targetLaunchDate}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lab: { ...config.lab, targetLaunchDate: e.target.value },
                    })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-xs text-teal-300 font-mono focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                  Powers the live DAYS : HOURS : MINS countdown clock on the public screen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: CATEGORIES & PROJECT DUMMY IMAGES
        ========================================================================= */}
        {activeTab === "categories" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-8">
            {/* Category Management */}
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Archive Categories & Filter Pills
                  </h2>
                </div>
                <span className="text-xs text-teal-300 font-semibold px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                  Active: {(config.categories || ["android", "ios", "web", "ai", "automation"]).length} Categories
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Admin-managed categories dynamically appear alongside &ldquo;ALL&rdquo; in the sticky Filter Command Center.
              </p>

              {/* Add Category Form */}
              <div className="flex gap-3 max-w-lg">
                <input
                  type="text"
                  placeholder="e.g. iOS, AI, Automation, Blockchain, DevOps..."
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-5 h-11 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black text-xs font-bold transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Category</span>
                </button>
              </div>

              {/* Active Category Badges */}
              <div className="flex flex-wrap gap-2.5 p-4 rounded-2xl bg-black/40 border border-white/[0.08]">
                {(
                  config.categories || [
                    "android",
                    "ios",
                    "web",
                    "ai",
                    "automation",
                  ]
                ).map((cat) => (
                  <div
                    key={cat}
                    className="inline-flex items-center gap-2 bg-[#080e1a] px-3.5 py-1.5 rounded-full border border-white/10 font-jetbrains text-xs uppercase text-white shadow-sm"
                  >
                    <span>{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="text-gray-400 hover:text-red-400 transition text-xs font-bold"
                      title={`Remove ${cat}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Default Project Dummy Images Management */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white font-mono flex items-center justify-between">
                  <span>Default Project Dummy Images (Bento & Catalog Frames)</span>
                  <span className="text-xs text-[#38f2ff]">
                    Editable Links & File Uploads
                  </span>
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  When a project has no uploaded screenshot, these curated cyber-tech dummy images are displayed. You can customize the URL or upload replacement images below.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  "Slot 1: Bento Featured Large Card",
                  "Slot 2: Bento Card 2",
                  "Slot 3: Bento Card 3",
                  "Slot 4: Bento Card 4",
                  "Slot 5: Catalog Card Fallback A",
                  "Slot 6: Catalog Card Fallback B",
                ].map((slotName, slotIdx) => {
                  const currentImages =
                    config.defaultProjectImages &&
                    config.defaultProjectImages.length > 0
                      ? config.defaultProjectImages
                      : DEFAULT_ARCHIVE_CONFIG.defaultProjectImages || [];
                  const currentUrl = currentImages[slotIdx] || "";

                  return (
                    <div
                      key={slotIdx}
                      className="p-4 rounded-xl bg-[#161c28] border border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-[#38f2ff] font-bold">
                          {slotName}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">
                          Image #{slotIdx + 1}
                        </span>
                      </div>

                      <div className="flex gap-3 items-center">
                        {/* Thumbnail Preview */}
                        <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/15 flex-shrink-0 bg-[#080e1a]">
                          {currentUrl ? (
                            <Image
                              src={currentUrl}
                              alt={slotName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px] text-gray-500 font-mono">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* File Upload Button */}
                        <div className="flex-1 space-y-1">
                          <label className="block text-[10px] font-mono text-gray-400">
                            Upload Replacement File:
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadDefaultImage(slotIdx, e)}
                            className="w-full text-[11px] text-gray-300 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8]"
                          />
                        </div>
                      </div>

                      {/* URL Direct Input */}
                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 mb-1">
                          Or Direct Image URL:
                        </label>
                        <input
                          type="text"
                          value={currentUrl}
                          onChange={(e) =>
                            handleUpdateDefaultImage(slotIdx, e.target.value)
                          }
                          placeholder="https://..."
                          className="w-full bg-[#080e1a] border border-white/10 rounded p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: HERO & ARCHIVE METRICS
        ========================================================================= */}
        {activeTab === "heroStats" && (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Hero & Archive Statistics Configuration
                </h2>
              </div>
              <span className="text-xs text-gray-400 font-normal">
                Public landing hero banner & metrics strip
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Hero Badge Text
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
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Hero Title
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
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Hero Title Gradient Highlight
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
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Hero Subtitle
                </label>
                <textarea
                  rows={2}
                  value={config.hero.subtitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      hero: { ...config.hero, subtitle: e.target.value },
                    })
                  }
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:ring-1 focus:ring-teal-400/40 rounded-xl p-3 text-sm text-white placeholder-gray-500 transition focus:outline-none resize-y"
                />
              </div>
            </div>

            {/* Statistics */}
            <div className="pt-5 border-t border-white/[0.06] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white tracking-tight">
                  4-Column Metrics Showcase
                </h3>
                <span className="text-xs text-gray-400">
                  Visible live across the archive counter bar
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider block">
                    Stat Metric #1
                  </span>
                  <input
                    type="text"
                    value={config.stats.stat1Value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat1Value: e.target.value },
                      })
                    }
                    placeholder="e.g. 50+"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-sm font-bold text-teal-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={config.stats.stat1Label}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat1Label: e.target.value },
                      })
                    }
                    placeholder="e.g. Open Source Tools"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-xs text-gray-300 focus:outline-none"
                  />
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider block">
                    Stat Metric #2
                  </span>
                  <input
                    type="text"
                    value={config.stats.stat2Value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat2Value: e.target.value },
                      })
                    }
                    placeholder="e.g. 99.9%"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-sm font-bold text-teal-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={config.stats.stat2Label}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat2Label: e.target.value },
                      })
                    }
                    placeholder="e.g. Uptime Guaranteed"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-xs text-gray-300 focus:outline-none"
                  />
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider block">
                    Stat Metric #3
                  </span>
                  <input
                    type="text"
                    value={config.stats.stat3Value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat3Value: e.target.value },
                      })
                    }
                    placeholder="e.g. 15k+"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-sm font-bold text-teal-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={config.stats.stat3Label}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat3Label: e.target.value },
                      })
                    }
                    placeholder="e.g. Active Developers"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-xs text-gray-300 focus:outline-none"
                  />
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider block">
                    Stat Metric #4
                  </span>
                  <input
                    type="text"
                    value={config.stats.stat4Value}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat4Value: e.target.value },
                      })
                    }
                    placeholder="e.g. 24/7"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-sm font-bold text-teal-300 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={config.stats.stat4Label}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        stats: { ...config.stats, stat4Label: e.target.value },
                      })
                    }
                    placeholder="e.g. Enterprise Support"
                    className="w-full h-10 bg-black/60 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-3 text-xs text-gray-300 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: CASE STUDY CONTENT (Rich narrative fields)
        ========================================================================= */}
        {activeTab === "caseStudy" && (() => {
          const csContent: CaseStudyContent = config.featuredCaseStudy.caseStudyContent || DEFAULT_CASE_STUDY_CONTENT;

          const updateCS = (partial: Partial<CaseStudyContent>) => {
            setConfig({
              ...config,
              featuredCaseStudy: {
                ...config.featuredCaseStudy,
                caseStudyContent: { ...csContent, ...partial },
              },
            });
          };

          return (
            <div className="bg-[#0e131f] border border-white/10 rounded-xl p-6 space-y-8">
              <h2 className="text-lg font-bold text-[#38f2ff] font-mono flex items-center justify-between">
                <span>Case Study Content Editor</span>
                <span className="text-xs text-gray-400 font-normal">
                  All fields appear on /projects/case-study
                </span>
              </h2>

              {/* ── Hero Image ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                <label className="block text-xs font-mono text-[#38f2ff] font-bold">
                  Hero Banner Image
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono text-gray-400 mb-1">Upload Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          try {
                            const url = await uploadCaseStudyImage(file, "hero");
                            updateCS({ heroImage: url });
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                        disabled={uploadingImage}
                        className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-gray-400 mb-1">Or Paste URL</label>
                      <input
                        type="text"
                        value={csContent.heroImage}
                        onChange={(e) => updateCS({ heroImage: e.target.value })}
                        className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                  </div>
                  {csContent.heroImage && (
                    <div className="relative h-[140px] rounded-xl overflow-hidden border border-white/10">
                      <Image src={csContent.heroImage} alt="Hero preview" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Challenge ── */}
              <div>
                <label className="block text-xs font-mono text-[#38f2ff] font-bold mb-2">The Challenge (Problem Statement)</label>
                <textarea
                  rows={4}
                  value={csContent.challenge}
                  onChange={(e) => updateCS({ challenge: e.target.value })}
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              {/* ── Approach ── */}
              <div>
                <label className="block text-xs font-mono text-[#38f2ff] font-bold mb-2">The Approach (Architecture & Design Philosophy)</label>
                <textarea
                  rows={5}
                  value={csContent.approach}
                  onChange={(e) => updateCS({ approach: e.target.value })}
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                />
              </div>

              {/* ── Architecture Diagram ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                <label className="block text-xs font-mono text-[#38f2ff] font-bold">Architecture Diagram</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingImage(true);
                        try {
                          const url = await uploadCaseStudyImage(file, "diagram");
                          updateCS({ architectureDiagram: url });
                        } finally {
                          setUploadingImage(false);
                        }
                      }}
                      disabled={uploadingImage}
                      className="w-full text-xs text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-mono file:bg-[#38f2ff] file:text-black hover:file:bg-[#00dbe8] file:cursor-pointer"
                    />
                    <input
                      type="text"
                      placeholder="Or paste URL..."
                      value={csContent.architectureDiagram}
                      onChange={(e) => updateCS({ architectureDiagram: e.target.value })}
                      className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                  {csContent.architectureDiagram && (
                    <div className="relative h-[120px] rounded-xl overflow-hidden border border-white/10">
                      <Image src={csContent.architectureDiagram} alt="Diagram preview" fill className="object-cover" unoptimized />
                    </div>
                  )}
                </div>
              </div>

              {/* ── Key Features (Dynamic List) ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#38f2ff] font-bold">Key Features</label>
                  <button
                    type="button"
                    onClick={() => {
                      updateCS({
                        keyFeatures: [
                          ...csContent.keyFeatures,
                          { title: "", description: "", image: "" },
                        ],
                      });
                    }}
                    className="px-3 py-1 text-xs font-mono bg-[#38f2ff]/20 text-[#38f2ff] rounded hover:bg-[#38f2ff]/30 transition"
                  >
                    + Add Feature
                  </button>
                </div>

                {csContent.keyFeatures.map((feat, idx) => (
                  <div key={idx} className="bg-[#080e1a] border border-white/10 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-gray-400">Feature {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...csContent.keyFeatures];
                          updated.splice(idx, 1);
                          updateCS({ keyFeatures: updated });
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Feature Title"
                      value={feat.title}
                      onChange={(e) => {
                        const updated = [...csContent.keyFeatures];
                        updated[idx] = { ...updated[idx], title: e.target.value };
                        updateCS({ keyFeatures: updated });
                      }}
                      className="w-full bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                    <textarea
                      rows={2}
                      placeholder="Feature Description"
                      value={feat.description}
                      onChange={(e) => {
                        const updated = [...csContent.keyFeatures];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        updateCS({ keyFeatures: updated });
                      }}
                      className="w-full bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Image URL (optional)"
                      value={feat.image || ""}
                      onChange={(e) => {
                        const updated = [...csContent.keyFeatures];
                        updated[idx] = { ...updated[idx], image: e.target.value };
                        updateCS({ keyFeatures: updated });
                      }}
                      className="w-full bg-[#161c28] border border-white/10 rounded p-2.5 text-xs text-gray-300 focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* ── Results & Metrics (Dynamic List) ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#38f2ff] font-bold">Results & Impact Metrics</label>
                  <button
                    type="button"
                    onClick={() => {
                      updateCS({
                        results: [
                          ...csContent.results,
                          { metric: "", value: "", description: "" },
                        ],
                      });
                    }}
                    className="px-3 py-1 text-xs font-mono bg-[#38f2ff]/20 text-[#38f2ff] rounded hover:bg-[#38f2ff]/30 transition"
                  >
                    + Add Metric
                  </button>
                </div>

                {csContent.results.map((res, idx) => (
                  <div key={idx} className="bg-[#080e1a] border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-gray-400">Metric {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...csContent.results];
                          updated.splice(idx, 1);
                          updateCS({ results: updated });
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Metric Name (e.g. Response Latency)"
                        value={res.metric}
                        onChange={(e) => {
                          const updated = [...csContent.results];
                          updated[idx] = { ...updated[idx], metric: e.target.value };
                          updateCS({ results: updated });
                        }}
                        className="bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. <200ms)"
                        value={res.value}
                        onChange={(e) => {
                          const updated = [...csContent.results];
                          updated[idx] = { ...updated[idx], value: e.target.value };
                          updateCS({ results: updated });
                        }}
                        className="bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Short description"
                      value={res.description}
                      onChange={(e) => {
                        const updated = [...csContent.results];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        updateCS({ results: updated });
                      }}
                      className="w-full mt-3 bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-gray-300 focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* ── Development Timeline (Dynamic List) ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#38f2ff] font-bold">Development Timeline</label>
                  <button
                    type="button"
                    onClick={() => {
                      updateCS({
                        timeline: [
                          ...csContent.timeline,
                          { phase: `Phase ${csContent.timeline.length + 1}`, title: "", description: "" },
                        ],
                      });
                    }}
                    className="px-3 py-1 text-xs font-mono bg-[#38f2ff]/20 text-[#38f2ff] rounded hover:bg-[#38f2ff]/30 transition"
                  >
                    + Add Phase
                  </button>
                </div>

                {csContent.timeline.map((phase, idx) => (
                  <div key={idx} className="bg-[#080e1a] border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-gray-400">{phase.phase}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...csContent.timeline];
                          updated.splice(idx, 1);
                          updateCS({ timeline: updated });
                        }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Phase (e.g. Phase 1)"
                        value={phase.phase}
                        onChange={(e) => {
                          const updated = [...csContent.timeline];
                          updated[idx] = { ...updated[idx], phase: e.target.value };
                          updateCS({ timeline: updated });
                        }}
                        className="bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={phase.title}
                        onChange={(e) => {
                          const updated = [...csContent.timeline];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          updateCS({ timeline: updated });
                        }}
                        className="bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Phase description"
                      value={phase.description}
                      onChange={(e) => {
                        const updated = [...csContent.timeline];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        updateCS({ timeline: updated });
                      }}
                      className="w-full bg-[#161c28] border border-white/10 rounded p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* ── Technical Deep-Dive ── */}
              <div>
                <label className="block text-xs font-mono text-[#38f2ff] font-bold mb-2">Technical Deep-Dive</label>
                <textarea
                  rows={8}
                  value={csContent.technicalDeepDive}
                  onChange={(e) => updateCS({ technicalDeepDive: e.target.value })}
                  className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1 font-mono">
                  Detailed technical narrative about the project&apos;s architecture and implementation.
                </p>
              </div>

              {/* ── Gallery (Dynamic URL List) ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-[#38f2ff] font-bold">Gallery Screenshots</label>
                  <button
                    type="button"
                    onClick={() => {
                      updateCS({ gallery: [...csContent.gallery, ""] });
                    }}
                    className="px-3 py-1 text-xs font-mono bg-[#38f2ff]/20 text-[#38f2ff] rounded hover:bg-[#38f2ff]/30 transition"
                  >
                    + Add Image
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {csContent.gallery.map((url, idx) => (
                    <div key={idx} className="bg-[#080e1a] border border-white/10 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-gray-500">Image {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...csContent.gallery];
                            updated.splice(idx, 1);
                            updateCS({ gallery: updated });
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          ✕
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={url}
                        onChange={(e) => {
                          const updated = [...csContent.gallery];
                          updated[idx] = e.target.value;
                          updateCS({ gallery: updated });
                        }}
                        className="w-full bg-[#161c28] border border-white/10 rounded p-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          try {
                            const uploadedUrl = await uploadCaseStudyImage(file, `gallery_${idx}`);
                            const updated = [...csContent.gallery];
                            updated[idx] = uploadedUrl;
                            updateCS({ gallery: updated });
                          } finally {
                            setUploadingImage(false);
                          }
                        }}
                        disabled={uploadingImage}
                        className="w-full text-[10px] text-gray-400 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-mono file:bg-[#38f2ff]/20 file:text-[#38f2ff] file:cursor-pointer"
                      />
                      {url && (
                        <div className="relative h-[80px] rounded overflow-hidden border border-white/10">
                          <Image src={url} alt={`Gallery ${idx + 1}`} fill className="object-cover" unoptimized />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Testimonial ── */}
              <div className="p-5 rounded-xl bg-[#161c28] border border-white/10 space-y-3">
                <label className="block text-xs font-mono text-[#38f2ff] font-bold">Testimonial / Endorsement</label>
                <textarea
                  rows={3}
                  placeholder="Quote text"
                  value={csContent.testimonial?.quote || ""}
                  onChange={(e) => {
                    updateCS({
                      testimonial: { ...csContent.testimonial, quote: e.target.value },
                    });
                  }}
                  className="w-full bg-[#080e1a] border border-white/10 rounded-lg p-3 text-sm text-white italic focus:border-[#38f2ff] focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Author name"
                    value={csContent.testimonial?.author || ""}
                    onChange={(e) => {
                      updateCS({
                        testimonial: { ...csContent.testimonial, author: e.target.value },
                      });
                    }}
                    className="bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Role / Company"
                    value={csContent.testimonial?.role || ""}
                    onChange={(e) => {
                      updateCS({
                        testimonial: { ...csContent.testimonial, role: e.target.value },
                      });
                    }}
                    className="bg-[#080e1a] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>

              {/* ── CTA (Call to Action) ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono text-[#38f2ff] font-bold mb-2">CTA Title</label>
                  <input
                    type="text"
                    value={csContent.ctaTitle}
                    onChange={(e) => updateCS({ ctaTitle: e.target.value })}
                    className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-[#38f2ff] font-bold mb-2">CTA Description</label>
                  <input
                    type="text"
                    value={csContent.ctaDescription}
                    onChange={(e) => updateCS({ ctaDescription: e.target.value })}
                    className="w-full bg-[#161c28] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-[#38f2ff] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })()}

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
              "Save Archive Changes"
            )}
          </button>
        </div>
      </main>
    </AdminLayout>
  );
}
