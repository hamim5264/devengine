import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import {
  adminFetchAllMarketplace,
  adminSaveDesign,
  adminDeleteDesign,
  adminSaveCategory,
  adminDeleteCategory,
  adminUpdateOrder,
  adminUpdateReviewStatus,
  adminAddManualReview,
  adminSeedDefaults,
  adminSaveSettings,
} from "@/lib/services/marketplaceService";
import type {
  LandingDesign,
  DesignCategory,
  MarketplaceOrder,
  DesignReview,
  MarketplaceSettings,
} from "@/types/marketplace";
import { DEFAULT_MARKETPLACE_SETTINGS } from "@/types/marketplace";

type ActiveTab = "designs" | "categories" | "orders" | "reviews" | "analytics" | "settings";

const INITIAL_DESIGN: Partial<LandingDesign> = {
  title: "",
  slug: "",
  shortDescription: "",
  fullDescription: "",
  category: "saas",
  categoryName: "SaaS",
  tags: [],
  price: 4900,
  originalPrice: 6900,
  discountPercent: 29,
  currency: "BDT",
  isFree: false,
  thumbnailUrl: "",
  previewImages: [],
  desktopScreenshot: "",
  tabletScreenshot: "",
  mobileScreenshot: "",
  videoUrl: "",
  liveDemoUrl: "",
  deliveryType: "download_link",
  deliveryFileUrl: "",
  whatsIncluded: [
    "Full Responsive Code (Next.js & React)",
    "Framer Motion Smooth Animations",
    "Figma Design System & Components",
    "Commercial Lifetime License",
    "Free Updates & Documentation",
  ],
  technologies: ["Next.js", "React", "Tailwind CSS", "Framer Motion", "TypeScript"],
  license: "Commercial Lifetime License · Single/Unlimited End Products",
  isFeatured: false,
  isPopular: false,
  isTrending: false,
  displayOrder: 0,
  status: "published",
  salesCount: 0,
  favoritesCount: 0,
  rating: 5.0,
  reviewCount: 0,
  viewsCount: 0,
  seoTitle: "",
  seoDescription: "",
};

export default function LandingPageDesignsAdmin() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ActiveTab>("designs");

  // Data states
  const [designs, setDesigns] = useState<LandingDesign[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);
  const [settings, setSettings] = useState<MarketplaceSettings>(DEFAULT_MARKETPLACE_SETTINGS);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");

  // Modal / Form states
  const [isDesignModalOpen, setIsDesignModalOpen] = useState(false);
  const [editingDesign, setEditingDesign] = useState<Partial<LandingDesign>>(INITIAL_DESIGN);
  const [newTagInput, setNewTagInput] = useState("");
  const [newIncludedInput, setNewIncludedInput] = useState("");
  const [newTechInput, setNewTechInput] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<DesignCategory>>({
    name: "",
    slug: "",
    description: "",
    icon: "dashboard",
    displayOrder: 0,
    isActive: true,
  });

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [saving, setSaving] = useState(false);

  // Manual Review Form State
  const [isManualReviewModalOpen, setIsManualReviewModalOpen] = useState(false);
  const [manualReviewDesignId, setManualReviewDesignId] = useState("");
  const [manualReviewName, setManualReviewName] = useState("");
  const [manualReviewEmail, setManualReviewEmail] = useState("");
  const [manualReviewRating, setManualReviewRating] = useState(5);
  const [manualReviewComment, setManualReviewComment] = useState("");
  const [manualReviewVerified, setManualReviewVerified] = useState(true);
  const [manualReviewDate, setManualReviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingManualReview, setSubmittingManualReview] = useState(false);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const handleSeedDefaults = async () => {
    setLoading(true);
    try {
      await adminSeedDefaults();
      await loadData();
      showNotification("Showcase designs seeded and stored in Firestore database!");
    } catch (err: any) {
      showNotification(err.message || "Failed to seed default designs.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManualReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReviewDesignId) {
      showNotification("Please select a design to review.", "error");
      return;
    }
    if (!manualReviewName.trim() || !manualReviewComment.trim()) {
      showNotification("Reviewer name and comment are required.", "error");
      return;
    }
    const targetDesign = designs.find((d) => d.id === manualReviewDesignId);
    setSubmittingManualReview(true);
    try {
      const res = await adminAddManualReview({
        designId: manualReviewDesignId,
        designTitle: targetDesign?.title || "Landing Page Design",
        customerName: manualReviewName.trim(),
        customerEmail: manualReviewEmail.trim() || "customer@verified.io",
        rating: manualReviewRating,
        comment: manualReviewComment.trim(),
        isVerifiedPurchase: manualReviewVerified,
        createdAt: new Date(manualReviewDate).toISOString(),
        status: "approved",
      });
      setReviews((prev) => [res.review, ...prev]);
      setIsManualReviewModalOpen(false);
      setManualReviewName("");
      setManualReviewEmail("");
      setManualReviewComment("");
      showNotification("Manual review added successfully!");
    } catch (err: any) {
      showNotification(err.message || "Failed to add review.", "error");
    } finally {
      setSubmittingManualReview(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminFetchAllMarketplace();
      setDesigns(res.designs || []);
      setCategories(res.categories || []);
      setOrders(res.orders || []);
      setReviews(res.reviews || []);
      if (res.settings) {
        setSettings({ ...DEFAULT_MARKETPLACE_SETTINGS, ...res.settings });
      }
    } catch (err: any) {
      showNotification(err.message || "Failed to load marketplace data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onAdminPageAccess(
      router,
      () => setReady(true),
      () => setReady(false)
    );
  }, [router]);

  useEffect(() => {
    if (ready) {
      void loadData();
    }
  }, [ready]);

  // Filtered designs
  const filteredDesigns = useMemo(() => {
    return designs.filter((d) => {
      const matchSearch =
        !searchQuery ||
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCat = selectedCatFilter === "all" || d.category === selectedCatFilter;
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      return matchSearch && matchCat && matchStatus;
    });
  }, [designs, searchQuery, selectedCatFilter, statusFilter]);

  // Analytics calculated from real data
  const realAnalytics = useMemo(() => {
    const published = designs.filter((d) => d.status === "published");
    const drafts = designs.filter((d) => d.status === "draft");
    const verifiedOrders = orders.filter((o) => o.status === "Verified");
    const grossSales = verifiedOrders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
    const avgOrderVal = verifiedOrders.length ? Math.round(grossSales / verifiedOrders.length) : 0;
    const uniqueCustomers = new Set(orders.map((o) => o.customerEmail).filter(Boolean)).size;

    const approvedReviews = reviews.filter((r) => r.status === "approved");
    const avgRating = approvedReviews.length
      ? (approvedReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / approvedReviews.length).toFixed(1)
      : "5.0";

    const topSelling = [...designs]
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 5);

    return {
      totalDesigns: designs.length,
      publishedCount: published.length,
      draftCount: drafts.length,
      totalOrders: orders.length,
      verifiedCount: verifiedOrders.length,
      grossSales,
      avgOrderVal,
      uniqueCustomers,
      avgRating,
      reviewsCount: approvedReviews.length,
      topSelling,
    };
  }, [designs, orders, reviews]);

  // ── SAVE DESIGN ──
  const handleSaveDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesign.title || !editingDesign.slug) {
      showNotification("Title and Slug are required.", "error");
      return;
    }
    setSaving(true);
    try {
      const catObj = categories.find((c) => c.slug === editingDesign.category);
      const payload: Partial<LandingDesign> = {
        ...editingDesign,
        categoryName: catObj ? catObj.name : editingDesign.categoryName || "SaaS",
        price: Number(editingDesign.price) || 0,
        originalPrice: Number(editingDesign.originalPrice) || Number(editingDesign.price) || 0,
        displayOrder: Number(editingDesign.displayOrder) || 0,
      };

      await adminSaveDesign(payload);
      showNotification(`Design "${payload.title}" saved successfully!`);
      setIsDesignModalOpen(false);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to save design.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── DUPLICATE DESIGN ──
  const handleDuplicate = async (design: LandingDesign) => {
    try {
      const copy: Partial<LandingDesign> = {
        ...design,
        id: undefined,
        title: `${design.title} (Copy)`,
        slug: `${design.slug}-copy-${Math.floor(1000 + Math.random() * 9000)}`,
        status: "draft",
        salesCount: 0,
        viewsCount: 0,
        favoritesCount: 0,
        rating: 5.0,
        reviewCount: 0,
      };
      await adminSaveDesign(copy);
      showNotification(`Duplicated design as draft.`);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to duplicate design.", "error");
    }
  };

  // ── DELETE DESIGN ──
  const handleDeleteDesign = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      await adminDeleteDesign(id);
      showNotification(`Deleted "${title}".`);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to delete design.", "error");
    }
  };

  // ── SAVE CATEGORY ──
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory.name || !editingCategory.slug) {
      showNotification("Name and slug are required for category.", "error");
      return;
    }
    setSaving(true);
    try {
      await adminSaveCategory({
        ...editingCategory,
        displayOrder: Number(editingCategory.displayOrder) || 0,
      });
      showNotification(`Category "${editingCategory.name}" saved!`);
      setIsCategoryModalOpen(false);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to save category.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── DELETE CATEGORY ──
  const handleDeleteCategory = async (id: string, slug: string, name: string) => {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    try {
      await adminDeleteCategory(id, slug);
      showNotification(`Category "${name}" deleted.`);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to delete category.", "error");
    }
  };

  // ── UPDATE ORDER STATUS ──
  const handleUpdateOrderStatus = async (
    orderId: string,
    status: "Verified" | "Rejected" | "Pending Verification"
  ) => {
    try {
      await adminUpdateOrder(orderId, status, status === "Verified" ? "Delivered" : "Pending");
      showNotification(`Order ${orderId} marked as ${status}.`);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to update order status.", "error");
    }
  };

  // ── UPDATE REVIEW STATUS ──
  const handleUpdateReviewStatus = async (id: string, status: "approved" | "hidden" | "deleted") => {
    try {
      await adminUpdateReviewStatus(id, status);
      showNotification(`Review ${status}.`);
      void loadData();
    } catch (err: any) {
      showNotification(err.message || "Failed to update review.", "error");
    }
  };

  // ── SAVE SETTINGS ──
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveSettings({
        ...settings,
        itemsPerPage: Number(settings.itemsPerPage) || 12,
      });
      showNotification("Marketplace settings updated successfully!");
    } catch (err: any) {
      showNotification(err.message || "Failed to update settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── IMAGE & VIDEO UPLOAD HELPER ──
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "thumbnailUrl" | "desktopScreenshot" | "tabletScreenshot" | "mobileScreenshot" | "gallery" | "videoUrl" | "howItWorksVideo"
  ) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    setUploadingImage(true);
    try {
      if (field === "howItWorksVideo") {
        const url = await uploadStorageAsset(files[0], "marketplace/walkthrough", "how_it_works", 100 * 1024 * 1024);
        setSettings((prev) => ({ ...prev, howItWorksVideoUrl: url }));
        showNotification("How It Works video uploaded to Firebase Storage!");
      } else if (field === "gallery") {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await uploadStorageAsset(files[i], "marketplace/designs", `gallery_${i}`);
          uploadedUrls.push(url);
        }
        setEditingDesign((prev) => ({
          ...prev,
          previewImages: [...(prev.previewImages || []), ...uploadedUrls],
        }));
        showNotification(`${uploadedUrls.length} screenshot(s) uploaded!`);
      } else if (field === "videoUrl") {
        const url = await uploadStorageAsset(files[0], "marketplace/videos", "motion_preview", 50 * 1024 * 1024);
        setEditingDesign((prev) => ({ ...prev, videoUrl: url }));
        showNotification("Motion video uploaded to Firebase Storage!");
      } else {
        const url = await uploadStorageAsset(files[0], "marketplace/designs", field);
        setEditingDesign((prev) => ({ ...prev, [field]: url }));
        showNotification("Image uploaded to Firebase Storage!");
      }
    } catch (err: any) {
      showNotification(err.message || "Upload failed.", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#02040a]">
        <div className="flex flex-col items-center gap-3">
          <HelixLoader size={48} color="#2cecf7" />
          <p className="text-xs uppercase tracking-widest text-[#2cecf7]">Loading Marketplace Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Landing Page Marketplace | DevEngine Admin">
      <Head>
        <title>Landing Page Marketplace | DevEngine Admin</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[var(--devengine-text)]">
        {/* TOP HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--devengine-border)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[#2cecf7] text-lg">storefront</span>
              <span className="text-xs font-mono uppercase tracking-wider text-[#2cecf7]">
                Commerce & Digital Designs
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Landing Page Marketplace</h1>
            <p className="text-sm text-[var(--devengine-muted)] mt-1">
              Full control over published landing page designs, orders, category taxonomies, reviews, and analytics.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href="/landing-page-designs"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-[#2cecf7]/30 text-[#2cecf7] hover:bg-[#2cecf7]/10 transition-colors"
            >
              <span>View Public Marketplace</span>
              <span className="material-symbols-outlined text-sm">open_in_new</span>
            </Link>

            <button
              type="button"
              onClick={handleSeedDefaults}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
              title="Populate/restore 4 showcase templates in Firestore database"
            >
              <span className="material-symbols-outlined text-sm">database</span>
              <span>Seed Showcase Data</span>
            </button>

            <button
              onClick={() => {
                setEditingDesign(INITIAL_DESIGN);
                setIsDesignModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a] hover:bg-[#2cecf7]/90 transition-all shadow-[0_0_20px_rgba(44,236,247,0.25)]"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>Create New Design</span>
            </button>
          </div>
        </div>

        {/* NOTIFICATION TOAST */}
        {notification && (
          <div
            className={`mt-4 p-4 rounded-xl border text-sm flex items-center justify-between animate-fadeIn ${
              notification.type === "success"
                ? "bg-[#2cecf7]/10 border-[#2cecf7]/40 text-[#2cecf7]"
                : "bg-rose-500/10 border-rose-500/40 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                {notification.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{notification.message}</span>
            </div>
            <button onClick={() => setNotification(null)} className="opacity-70 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex items-center gap-2 overflow-x-auto py-5 border-b border-[var(--devengine-border)] no-scrollbar">
          {(
            [
              { key: "designs", label: "Designs Catalog", icon: "grid_view", count: designs.length },
              { key: "categories", label: "Categories", icon: "category", count: categories.length },
              { key: "orders", label: "Orders & Sales", icon: "shopping_bag", count: orders.length },
              { key: "reviews", label: "Reviews", icon: "rate_review", count: reviews.length },
              { key: "analytics", label: "Real Analytics", icon: "query_stats" },
              { key: "settings", label: "Marketplace Settings", icon: "tune" },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                tab === item.key
                  ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7] shadow-[0_0_15px_rgba(44,236,247,0.2)]"
                  : "border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:border-[#2cecf7]/30"
              }`}
            >
              <span className="material-symbols-outlined text-base">{item.icon}</span>
              <span>{item.label}</span>
              {"count" in item && (
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                    tab === item.key ? "bg-[#02040a]/20 text-[#02040a]" : "bg-[var(--devengine-raised)] text-[var(--devengine-text)]"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ════════════════════ TAB 1: DESIGNS CATALOG ════════════════════ */}
        {tab === "designs" && (
          <div className="py-6 space-y-6">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[var(--devengine-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search design title, slug, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedCatFilter}
                  onChange={(e) => setSelectedCatFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                >
                  <option value="all">All Categories ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Designs Table / Grid */}
            {filteredDesigns.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--devengine-border)]">
                <span className="material-symbols-outlined text-4xl text-[var(--devengine-muted)] mb-2">
                  folder_off
                </span>
                <h3 className="text-base font-semibold">No Landing Page Designs Found</h3>
                <p className="text-xs text-[var(--devengine-muted)] mt-1 max-w-sm mx-auto">
                  {searchQuery || selectedCatFilter !== "all"
                    ? "Try adjusting your filters or search keywords."
                    : "Create your first landing page design to start selling in the marketplace."}
                </p>
                <button
                  onClick={() => {
                    setEditingDesign(INITIAL_DESIGN);
                    setIsDesignModalOpen(true);
                  }}
                  className="mt-4 px-4 py-2 bg-[#2cecf7] text-[#02040a] font-bold text-xs rounded-xl"
                >
                  + Add First Design
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--devengine-border)] bg-[var(--devengine-raised)] text-[var(--devengine-muted)] font-mono uppercase tracking-wider">
                      <th className="py-3.5 px-4">Design</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Price</th>
                      <th className="py-3.5 px-4">Badges</th>
                      <th className="py-3.5 px-4">Sales & Rating</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--devengine-border)]">
                    {filteredDesigns.map((design) => (
                      <tr key={design.id} className="hover:bg-[var(--devengine-raised)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-10 rounded-lg bg-[#040a12] border border-[var(--devengine-border)] overflow-hidden shrink-0">
                              {design.thumbnailUrl ? (
                                <img
                                  src={design.thumbnailUrl}
                                  alt={design.title}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[var(--devengine-muted)]">
                                  <span className="material-symbols-outlined text-base">image</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/landing-page-designs/${design.slug}`}
                                target="_blank"
                                className="font-semibold text-sm hover:text-[#2cecf7] transition-colors block"
                              >
                                {design.title}
                              </Link>
                              <span className="text-[11px] font-mono text-[var(--devengine-muted)]">
                                /{design.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-[var(--devengine-raised)] border border-[var(--devengine-border)] font-medium text-[11px]">
                            {design.categoryName || design.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {design.isFree ? (
                            <span className="text-emerald-400 font-bold">FREE</span>
                          ) : (
                            <div>
                              <span className="font-bold text-sm text-[#2cecf7]">
                                {design.currency === "BDT" ? "৳" : "$"}
                                {design.price}
                              </span>
                              {design.originalPrice && design.originalPrice > design.price && (
                                <span className="ml-1.5 text-[11px] line-through text-[var(--devengine-muted)]">
                                  {design.currency === "BDT" ? "৳" : "$"}
                                  {design.originalPrice}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1 flex-wrap">
                            {design.isFeatured && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30">
                                Featured
                              </span>
                            )}
                            {design.isPopular && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                Popular
                              </span>
                            )}
                            {design.isTrending && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                Trending
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[var(--devengine-text)]">
                              <span className="material-symbols-outlined text-amber-400 text-sm">star</span>
                              <span className="font-semibold">{design.rating || 5.0}</span>
                              <span className="text-[var(--devengine-muted)]">({design.reviewCount || 0})</span>
                            </span>
                            <span className="text-[var(--devengine-muted)]">·</span>
                            <span className="font-semibold">{design.salesCount || 0} sales</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold capitalize ${
                              design.status === "published"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : design.status === "draft"
                                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"
                            }`}
                          >
                            {design.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingDesign(design);
                                setIsDesignModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-[var(--devengine-border)] hover:border-[#2cecf7] text-[var(--devengine-muted)] hover:text-[#2cecf7] transition-colors"
                              title="Edit design"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>

                            <button
                              onClick={() => void handleDuplicate(design)}
                              className="p-1.5 rounded-lg border border-[var(--devengine-border)] hover:border-[#2cecf7] text-[var(--devengine-muted)] hover:text-[#2cecf7] transition-colors"
                              title="Duplicate design"
                            >
                              <span className="material-symbols-outlined text-base">content_copy</span>
                            </button>

                            <button
                              onClick={() => void handleDeleteDesign(design.id, design.title)}
                              className="p-1.5 rounded-lg border border-[var(--devengine-border)] hover:border-rose-500 text-[var(--devengine-muted)] hover:text-rose-400 transition-colors"
                              title="Delete design"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ TAB 2: CATEGORIES ════════════════════ */}
        {tab === "categories" && (
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Design Categories</h2>
                <p className="text-xs text-[var(--devengine-muted)]">
                  Categories dynamically categorize designs across public marketplace filters.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory({
                    name: "",
                    slug: "",
                    description: "",
                    icon: "category",
                    displayOrder: categories.length + 1,
                    isActive: true,
                  });
                  setIsCategoryModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a]"
              >
                + Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7]">
                        <span className="material-symbols-outlined">{cat.icon || "category"}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cat.isActive
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : "bg-neutral-500/15 text-neutral-400"
                        }`}
                      >
                        {cat.isActive ? "Active" : "Hidden"}
                      </span>
                    </div>

                    <h3 className="font-bold text-base">{cat.name}</h3>
                    <p className="text-xs font-mono text-[var(--devengine-muted)]">slug: {cat.slug}</p>
                    {cat.description && (
                      <p className="text-xs text-[var(--devengine-muted)] mt-2 line-clamp-2">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-[var(--devengine-border)] flex items-center justify-between text-xs">
                    <span className="text-[var(--devengine-muted)]">Order: {cat.displayOrder || 0}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setIsCategoryModalOpen(true);
                        }}
                        className="text-[#2cecf7] hover:underline font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDeleteCategory(cat.id, cat.slug, cat.name)}
                        className="text-rose-400 hover:underline font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 3: ORDERS & SALES ════════════════════ */}
        {tab === "orders" && (
          <div className="py-6 space-y-6">
            <div>
              <h2 className="text-xl font-bold">Orders & Payment Verification</h2>
              <p className="text-xs text-[var(--devengine-muted)]">
                Verify customer transactions (bKash, Nagad, Bank, etc.). Verifying an order unlocks the digital download for the customer.
              </p>
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--devengine-border)]">
                <span className="material-symbols-outlined text-4xl text-[var(--devengine-muted)] mb-2">
                  receipt_long
                </span>
                <h3 className="text-base font-semibold">No Orders Yet</h3>
                <p className="text-xs text-[var(--devengine-muted)] mt-1">
                  Customer orders will automatically appear here once initiated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--devengine-border)] bg-[var(--devengine-raised)] text-[var(--devengine-muted)] font-mono uppercase tracking-wider">
                      <th className="py-3.5 px-4">Order ID & Date</th>
                      <th className="py-3.5 px-4">Customer</th>
                      <th className="py-3.5 px-4">Design</th>
                      <th className="py-3.5 px-4">Payment</th>
                      <th className="py-3.5 px-4">Trx ID / Account</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--devengine-border)]">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-[var(--devengine-raised)]/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-[#2cecf7] block">{order.id}</span>
                          <span className="text-[11px] text-[var(--devengine-muted)]">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <strong className="block">{order.customerName}</strong>
                          <span className="text-[11px] text-[var(--devengine-muted)] block">{order.customerEmail}</span>
                          <span className="text-[11px] font-mono text-[var(--devengine-muted)]">{order.customerPhone}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-medium block">{order.designTitle}</span>
                          <span className="font-bold text-[#2cecf7]">
                            {order.currency === "BDT" ? "৳" : "$"}
                            {order.amount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-[var(--devengine-raised)] border border-[var(--devengine-border)] font-medium">
                            {order.paymentMethod}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono font-semibold block text-[var(--devengine-text)]">
                            {order.transactionId || "—"}
                          </span>
                          {order.senderNumberOrAccount && (
                            <span className="text-[11px] text-[var(--devengine-muted)]">
                              From: {order.senderNumberOrAccount}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              order.status === "Verified"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : order.status === "Rejected"
                                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {order.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status !== "Verified" && (
                              <button
                                onClick={() => void handleUpdateOrderStatus(order.id, "Verified")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 font-semibold transition-colors"
                              >
                                Verify & Deliver
                              </button>
                            )}

                            {order.status !== "Rejected" && (
                              <button
                                onClick={() => void handleUpdateOrderStatus(order.id, "Rejected")}
                                className="px-3 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold transition-colors"
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ TAB 4: REVIEWS ════════════════════ */}
        {tab === "reviews" && (
          <div className="py-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Review Moderation & Social Proof</h2>
                <p className="text-xs text-[var(--devengine-muted)]">
                  Approve, hide, or manually add authentic customer reviews and ratings for templates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (designs.length > 0 && !manualReviewDesignId) {
                    setManualReviewDesignId(designs[0].id);
                  }
                  setIsManualReviewModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(44,236,247,0.3)] hover:bg-[#2cecf7]/90 transition-all self-start sm:self-auto cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-black">rate_review</span>
                <span>Add Manual Review</span>
              </button>
            </div>

            {reviews.length === 0 ? (
              <div className="py-16 text-center rounded-2xl border border-dashed border-[var(--devengine-border)]">
                <span className="material-symbols-outlined text-4xl text-[var(--devengine-muted)] mb-2">
                  rate_review
                </span>
                <h3 className="text-base font-semibold">No Reviews Submitted</h3>
                <p className="text-xs text-[var(--devengine-muted)] mt-1">
                  Reviews from verified purchasers will appear here for moderation.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <strong className="text-sm">{rev.customerName}</strong>
                        <span className="text-xs text-[var(--devengine-muted)]">
                          on <em>{rev.designTitle}</em>
                        </span>
                        <div className="flex text-amber-400 text-xs ml-2">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(5 - rev.rating)}
                        </div>
                      </div>
                      <p className="text-xs text-[var(--devengine-text)] mt-1">{rev.comment}</p>
                      <span className="text-[10px] text-[var(--devengine-muted)] mt-1 block">
                        {new Date(rev.createdAt).toLocaleString()} · status:{" "}
                        <span className="font-semibold text-[#2cecf7]">{rev.status}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {rev.status !== "approved" && (
                        <button
                          onClick={() => void handleUpdateReviewStatus(rev.id, "approved")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-semibold"
                        >
                          Approve
                        </button>
                      )}
                      {rev.status !== "hidden" && (
                        <button
                          onClick={() => void handleUpdateReviewStatus(rev.id, "hidden")}
                          className="px-3 py-1.5 rounded-lg border border-[var(--devengine-border)] text-xs font-semibold"
                        >
                          Hide
                        </button>
                      )}
                      <button
                        onClick={() => void handleUpdateReviewStatus(rev.id, "deleted")}
                        className="px-3 py-1.5 rounded-lg border border-rose-500/30 text-rose-400 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ TAB 5: REAL ANALYTICS ════════════════════ */}
        {tab === "analytics" && (
          <div className="py-6 space-y-8">
            <div>
              <h2 className="text-xl font-bold">Marketplace Analytics</h2>
              <p className="text-xs text-[var(--devengine-muted)]">
                Calculated strictly from live Firebase orders, designs, and reviews. No synthetic or simulated metrics.
              </p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <span className="text-xs text-[var(--devengine-muted)] font-mono uppercase">Total Designs</span>
                <div className="text-3xl font-extrabold text-[var(--devengine-text)] mt-2">
                  {realAnalytics.totalDesigns}
                </div>
                <div className="text-[11px] text-[var(--devengine-muted)] mt-1">
                  {realAnalytics.publishedCount} published · {realAnalytics.draftCount} drafts
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <span className="text-xs text-[var(--devengine-muted)] font-mono uppercase">Completed Sales</span>
                <div className="text-3xl font-extrabold text-[#2cecf7] mt-2">
                  {realAnalytics.verifiedCount}
                </div>
                <div className="text-[11px] text-[var(--devengine-muted)] mt-1">
                  from {realAnalytics.totalOrders} total orders
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <span className="text-xs text-[var(--devengine-muted)] font-mono uppercase">Gross Revenue</span>
                <div className="text-3xl font-extrabold text-[var(--devengine-text)] mt-2">
                  ${realAnalytics.grossSales}
                </div>
                <div className="text-[11px] text-[var(--devengine-muted)] mt-1">
                  Avg order value: ${realAnalytics.avgOrderVal}
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
                <span className="text-xs text-[var(--devengine-muted)] font-mono uppercase">Avg Customer Rating</span>
                <div className="text-3xl font-extrabold text-amber-400 mt-2">
                  ★ {realAnalytics.avgRating}
                </div>
                <div className="text-[11px] text-[var(--devengine-muted)] mt-1">
                  Across {realAnalytics.reviewsCount} approved reviews
                </div>
              </div>
            </div>

            {/* Best Selling Designs */}
            <div className="p-6 rounded-2xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)]">
              <h3 className="text-base font-bold mb-4">Best-Selling Designs</h3>
              {realAnalytics.topSelling.length === 0 ? (
                <p className="text-xs text-[var(--devengine-muted)]">No sales recorded yet.</p>
              ) : (
                <div className="divide-y divide-[var(--devengine-border)]">
                  {realAnalytics.topSelling.map((d, index) => (
                    <div key={d.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#2cecf7]/15 text-[#2cecf7] font-bold flex items-center justify-center text-xs">
                          {index + 1}
                        </span>
                        <div>
                          <strong className="text-sm block">{d.title}</strong>
                          <span className="text-[var(--devengine-muted)]">
                            ${d.price} · {d.categoryName}
                          </span>
                        </div>
                      </div>
                      <span className="font-bold text-[#2cecf7] text-sm">{d.salesCount || 0} sales</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════ TAB 6: SETTINGS ════════════════════ */}
        {tab === "settings" && (
          <div className="py-6 max-w-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold">Marketplace Global Settings</h2>
              <p className="text-xs text-[var(--devengine-muted)]">
                Configure default currency, license defaults, and public display preferences.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Marketplace Title</label>
                <input
                  type="text"
                  value={settings.marketplaceTitle}
                  onChange={(e) => setSettings({ ...settings, marketplaceTitle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Marketplace Subtitle</label>
                <textarea
                  rows={2}
                  value={settings.marketplaceSubtitle}
                  onChange={(e) => setSettings({ ...settings, marketplaceSubtitle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Default Currency</label>
                  <select
                    value={settings.defaultCurrency}
                    onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BDT">BDT (৳)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Designs Per Page</label>
                  <input
                    type="number"
                    min={4}
                    max={48}
                    value={settings.itemsPerPage}
                    onChange={(e) => setSettings({ ...settings, itemsPerPage: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Default Commercial License Text</label>
                <textarea
                  rows={3}
                  value={settings.defaultLicense}
                  onChange={(e) => setSettings({ ...settings, defaultLicense: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              {/* 🎬 HOW IT WORKS VIDEO WALKTHROUGH SETTINGS */}
              <div className="pt-4 border-t border-[var(--devengine-border)] space-y-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2cecf7] text-lg">play_circle</span>
                  <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                    "How It Works" Pop-Up Video Configuration
                  </h3>
                </div>
                <p className="text-xs text-[var(--devengine-muted)]">
                  When visitors tap &ldquo;How It Works&rdquo; on the public landing page, a wide sheet will pop up playing this video. You can upload an MP4/WebM video or paste a YouTube URL.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">Pop-up Sheet Title</label>
                    <input
                      type="text"
                      placeholder="e.g. How DevEngine Designs Works"
                      value={settings.howItWorksTitle || ""}
                      onChange={(e) => setSettings({ ...settings, howItWorksTitle: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Walkthrough Video Source (Upload or YouTube URL)</label>
                    <div className="space-y-1.5">
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg"
                        onChange={(e) => void handleFileUpload(e, "howItWorksVideo")}
                        className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                      />
                      <input
                        type="url"
                        placeholder="Or paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                        value={settings.howItWorksVideoUrl || ""}
                        onChange={(e) => setSettings({ ...settings, howItWorksVideoUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Pop-up Sheet Subtitle / Description</label>
                  <textarea
                    rows={2}
                    placeholder="Short description under the video"
                    value={settings.howItWorksDescription || ""}
                    onChange={(e) => setSettings({ ...settings, howItWorksDescription: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>

                {settings.howItWorksVideoUrl && (
                  <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                    <span className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase block mb-2">Live Video Preview:</span>
                    <div className="aspect-video w-full max-w-md rounded-xl overflow-hidden bg-black flex items-center justify-center">
                      {settings.howItWorksVideoUrl.includes("youtube.com") || settings.howItWorksVideoUrl.includes("youtu.be") ? (
                        <iframe
                          src={
                            settings.howItWorksVideoUrl.includes("embed/")
                              ? settings.howItWorksVideoUrl
                              : settings.howItWorksVideoUrl.includes("youtu.be/")
                              ? `https://www.youtube.com/embed/${settings.howItWorksVideoUrl.split("youtu.be/")[1]?.split("?")[0]}`
                              : `https://www.youtube.com/embed/${new URLSearchParams(settings.howItWorksVideoUrl.split("?")[1] || "").get("v") || ""}`
                          }
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video src={settings.howItWorksVideoUrl} controls className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowFreeListings"
                  checked={settings.allowFreeListings}
                  onChange={(e) => setSettings({ ...settings, allowFreeListings: e.target.checked })}
                  className="rounded border-[var(--devengine-border)] text-[#2cecf7] focus:ring-0"
                />
                <label htmlFor="allowFreeListings" className="text-xs">
                  Allow Free Landing Page Listings
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a] hover:bg-[#2cecf7]/90 disabled:opacity-50"
              >
                {saving ? "Saving Settings..." : "Save Settings"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* ════════════════════ MODAL: CREATE / EDIT DESIGN ════════════════════ */}
      {isDesignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
              <div>
                <h2 className="text-xl font-bold">
                  {editingDesign.id ? "Edit Landing Page Design" : "Create New Landing Page Design"}
                </h2>
                <p className="text-xs text-[var(--devengine-muted)]">
                  Add preview screenshots, live demo links, source code deliverables, and pricing.
                </p>
              </div>
              <button
                onClick={() => setIsDesignModalOpen(false)}
                className="p-2 rounded-xl text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDesign} className="space-y-6 text-xs">
              {/* SECTION: BASIC INFO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                  1. Basic Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Design Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Liquid Brokers - Trading Landing Page"
                      value={editingDesign.title || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingDesign({
                          ...editingDesign,
                          title: val,
                          slug: editingDesign.slug || val.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">URL Slug *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. trading-landing-page-motion"
                      value={editingDesign.slug || ""}
                      onChange={(e) => setEditingDesign({ ...editingDesign, slug: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Short Description (Card Subtitle) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Brief 1-2 sentence hook for the marketplace grid card"
                    value={editingDesign.shortDescription || ""}
                    onChange={(e) => setEditingDesign({ ...editingDesign, shortDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Full Description (Detail Page Overview)</label>
                  <textarea
                    rows={4}
                    placeholder="Comprehensive overview of design inspiration, features, sections, and animations..."
                    value={editingDesign.fullDescription || ""}
                    onChange={(e) => setEditingDesign({ ...editingDesign, fullDescription: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={editingDesign.category || "saas"}
                      onChange={(e) => {
                        const slug = e.target.value;
                        const match = categories.find((c) => c.slug === slug);
                        setEditingDesign({
                          ...editingDesign,
                          category: slug,
                          categoryName: match ? match.name : slug,
                        });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Status</label>
                    <select
                      value={editingDesign.status || "published"}
                      onChange={(e) => setEditingDesign({ ...editingDesign, status: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    >
                      <option value="published">Published (Visible in marketplace)</option>
                      <option value="draft">Draft (Admin preview only)</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Tags input */}
                <div>
                  <label className="block font-semibold mb-1">Tags</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {(editingDesign.tags || []).map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-md bg-[#2cecf7]/15 text-[#2cecf7] border border-[#2cecf7]/30 flex items-center gap-1 text-[11px]"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDesign({
                              ...editingDesign,
                              tags: editingDesign.tags?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add tag and press Enter"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newTagInput.trim()) {
                            setEditingDesign({
                              ...editingDesign,
                              tags: [...(editingDesign.tags || []), newTagInput.trim().toLowerCase()],
                            });
                            setNewTagInput("");
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTagInput.trim()) {
                          setEditingDesign({
                            ...editingDesign,
                            tags: [...(editingDesign.tags || []), newTagInput.trim().toLowerCase()],
                          });
                          setNewTagInput("");
                        }
                      }}
                      className="px-4 py-2 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] hover:border-[#2cecf7] rounded-xl text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: PRICING */}
              <div className="space-y-4 pt-4 border-t border-[var(--devengine-border)]">
                <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                  2. Pricing & Commercials
                </h3>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isFreeDesign"
                    checked={editingDesign.isFree || false}
                    onChange={(e) => setEditingDesign({ ...editingDesign, isFree: e.target.checked })}
                    className="rounded border-[var(--devengine-border)] text-[#2cecf7]"
                  />
                  <label htmlFor="isFreeDesign" className="font-semibold text-xs">
                    Free Design Download (No payment required)
                  </label>
                </div>

                {!editingDesign.isFree && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">Selling Price *</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        required
                        value={editingDesign.price ?? 29}
                        onChange={(e) => setEditingDesign({ ...editingDesign, price: Number(e.target.value) })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-bold text-[#2cecf7] focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Original Price (for discount badge)</label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={editingDesign.originalPrice ?? ""}
                        onChange={(e) =>
                          setEditingDesign({
                            ...editingDesign,
                            originalPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Currency</label>
                      <select
                        value={editingDesign.currency || "USD"}
                        onChange={(e) => setEditingDesign({ ...editingDesign, currency: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="BDT">BDT (৳)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: VISUAL ASSETS & DRIBBLE SHOT SCREENSHOTS */}
              <div className="space-y-4 pt-4 border-t border-[var(--devengine-border)]">
                <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                  3. Visual Assets (Dribbble Showcase)
                </h3>

                {/* Main Thumbnail */}
                <div>
                  <label className="block font-semibold mb-1">Main Card Thumbnail Image *</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-16 rounded-xl bg-[#040a12] border border-[var(--devengine-border)] overflow-hidden shrink-0">
                      {editingDesign.thumbnailUrl ? (
                        <img
                          src={editingDesign.thumbnailUrl}
                          alt="Thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--devengine-muted)]">
                          <span className="material-symbols-outlined text-base">image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "thumbnailUrl")}
                        className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                      />
                      <input
                        type="url"
                        placeholder="Or paste external image URL directly"
                        value={editingDesign.thumbnailUrl || ""}
                        onChange={(e) => setEditingDesign({ ...editingDesign, thumbnailUrl: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop, Tablet, and Mobile Screenshots */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="block font-semibold mb-1">Desktop Device Mockup</label>
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "desktopScreenshot")}
                        className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                      />
                      <input
                        type="url"
                        placeholder="Or desktop image URL"
                        value={editingDesign.desktopScreenshot || ""}
                        onChange={(e) => setEditingDesign({ ...editingDesign, desktopScreenshot: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Tablet Device Mockup</label>
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "tabletScreenshot")}
                        className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                      />
                      <input
                        type="url"
                        placeholder="Or tablet image URL"
                        value={editingDesign.tabletScreenshot || ""}
                        onChange={(e) => setEditingDesign({ ...editingDesign, tabletScreenshot: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Mobile Device Mockup</label>
                    <div className="space-y-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => void handleFileUpload(e, "mobileScreenshot")}
                        className="text-[11px] file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                      />
                      <input
                        type="url"
                        placeholder="Or mobile image URL"
                        value={editingDesign.mobileScreenshot || ""}
                        onChange={(e) => setEditingDesign({ ...editingDesign, mobileScreenshot: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                      />
                    </div>
                  </div>
                </div>

                {/* Video / Motion Showcase */}
                <div>
                  <label className="block font-semibold mb-1">
                    🎬 Motion Video / Interactive Demo (Upload Video or YouTube Link)
                  </label>
                  <p className="text-[11px] text-[var(--devengine-muted)] mb-1.5">
                    Embed an interactive video presentation directly in the hero player. You can upload an MP4/WebM video file OR paste a YouTube watch, embed, or shorts link.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={(e) => void handleFileUpload(e, "videoUrl")}
                      className="text-xs file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2cecf7] file:text-[#02040a]"
                    />
                    <input
                      type="url"
                      placeholder="Or paste YouTube URL (e.g. https://www.youtube.com/watch?v=...)"
                      value={editingDesign.videoUrl || ""}
                      onChange={(e) => setEditingDesign({ ...editingDesign, videoUrl: e.target.value })}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>
                </div>

                {/* Long-Form Screenshots Gallery */}
                <div>
                  <label className="block font-semibold mb-1">
                    Long-Form Section Screenshots (Stacked Scroll on Details Page)
                  </label>
                  <p className="text-[11px] text-[var(--devengine-muted)] mb-2">
                    Upload full high-res screenshots of each section (Hero, Features, Motion highlights, Footer).
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    {(editingDesign.previewImages || []).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-xl border border-[var(--devengine-border)] overflow-hidden group aspect-[16/10] bg-[#040a12]"
                      >
                        <img src={imgUrl} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDesign({
                              ...editingDesign,
                              previewImages: editingDesign.previewImages?.filter((_, i) => i !== idx),
                            })
                          }
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => void handleFileUpload(e, "gallery")}
                      className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--devengine-raised)] file:text-[var(--devengine-text)] file:border file:border-[var(--devengine-border)]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Or paste screenshot image URL directly and click Add"
                        id="newScreenshotUrlInput"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.getElementById("newScreenshotUrlInput") as HTMLInputElement;
                          if (input && input.value.trim()) {
                            setEditingDesign((prev) => ({
                              ...prev,
                              previewImages: [...(prev.previewImages || []), input.value.trim()],
                            }));
                            input.value = "";
                            showNotification("Screenshot added to gallery!");
                          }
                        }}
                        className="px-3 py-1.5 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] hover:border-[#2cecf7] text-[#2cecf7] rounded-lg text-xs font-semibold"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: DEMO & DELIVERABLES */}
              <div className="space-y-4 pt-4 border-t border-[var(--devengine-border)]">
                <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                  4. Demo & Protected Delivery
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold mb-1">Live Preview Demo URL</label>
                    <input
                      type="url"
                      placeholder="https://preview.devenginehq.com/landing/demo-1"
                      value={editingDesign.liveDemoUrl || ""}
                      onChange={(e) => setEditingDesign({ ...editingDesign, liveDemoUrl: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Delivery Type</label>
                    <select
                      value={editingDesign.deliveryType || "download_link"}
                      onChange={(e) => setEditingDesign({ ...editingDesign, deliveryType: e.target.value as any })}
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    >
                      <option value="download_link">Download Link (Protected URL / Cloud Storage)</option>
                      <option value="figma_link">Figma File Access Link</option>
                      <option value="zip_file">Direct Source Code ZIP</option>
                      <option value="github_repo">Private GitHub Repository Invite</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Deliverable Asset / Secret Access URL</label>
                  <input
                    type="text"
                    placeholder="https://storage.googleapis.com/... or Figma invitation URL (protected to verified buyers)"
                    value={editingDesign.deliveryFileUrl || ""}
                    onChange={(e) => setEditingDesign({ ...editingDesign, deliveryFileUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>

                {/* What's Included */}
                <div>
                  <label className="block font-semibold mb-1">What's Included List</label>
                  <div className="space-y-1.5 mb-2">
                    {(editingDesign.whatsIncluded || []).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--devengine-raised)]">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-[#2cecf7]">check_circle</span>
                          {item}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDesign({
                              ...editingDesign,
                              whatsIncluded: editingDesign.whatsIncluded?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="text-rose-400 text-xs hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add an included feature (e.g. Framer Motion source code)"
                      value={newIncludedInput}
                      onChange={(e) => setNewIncludedInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newIncludedInput.trim()) {
                            setEditingDesign({
                              ...editingDesign,
                              whatsIncluded: [...(editingDesign.whatsIncluded || []), newIncludedInput.trim()],
                            });
                            setNewIncludedInput("");
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newIncludedInput.trim()) {
                          setEditingDesign({
                            ...editingDesign,
                            whatsIncluded: [...(editingDesign.whatsIncluded || []), newIncludedInput.trim()],
                          });
                          setNewIncludedInput("");
                        }
                      }}
                      className="px-4 py-2 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] rounded-xl text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Technologies */}
                <div>
                  <label className="block font-semibold mb-1">Technologies Used</label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {(editingDesign.technologies || []).map((tech, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs flex items-center gap-1.5"
                      >
                        {tech}
                        <button
                          type="button"
                          onClick={() =>
                            setEditingDesign({
                              ...editingDesign,
                              technologies: editingDesign.technologies?.filter((_, idx) => idx !== i),
                            })
                          }
                          className="hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Tailwind CSS, Framer Motion"
                      value={newTechInput}
                      onChange={(e) => setNewTechInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (newTechInput.trim()) {
                            setEditingDesign({
                              ...editingDesign,
                              technologies: [...(editingDesign.technologies || []), newTechInput.trim()],
                            });
                            setNewTechInput("");
                          }
                        }
                      }}
                      className="flex-1 px-4 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newTechInput.trim()) {
                          setEditingDesign({
                            ...editingDesign,
                            technologies: [...(editingDesign.technologies || []), newTechInput.trim()],
                          });
                          setNewTechInput("");
                        }
                      }}
                      className="px-4 py-2 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] rounded-xl text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION: BADGES & CONTROLS */}
              <div className="space-y-4 pt-4 border-t border-[var(--devengine-border)]">
                <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                  5. Badges & Display Priority
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingDesign.isFeatured || false}
                      onChange={(e) => setEditingDesign({ ...editingDesign, isFeatured: e.target.checked })}
                      className="rounded border-[var(--devengine-border)] text-[#2cecf7]"
                    />
                    <span className="font-semibold">Featured Badge</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingDesign.isPopular || false}
                      onChange={(e) => setEditingDesign({ ...editingDesign, isPopular: e.target.checked })}
                      className="rounded border-[var(--devengine-border)] text-amber-400"
                    />
                    <span className="font-semibold">Popular Badge</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingDesign.isTrending || false}
                      onChange={(e) => setEditingDesign({ ...editingDesign, isTrending: e.target.checked })}
                      className="rounded border-[var(--devengine-border)] text-purple-400"
                    />
                    <span className="font-semibold">Trending Badge</span>
                  </label>

                  <div>
                    <label className="block font-semibold mb-1">Display Order</label>
                    <input
                      type="number"
                      value={editingDesign.displayOrder || 0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, displayOrder: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: MANUAL ENGAGEMENT METRICS & SOCIAL PROOF OVERRIDES */}
              <div className="space-y-4 pt-4 border-t border-[var(--devengine-border)]">
                <div>
                  <h3 className="text-sm font-bold text-[#2cecf7] uppercase tracking-wider font-mono">
                    6. Manual Engagement Metrics & Social Proof Overrides
                  </h3>
                  <p className="text-[11px] text-[var(--devengine-muted)] mt-1">
                    Override metrics manually so new templates do not start at 0 and discourage customer engagement. User favorites, purchases, and verified reviews dynamically increment on top of these base numbers.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Sales Count</label>
                    <input
                      type="number"
                      min={0}
                      value={editingDesign.salesCount ?? 0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, salesCount: Number(e.target.value) })}
                      placeholder="e.g. 3200"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Favorites Count</label>
                    <input
                      type="number"
                      min={0}
                      value={editingDesign.favoritesCount ?? 0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, favoritesCount: Number(e.target.value) })}
                      placeholder="e.g. 14"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Star Rating</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      step={0.1}
                      value={editingDesign.rating ?? 5.0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, rating: Number(e.target.value) })}
                      placeholder="e.g. 4.9"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Review Count</label>
                    <input
                      type="number"
                      min={0}
                      value={editingDesign.reviewCount ?? 0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, reviewCount: Number(e.target.value) })}
                      placeholder="e.g. 142"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Views Count</label>
                    <input
                      type="number"
                      min={0}
                      value={editingDesign.viewsCount ?? 0}
                      onChange={(e) => setEditingDesign({ ...editingDesign, viewsCount: Number(e.target.value) })}
                      placeholder="e.g. 1420"
                      className="w-full px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>
                </div>
              </div>

              {/* MODAL ACTIONS */}
              <div className="pt-6 border-t border-[var(--devengine-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDesignModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] text-xs font-semibold hover:bg-[var(--devengine-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || uploadingImage}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a] hover:bg-[#2cecf7]/90 disabled:opacity-50 shadow-[0_0_20px_rgba(44,236,247,0.3)]"
                >
                  {saving ? "Saving Design..." : "Save & Publish Design"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL: CREATE / EDIT CATEGORY ════════════════════ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
              <h2 className="text-lg font-bold">
                {editingCategory.id ? "Edit Category" : "Create New Category"}
              </h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Healthcare & Medical"
                  value={editingCategory.name || ""}
                  onChange={(e) => {
                    const name = e.target.value;
                    setEditingCategory({
                      ...editingCategory,
                      name,
                      slug: editingCategory.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                    });
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Slug *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. healthcare"
                  value={editingCategory.slug || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs font-mono text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Material Symbol Icon Name</label>
                <input
                  type="text"
                  placeholder="e.g. medical_services, storefront, rocket_launch"
                  value={editingCategory.icon || "category"}
                  onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Short Description</label>
                <textarea
                  rows={2}
                  placeholder="What designs belong here..."
                  value={editingCategory.description || ""}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Display Order</label>
                  <input
                    type="number"
                    value={editingCategory.displayOrder || 0}
                    onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isCatActive"
                    checked={editingCategory.isActive !== false}
                    onChange={(e) => setEditingCategory({ ...editingCategory, isActive: e.target.checked })}
                    className="rounded border-[var(--devengine-border)] text-[#2cecf7]"
                  />
                  <label htmlFor="isCatActive" className="font-semibold text-xs">
                    Active in Public
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--devengine-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a]"
                >
                  {saving ? "Saving..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════ MODAL: ADD MANUAL REVIEW ════════════════════ */}
      {isManualReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
              <div>
                <h2 className="text-lg font-bold">Add Manual Customer Review</h2>
                <p className="text-xs text-[var(--devengine-muted)]">
                  Add social proof and verified ratings directly to any template.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualReviewModalOpen(false)}
                className="text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualReview} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Select Target Design *</label>
                <select
                  required
                  value={manualReviewDesignId}
                  onChange={(e) => setManualReviewDesignId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                >
                  <option value="">-- Choose Landing Page Design --</option>
                  {designs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.categoryName || d.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Customer / Reviewer Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Liam Vance"
                    value={manualReviewName}
                    onChange={(e) => setManualReviewName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Customer Email</label>
                  <input
                    type="email"
                    placeholder="e.g. liam@vance.design"
                    value={manualReviewEmail}
                    onChange={(e) => setManualReviewEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Star Rating (1 to 5) *</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setManualReviewRating(star)}
                        className={`text-xl transition-transform cursor-pointer ${
                          star <= manualReviewRating ? "text-amber-400 scale-110" : "text-slate-600"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="ml-2 font-mono font-bold text-amber-400">{manualReviewRating}.0 / 5.0</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Review Date</label>
                  <input
                    type="date"
                    value={manualReviewDate}
                    onChange={(e) => setManualReviewDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Review Comment / Testimonial *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Share realistic, high-converting feedback about the code quality, Framer animations, and design system..."
                  value={manualReviewComment}
                  onChange={(e) => setManualReviewComment(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="manualVerified"
                  checked={manualReviewVerified}
                  onChange={(e) => setManualReviewVerified(e.target.checked)}
                  className="rounded border-[var(--devengine-border)] text-[#2cecf7]"
                />
                <label htmlFor="manualVerified" className="font-semibold text-xs cursor-pointer">
                  Display "Verified Purchase" green badge
                </label>
              </div>

              <div className="pt-4 border-t border-[var(--devengine-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualReviewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManualReview}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#2cecf7] text-[#02040a] hover:bg-[#2cecf7]/90 disabled:opacity-50 shadow-[0_0_15px_rgba(44,236,247,0.3)] cursor-pointer"
                >
                  {submittingManualReview ? "Adding Review..." : "Publish Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
