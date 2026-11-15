import React, { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  getDesignBySlug,
  getPublishedDesigns,
  getDesignReviews,
  submitDesignReview,
  checkIsFavorite,
  toggleFavoriteDesign,
  createMarketplaceOrder,
} from "@/lib/services/marketplaceService";
import type { LandingDesign, DesignReview } from "@/types/marketplace";

// Helper to convert any YouTube URL into an embed URL
function getYouTubeEmbedUrl(url?: string): string {
  if (!url || !url.trim()) {
    // Engaging UI/UX SaaS motion interaction video
    return "https://www.youtube.com/embed/L_LUpnjgPso?autoplay=0&rel=0&modestbranding=1";
  }
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/
  );
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=0&rel=0&modestbranding=1`;
  }
  return url;
}

export default function DesignDetail() {
  const router = useRouter();
  const { slug } = router.query;

  const [loading, setLoading] = useState(true);
  const [design, setDesign] = useState<LandingDesign | null>(null);
  const [relatedDesigns, setRelatedDesigns] = useState<LandingDesign[]>([]);
  const [reviews, setReviews] = useState<DesignReview[]>([]);

  // Active view tab in hero showcase: "video" | "desktop" | "mobile" | "components" | number
  const [activeView, setActiveView] = useState<"video" | "desktop" | "mobile" | "components">("video");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // User state & favorites
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Checkout Modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutEmail, setCheckoutEmail] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutMethod, setCheckoutMethod] = useState<
    "bKash" | "Nagad" | "Rocket" | "Dutch-Bangla Bank" | "BRAC Bank" | "Card"
  >("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [senderAccount, setSenderAccount] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    amount: number;
    currency: string;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserUid(user.uid);
        setUserEmail(user.email || null);
        setUserName(user.displayName || (user.email ? user.email.split("@")[0] : null));
        setCheckoutEmail(user.email || "");
        setCheckoutName(user.displayName || "");
      } else {
        setUserUid(null);
        setUserEmail(null);
        setUserName(null);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!slug || typeof slug !== "string") return;

    async function loadDesignData() {
      try {
        setLoading(true);
        const item = await getDesignBySlug(slug as string);
        if (!item) {
          setDesign(null);
          return;
        }
        setDesign(item);
        setLikesCount(item.favoritesCount || 14);

        // Fetch reviews, favorite status, and related designs in parallel
        const [revs, isFav, related] = await Promise.all([
          getDesignReviews(item.id),
          checkIsFavorite(item.id, auth.currentUser?.uid),
          getPublishedDesigns({ category: item.category, limitCount: 4 }),
        ]);

        setReviews(revs);
        setIsFavorite(isFav);
        setRelatedDesigns(related.filter((d) => d.id !== item.id));
      } catch (err) {
        console.error("Error loading design details:", err);
      } finally {
        setLoading(false);
      }
    }

    void loadDesignData();
  }, [slug]);

  // Pre-calculated multiple presentation views
  const multiViews = useMemo(() => {
    if (!design) return [];
    const views = [
      {
        key: "video" as const,
        title: "Motion Video Showcase",
        badge: "4K Motion",
        icon: "play_circle",
        desc: "Watch the engaging interactive motion and micro-interactions in action.",
      },
      {
        key: "desktop" as const,
        title: "Full Desktop Experience",
        badge: "Desktop View",
        icon: "desktop_windows",
        desc: "High-resolution desktop landing page layout and hero structure.",
        imageUrl: design.thumbnailUrl,
      },
      {
        key: "mobile" as const,
        title: "Mobile Responsive View",
        badge: "Mobile View",
        icon: "smartphone",
        desc: "Adaptive touch navigation, fluid typography, and stacked mobile cards.",
        imageUrl: design.mobileScreenshot || design.thumbnailUrl,
      },
      {
        key: "components" as const,
        title: "Design System & Components",
        badge: "UI Assets",
        icon: "widgets",
        desc: "Reusable component tokens, dark/light color palettes, and typography hierarchy.",
        imageUrl: design.tabletScreenshot || (design.previewImages && design.previewImages[0]) || design.thumbnailUrl,
      },
    ];

    return views;
  }, [design]);

  const handleToggleFavorite = async () => {
    if (!design) return;
    if (!userUid) {
      showToast("Please sign in to save designs to your favorites.");
      return;
    }

    try {
      const nextFav = await toggleFavoriteDesign(design.id, userUid);
      setIsFavorite(nextFav);
      setLikesCount((prev) => Math.max(0, prev + (nextFav ? 1 : -1)));
      showToast(nextFav ? "Saved to your inspiration collection!" : "Removed from favorites.");
    } catch {
      showToast("Could not update favorites.");
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!");
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!design) return;
    if (!userUid) {
      showToast("Please sign in to post a review.");
      return;
    }
    if (!reviewComment.trim()) {
      showToast("Please write a short review comment.");
      return;
    }

    setSubmittingReview(true);
    try {
      await submitDesignReview({
        designId: design.id,
        designTitle: design.title,
        customerUid: userUid,
        customerName: userName || "Verified Customer",
        customerEmail: userEmail || "",
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      showToast("Thank you! Your review was submitted.");
      setReviewComment("");
      const updatedRevs = await getDesignReviews(design.id);
      setReviews(updatedRevs);
    } catch {
      showToast("Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Submit Order
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!design) return;

    if (!checkoutName || !checkoutEmail || !checkoutPhone) {
      showToast("Name, Email, and Phone number are required.");
      return;
    }

    if (!design.isFree && !transactionId) {
      showToast("Transaction ID is required to verify your payment.");
      return;
    }

    setOrderSubmitting(true);
    try {
      const res = await createMarketplaceOrder({
        designId: design.id,
        customerName: checkoutName,
        customerEmail: checkoutEmail,
        customerPhone: checkoutPhone,
        paymentMethod: design.isFree ? "Free" : checkoutMethod,
        transactionId: design.isFree ? "FREE_DOWNLOAD" : transactionId.trim(),
        senderNumberOrAccount: senderAccount.trim() || undefined,
      });

      setCompletedOrder({
        orderId: res.orderId,
        amount: res.amount,
        currency: res.currency,
      });
      showToast("Order placed successfully!");
    } catch (err: any) {
      showToast(err.message || "Failed to place order.");
    } finally {
      setOrderSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--devengine-bg)] flex flex-col justify-between">
        <LandingNavbar />
        <div className="py-32 flex flex-col items-center justify-center gap-3">
          <HelixLoader size={50} color="#2cecf7" />
          <p className="text-xs uppercase font-mono tracking-widest text-[#2cecf7]">
            Loading Design Showcase...
          </p>
        </div>
        <LandingFooter />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen bg-[var(--devengine-bg)] flex flex-col justify-between text-slate-900 dark:text-white">
        <LandingNavbar />
        <div className="max-w-md mx-auto text-center py-32 px-4">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-3">
            sentiment_dissatisfied
          </span>
          <h1 className="text-2xl font-bold">Design Not Found</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            The requested landing page design may have been unlisted or moved.
          </p>
          <Link
            href="/landing-page-designs"
            className="inline-block mt-6 px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs"
          >
            ← Explore All Designs
          </Link>
        </div>
        <LandingFooter />
      </div>
    );
  }

  const embedVideoUrl = getYouTubeEmbedUrl(design.videoUrl);

  return (
    <>
      <Head>
        <title>{design.seoTitle || `${design.title} | Landing Page Design`}</title>
        <meta
          name="description"
          content={design.seoDescription || design.shortDescription || design.title}
        />
        <meta property="og:title" content={`${design.title} | DevEngine Marketplace`} />
        <meta property="og:description" content={design.shortDescription} />
        {design.thumbnailUrl && <meta property="og:image" content={design.thumbnailUrl} />}
        <link rel="canonical" href={`https://www.devenginehq.com/landing-page-designs/${design.slug}`} />
      </Head>

      <div className="min-h-screen bg-[var(--devengine-bg)] text-slate-900 dark:text-white flex flex-col font-sans transition-colors duration-200">
        <LandingNavbar />

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white dark:bg-[#040a12]/95 border border-[#2cecf7]/50 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="material-symbols-outlined text-sm text-[#2cecf7]">info</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 pt-24 sm:pt-28 pb-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* ════════════════════ TOP BREADCRUMB BAR ════════════════════ */}
            <div className="flex items-center justify-between text-xs pb-4 border-b border-slate-200 dark:border-slate-800 mb-6 text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Link
                  href="/landing-page-designs"
                  className="hover:text-[#00c5d4] dark:hover:text-[#2cecf7] flex items-center gap-1 font-bold text-slate-800 dark:text-slate-200"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  <span>Explore All Designs</span>
                </Link>
                <span className="text-slate-400">/</span>
                <span className="font-mono capitalize font-bold text-slate-900 dark:text-[#2cecf7]">
                  {design.categoryName || design.category}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                <span>{design.viewsCount || 230} views</span>
                <span>·</span>
                <span>{design.salesCount || 12} sales</span>
              </div>
            </div>

            {/* ════════════════════ DRIBBLE SHOT HEADER (HIGH CONTRAST & RAZOR-SHARP) ════════════════════ */}
            <div className="pb-8 space-y-4">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                {design.title}
              </h1>

              {/* Author & Action Buttons Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pt-2">
                {/* Author profile */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-[#2cecf7] flex items-center justify-center shrink-0 shadow-lg">
                    <span className="text-xs font-black text-[#2cecf7]">DE</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-base font-bold text-slate-900 dark:text-white">
                        DevEngine HQ
                      </strong>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-[#2cecf7] text-[#02040a]">
                        PRO
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400">for DevEngine Studio</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs mt-1 flex-wrap text-slate-600 dark:text-slate-300">
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Available for custom work
                      </span>
                      <span>·</span>
                      <a
                        href="https://www.devenginehq.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#00c5d4] dark:hover:text-[#2cecf7] underline font-medium"
                      >
                        devenginehq.com
                      </a>
                      <span>·</span>
                      <a
                        href="mailto:contact@devenginehq.com"
                        className="hover:text-[#00c5d4] dark:hover:text-[#2cecf7] underline font-medium"
                      >
                        contact@devenginehq.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Top Action CTAs */}
                <div className="flex items-center gap-3 flex-wrap self-start sm:self-auto">
                  {/* Save Shot Button */}
                  <button
                    onClick={handleToggleFavorite}
                    className={`px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2 text-xs font-bold ${
                      isFavorite
                        ? "bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-400"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-rose-400 hover:text-rose-500"
                    }`}
                    title={isFavorite ? "Saved" : "Save shot"}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {isFavorite ? "favorite" : "favorite_border"}
                    </span>
                    <span>{likesCount > 0 ? likesCount : "Save Shot"}</span>
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="p-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-[#2cecf7] transition-colors"
                    title="Share link"
                  >
                    <span className="material-symbols-outlined text-lg">share</span>
                  </button>

                  {/* Live Demo */}
                  {design.liveDemoUrl && (
                    <a
                      href={design.liveDemoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 rounded-xl border-2 border-slate-800 dark:border-[#2cecf7]/60 text-slate-900 dark:text-[#2cecf7] bg-transparent hover:bg-slate-100 dark:hover:bg-[#2cecf7]/10 text-xs font-black transition-all flex items-center gap-1.5"
                    >
                      <span>Live Demo</span>
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </a>
                  )}

                  {/* Primary Purchase Button (High Contrast near-black text on cyan) */}
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs hover:bg-[#20d8e2] transition-all shadow-[0_4px_16px_rgba(44,236,247,0.35)] flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">shopping_bag</span>
                    <span>
                      {design.isFree
                        ? "Download Free"
                        : `Get in touch · ${design.currency === "BDT" ? "৳" : "$"}${design.price}`}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* ════════════════════ MULTI-VIEW PRESENTATION SHOWCASE ════════════════════ */}
            {/* Sleek, compact switcher with zero side scrollbar + polished minimal canvas */}
            <div className="space-y-5">
              {/* Compact, Clean Centered Segmented Control */}
              <div className="flex justify-center">
                <nav
                  aria-label="Presentation views"
                  className="inline-flex items-center p-1 rounded-full bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-sm gap-1"
                >
                  {[
                    { key: "video" as const, label: "Motion Reel", icon: "play_circle" },
                    { key: "desktop" as const, label: "Desktop", icon: "desktop_windows" },
                    { key: "mobile" as const, label: "Mobile", icon: "smartphone" },
                    { key: "components" as const, label: "Components", icon: "widgets" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveView(tab.key)}
                      className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeView === tab.key
                          ? "bg-[#2cecf7] text-[#02040a] shadow-[0_2px_10px_rgba(44,236,247,0.35)]"
                          : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-base shrink-0">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* MAIN SHOWCASE CONTAINER (POLISHED, MINIMAL CANVAS) */}
              <div className="rounded-3xl bg-slate-100/90 dark:bg-[#070e1a] p-3 sm:p-6 md:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative">
                {/* 1. ACTIVE VIEW: VIDEO / MOTION SHOWCASE */}
                {activeView === "video" && (
                  <div className="space-y-3">
                    <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-300/80 dark:border-slate-700 bg-black aspect-[16/9] w-full">
                      <iframe
                        src={embedVideoUrl}
                        title={`${design.title} motion video showcase`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs px-1 text-slate-700 dark:text-slate-300 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          Interactive Motion Reel · 60FPS Micro-Interactions
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        <span>Framer Motion & Next.js</span>
                        <span>·</span>
                        <button
                          onClick={() => setActiveView("desktop")}
                          className="text-[#00c5d4] dark:text-[#2cecf7] font-bold hover:underline"
                        >
                          View Static Mockups →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ACTIVE VIEW: DESKTOP FULL PRESENTATION */}
                {activeView === "desktop" && (
                  <div className="space-y-3">
                    <div
                      onClick={() => setLightboxImage(design.thumbnailUrl)}
                      className="cursor-zoom-in rounded-2xl overflow-hidden shadow-2xl border border-slate-300/80 dark:border-slate-700 bg-slate-900 transition-transform duration-300 hover:scale-[1.008]"
                      title="Click to view full-resolution zoom"
                    >
                      <img
                        src={design.thumbnailUrl}
                        alt={`${design.title} desktop layout`}
                        className="w-full h-auto object-contain block mx-auto"
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-sm">zoom_in</span>
                        <span>Click visual to inspect in high-resolution lightbox</span>
                      </span>
                      <span className="font-mono text-[11px]">Desktop 1920×1080 Retina</span>
                    </div>
                  </div>
                )}

                {/* 3. ACTIVE VIEW: MOBILE RESPONSIVE VIEW */}
                {activeView === "mobile" && (
                  <div className="space-y-3">
                    <div className="max-w-sm sm:max-w-md mx-auto">
                      <div
                        onClick={() =>
                          setLightboxImage(design.mobileScreenshot || design.thumbnailUrl)
                        }
                        className="cursor-zoom-in rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-black transition-transform duration-300 hover:scale-[1.01]"
                        title="Click to zoom mobile view"
                      >
                        <img
                          src={design.mobileScreenshot || design.thumbnailUrl}
                          alt={`${design.title} mobile view`}
                          className="w-full h-auto object-contain block mx-auto"
                        />
                      </div>
                    </div>
                    <div className="text-center text-xs text-slate-600 dark:text-slate-400">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Mobile Responsive View:
                      </span>{" "}
                      Adaptive fluid layout, touch navigation & mobile card grids.
                    </div>
                  </div>
                )}

                {/* 4. ACTIVE VIEW: DESIGN SYSTEM & COMPONENT TOKENS */}
                {activeView === "components" && (
                  <div className="space-y-5">
                    <div
                      onClick={() =>
                        setLightboxImage(
                          design.tabletScreenshot ||
                            (design.previewImages && design.previewImages[0]) ||
                            design.thumbnailUrl
                        )
                      }
                      className="cursor-zoom-in rounded-2xl overflow-hidden shadow-2xl border border-slate-300/80 dark:border-slate-700 bg-slate-900"
                    >
                      <img
                        src={
                          design.tabletScreenshot ||
                          (design.previewImages && design.previewImages[0]) ||
                          design.thumbnailUrl
                        }
                        alt={`${design.title} component system`}
                        className="w-full h-auto object-contain block mx-auto"
                      />
                    </div>

                    {/* Component feature pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <strong className="block text-slate-900 dark:text-white font-bold">
                          Typography Tokens
                        </strong>
                        <span className="text-slate-500 text-[11px]">Space Grotesk & Inter</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <strong className="block text-slate-900 dark:text-white font-bold">
                          Color Variables
                        </strong>
                        <span className="text-slate-500 text-[11px]">#2cecf7 Brand Glow</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <strong className="block text-slate-900 dark:text-white font-bold">
                          Micro-Interactions
                        </strong>
                        <span className="text-slate-500 text-[11px]">Framer Motion springs</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <strong className="block text-slate-900 dark:text-white font-bold">
                          Export Format
                        </strong>
                        <span className="text-slate-500 text-[11px]">Next.js 15 & Figma</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ════════════════════ DRIBBLE LIKE & SAVE BANNER (HIGH CONTRAST & CLEAR) ════════════════════ */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#070e1a] border-2 border-slate-200 dark:border-slate-800 text-center space-y-4 max-w-3xl mx-auto shadow-xl">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-extrabold text-slate-800 dark:text-[#2cecf7]">
                  <span className="material-symbols-outlined text-base text-rose-500">favorite</span>
                  <span>Save Shot for Inspiration</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  Like to show your love. You are our hero of the day!
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                  Every landing page design is engineered with production-ready Next.js, Framer Motion, and scalable component architecture.
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={handleToggleFavorite}
                    className={`px-8 py-3.5 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-md ${
                      isFavorite
                        ? "bg-rose-500 text-white shadow-rose-500/30"
                        : "bg-[#2cecf7] text-[#02040a] hover:bg-[#20d8e2] shadow-[0_4px_16px_rgba(44,236,247,0.35)]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isFavorite ? "favorite" : "favorite_border"}
                    </span>
                    <span>{isFavorite ? "Liked & Saved" : "Like This Design"}</span>
                  </button>
                </div>
              </div>

              {/* ════════════════════ ADDITIONAL SECTION SCREENSHOTS (IF UPLOADED) ════════════════════ */}
              {design.previewImages && design.previewImages.length > 0 && (
                <div className="space-y-8 pt-4">
                  <div className="text-center max-w-lg mx-auto">
                    <span className="text-xs font-mono uppercase font-bold text-[#00c5d4] dark:text-[#2cecf7] tracking-wider">
                      Section Breakdowns
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                      Full Landing Page Walkthrough
                    </h2>
                  </div>

                  {design.previewImages.map((screenUrl, idx) => (
                    <div
                      key={idx}
                      className="rounded-3xl bg-slate-100 dark:bg-[#070e1a] p-4 sm:p-8 border-2 border-slate-200 dark:border-slate-800 shadow-xl"
                    >
                      <div className="max-w-4xl mx-auto">
                        <div className="mb-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                          <span className="font-mono font-bold text-slate-900 dark:text-[#2cecf7]">
                            View 0{idx + 1} · Detailed Section Mockup
                          </span>
                          <button
                            onClick={() => setLightboxImage(screenUrl)}
                            className="text-slate-800 dark:text-slate-200 hover:text-[#2cecf7] flex items-center gap-1 font-bold"
                          >
                            <span className="material-symbols-outlined text-xs">zoom_in</span>
                            <span>Expand Full-Res</span>
                          </button>
                        </div>

                        <div
                          onClick={() => setLightboxImage(screenUrl)}
                          className="cursor-zoom-in rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-300 dark:border-slate-700 bg-black"
                        >
                          <img
                            src={screenUrl}
                            alt={`${design.title} section ${idx + 1}`}
                            className="w-full h-auto object-contain block"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ════════════════════ COMMERCIAL PURCHASE & SPECIFICATIONS CARD ════════════════════ */}
              <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-[#060c18] border-2 border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl mx-auto space-y-10">
                {/* Header Row: Pricing & Primary Action */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b-2 border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Commercial Purchase & Instant Delivery
                    </span>
                    <div className="flex items-baseline gap-3 mt-1.5">
                      {design.isFree ? (
                        <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">
                          FREE
                        </span>
                      ) : (
                        <>
                          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-[#2cecf7]">
                            {design.currency === "BDT" ? "৳" : "$"}{design.price}
                          </span>
                          {design.originalPrice && design.originalPrice > design.price && (
                            <span className="text-lg line-through text-slate-400 font-bold">
                              {design.currency === "BDT" ? "৳" : "$"}{design.originalPrice}
                            </span>
                          )}
                          {design.discountPercent && design.discountPercent > 0 && (
                            <span className="px-3 py-1 rounded-lg text-xs font-black bg-rose-500 text-white shadow-sm">
                              Save {design.discountPercent}%
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setIsCheckoutOpen(true)}
                      className="px-8 py-4 rounded-2xl bg-[#2cecf7] text-[#02040a] font-black text-sm hover:bg-[#20d8e2] transition-all shadow-[0_6px_20px_rgba(44,236,247,0.35)] flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
                      <span>{design.isFree ? "Download Now (Free)" : "Purchase & Instant Delivery"}</span>
                    </button>

                    {design.liveDemoUrl && (
                      <a
                        href={design.liveDemoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-4 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white hover:border-[#2cecf7] text-xs font-bold transition-all flex items-center gap-2"
                      >
                        <span>Live Demo</span>
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* 3-Column Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Column 1: Overview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-[#2cecf7]">
                      Overview & Architecture
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                      {design.fullDescription || design.shortDescription}
                    </p>
                    {design.tags && design.tags.length > 0 && (
                      <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                        {design.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-700 dark:text-slate-300 font-mono font-medium"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Column 2: What's Included */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-[#2cecf7]">
                      What's Included
                    </h4>
                    <ul className="space-y-2.5 text-xs text-slate-800 dark:text-slate-200">
                      {(design.whatsIncluded || [
                        "Full Responsive Code (Next.js & React)",
                        "Framer Motion Smooth Animations",
                        "Figma Design System & Components",
                        "Commercial Lifetime License",
                        "Free Updates & Documentation",
                      ]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="material-symbols-outlined text-[#00c5d4] dark:text-[#2cecf7] text-base shrink-0">
                            check_circle
                          </span>
                          <span className="leading-tight font-medium">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column 3: Tech & License */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-[#2cecf7] mb-2">
                        Technologies
                      </h4>
                      <div className="flex gap-1.5 flex-wrap">
                        {(design.technologies || ["Next.js", "React", "Tailwind CSS", "Framer Motion", "TypeScript"]).map(
                          (tech) => (
                            <span
                              key={tech}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200"
                            >
                              {tech}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-800 text-xs space-y-2 text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>License:</span>
                        <strong className="text-slate-900 dark:text-white">
                          {design.license || "Commercial Lifetime"}
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery:</span>
                        <strong className="text-slate-900 dark:text-white">Protected Digital Delivery</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Support:</span>
                        <strong className="text-[#00c5d4] dark:text-[#2cecf7] font-bold">
                          Included Direct
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* HAVE A PROJECT IDEA CALLOUT (HIGH CONTRAST) */}
                <div className="p-8 rounded-2xl bg-slate-900 dark:bg-gradient-to-r dark:from-[#071324] dark:via-[#0b1c34] dark:to-[#040914] text-white border-2 border-slate-800 text-center space-y-3">
                  <h4 className="text-xl sm:text-2xl font-black">Need customization or full-stack takeover?</h4>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
                    DevEngine engineers custom brand identities, high-conversion landing pages, and backend integrations.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <Link
                      href="/contact"
                      className="px-7 py-3 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs hover:bg-[#20d8e2] transition-colors shadow-lg"
                    >
                      Hire DevEngine Studio
                    </Link>
                  </div>
                </div>
              </div>

              {/* ════════════════════ VERIFIED REVIEWS & RATINGS ════════════════════ */}
              <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#060c18] border-2 border-slate-200 dark:border-slate-800 max-w-5xl mx-auto space-y-6 shadow-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Customer Reviews & Ratings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Real feedback from verified purchasers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500 text-2xl">star</span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {design.rating || 5.0}
                    </span>
                    <span className="text-xs text-slate-500">({reviews.length} reviews)</span>
                  </div>
                </div>

                {/* Reviews List */}
                {reviews.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border-y-2 border-slate-200 dark:border-slate-800">
                    Be the first customer to review this landing page design!
                  </div>
                ) : (
                  <div className="space-y-4 divide-y divide-slate-200 dark:divide-slate-800">
                    {reviews.map((rev) => (
                      <div key={rev.id} className="pt-4 first:pt-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-bold text-slate-900 dark:text-white">
                              {rev.customerName}
                            </strong>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                              Verified
                            </span>
                          </div>
                          <div className="flex text-amber-500 text-xs">
                            {"★".repeat(rev.rating)}
                            {"☆".repeat(5 - rev.rating)}
                          </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mt-1">
                          {rev.comment}
                        </p>
                        <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Review Form */}
                <form
                  onSubmit={handleSubmitReview}
                  className="pt-4 border-t-2 border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <h4 className="text-xs font-mono font-black uppercase tracking-wider text-slate-900 dark:text-[#2cecf7]">
                    Write a Customer Review
                  </h4>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewRating(star)}
                          className={`text-xl transition-colors ${
                            star <= reviewRating ? "text-amber-500" : "text-slate-300 dark:text-slate-700"
                          }`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    placeholder={
                      userUid
                        ? "Share your feedback on the layout, responsiveness, animations, and code quality..."
                        : "Please sign in to write a review."
                    }
                    disabled={!userUid || submittingReview}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7] disabled:opacity-50"
                  />

                  <button
                    type="submit"
                    disabled={!userUid || submittingReview || !reviewComment.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs disabled:opacity-50 hover:bg-[#20d8e2]"
                  >
                    {submittingReview ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              </div>

              {/* ════════════════════ RELATED DESIGNS (DRIBBLE FOOTER CARDS) ════════════════════ */}
              {relatedDesigns.length > 0 && (
                <div className="pt-12 border-t-2 border-slate-200 dark:border-slate-800 max-w-5xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white">
                        More by DevEngine HQ
                      </h3>
                      <p className="text-xs text-slate-500">Explore other high-performance landing pages.</p>
                    </div>
                    <Link
                      href="/landing-page-designs"
                      className="text-xs font-bold text-[#00c5d4] dark:text-[#2cecf7] hover:underline"
                    >
                      View All →
                    </Link>
                  </div>

                  {/* Unique Signature Cards for "More by DevEngine HQ" */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                    {relatedDesigns.map((rel) => (
                      <Link
                        key={rel.id}
                        href={`/landing-page-designs/${rel.slug}`}
                        className="group relative rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-[#040914] shadow-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-[#2cecf7] hover:shadow-[0_15px_35px_rgba(44,236,247,0.25)] flex flex-col"
                      >
                        {/* Visual Frame with Cinema Zoom */}
                        <div className="relative aspect-[16/11] bg-black overflow-hidden">
                          <img
                            src={rel.thumbnailUrl}
                            alt={rel.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                          />

                          {/* Gradient Cinema Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#02050a] via-[#02050a]/40 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                          {/* Top floating badges */}
                          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-black/70 backdrop-blur-md text-[#2cecf7] border border-white/10 shadow">
                              {rel.categoryName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 backdrop-blur-md text-amber-400 border border-white/10 flex items-center gap-1 shadow">
                              <span>★</span>
                              <span>{rel.rating || 5.0}</span>
                            </span>
                          </div>

                          {/* Hover Action Pill */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <span className="px-4 py-2 rounded-full bg-[#2cecf7] text-[#02040a] font-black text-xs shadow-2xl flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                              <span>Explore Shot</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </span>
                          </div>
                        </div>

                        {/* Bottom Unique Meta Plate */}
                        <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-[#060c18] to-[#02050a] border-t border-white/5 space-y-3">
                          <div>
                            <h4 className="font-extrabold text-base text-white group-hover:text-[#2cecf7] transition-colors line-clamp-1">
                              {rel.title}
                            </h4>
                            <p className="text-xs text-slate-400 line-clamp-1 mt-1">
                              {rel.shortDescription || "Interactive digital experience & responsive landing page"}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-900 border border-[#2cecf7]/60 flex items-center justify-center">
                                <span className="text-[9px] font-black text-[#2cecf7]">DE</span>
                              </div>
                              <span className="text-slate-300 font-medium text-[11px]">DevEngine</span>
                            </div>

                            <span className="font-black text-sm text-[#2cecf7]">
                              {rel.isFree ? "FREE" : `${rel.currency === "BDT" ? "৳" : "$"}${rel.price}`}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <LandingFooter />

        {/* ════════════════════ FULL-RESOLUTION LIGHTBOX ZOOM ════════════════════ */}
        {lightboxImage && (
          <div
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-6xl max-h-[95vh] overflow-auto rounded-2xl">
              <img
                src={lightboxImage}
                alt="Full resolution inspection"
                className="w-full h-auto object-contain block mx-auto rounded-xl shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 text-white flex items-center justify-center text-lg font-bold border border-white/20 hover:bg-black"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════ CHECKOUT MODAL ════════════════════ */}
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="w-full max-w-lg bg-white dark:bg-[#070e1a] text-slate-900 dark:text-white border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-xl font-bold">
                    {completedOrder ? "Order Confirmation" : "Complete Purchase"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {completedOrder
                      ? "Your digital assets have been scheduled for fulfillment."
                      : "Direct payment verification & delivery."}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCheckoutOpen(false);
                    setCompletedOrder(null);
                  }}
                  className="p-1 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {completedOrder ? (
                /* ORDER COMPLETED CONFIRMATION */
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto text-3xl font-black">
                    ✓
                  </div>
                  <div>
                    <h4 className="text-xl font-bold">Order Received!</h4>
                    <p className="text-xs text-slate-500 mt-1">Unique Order Identifier:</p>
                    <span className="font-mono text-base font-black text-slate-900 dark:text-[#2cecf7] mt-1 inline-block">
                      {completedOrder.orderId}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                    {design.isFree
                      ? "Your free design order is confirmed. Your delivery access is ready!"
                      : "Our commerce team has received your payment verification request. Once verified, your download token will unlock direct asset access."}
                  </p>

                  <div className="pt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setCompletedOrder(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* CHECKOUT FORM */
                <form onSubmit={handleCheckoutSubmit} className="space-y-4 text-xs">
                  {/* Order summary card */}
                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                    <div className="w-14 h-10 rounded-lg bg-black overflow-hidden shrink-0">
                      <img src={design.thumbnailUrl} alt={design.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <strong className="block text-sm line-clamp-1 text-slate-900 dark:text-white">
                        {design.title}
                      </strong>
                      <span className="text-[11px] text-slate-500">
                        {design.isFree ? "Free License" : "Commercial Lifetime License"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-sm text-slate-900 dark:text-[#2cecf7]">
                        {design.isFree ? "FREE" : `${design.currency === "BDT" ? "৳" : "$"}${design.price}`}
                      </span>
                    </div>
                  </div>

                  {/* Customer details */}
                  <div>
                    <label className="block font-bold mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Henderson"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={checkoutEmail}
                        onChange={(e) => setCheckoutEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">Phone / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="+8801XXXXXXXXX"
                        value={checkoutPhone}
                        onChange={(e) => setCheckoutPhone(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>
                  </div>

                  {/* Payment Instructions & Fields (if not free) */}
                  {!design.isFree && (
                    <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <label className="block font-bold">Select Payment Method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["bKash", "Nagad", "Rocket", "Dutch-Bangla Bank", "BRAC Bank", "Card"] as const).map(
                          (m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setCheckoutMethod(m)}
                              className={`p-2.5 rounded-xl text-center border-2 font-bold text-[11px] transition-all ${
                                checkoutMethod === m
                                  ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7]"
                                  : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {m}
                            </button>
                          )
                        )}
                      </div>

                      {/* Payment account details */}
                      <div className="p-3.5 rounded-xl bg-cyan-50 dark:bg-[#2cecf7]/10 border-2 border-[#2cecf7]/40 text-xs space-y-1">
                        <strong className="text-slate-900 dark:text-[#2cecf7] block font-black">
                          Payment Instructions:
                        </strong>
                        <p className="text-slate-700 dark:text-slate-200">
                          Send{" "}
                          <strong>
                            {design.currency === "BDT" ? "৳" : "$"}{design.price}
                          </strong>{" "}
                          via {checkoutMethod} (Merchant/Personal).
                        </p>
                        <p className="font-mono font-bold text-slate-900 dark:text-[#2cecf7]">
                          Account: 01700000000
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block font-bold mb-1">Transaction ID (TrxID) *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 9J4K2L8X"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold mb-1">Sender Account / Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 017XXXXXXXX"
                            value={senderAccount}
                            onChange={(e) => setSenderAccount(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(false)}
                      className="px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={orderSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs hover:bg-[#20d8e2] disabled:opacity-50 shadow-md"
                    >
                      {orderSubmitting ? "Processing..." : design.isFree ? "Confirm Download" : "Submit Order"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
