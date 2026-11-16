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
  getGuestUser,
  DEFAULT_SHOWCASE_DESIGNS,
} from "@/lib/services/marketplaceService";
import type { LandingDesign, DesignReview } from "@/types/marketplace";
import PurchaseRequestSheet from "@/components/marketplace/PurchaseRequestSheet";
import GuestAuthSheet from "@/components/marketplace/GuestAuthSheet";

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

  // Active view tab in hero showcase: "preview" | "desktop" | "tablet" | "mobile" | "components"
  const [activeView, setActiveView] = useState<"preview" | "desktop" | "tablet" | "mobile" | "components">("preview");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // User state & favorites
  const [userUid, setUserUid] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [isHeartBouncing, setIsHeartBouncing] = useState(false);

  // Review form
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Build Together Sheet, Checkout Modal & Guest Auth Sheet
  const [isBuildTogetherOpen, setIsBuildTogetherOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [authSheetAction, setAuthSheetAction] = useState<"favorite" | "review" | "general">("general");
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
  const [favSuccessPopup, setFavSuccessPopup] = useState<{
    isOpen: boolean;
    designTitle: string;
    designSlug: string;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUserUid(firebaseUser.uid);
        setUserEmail(firebaseUser.email || null);
        setUserName(firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : null));
        setCheckoutEmail(firebaseUser.email || "");
        setCheckoutName(firebaseUser.displayName || "");
        const guestDoc = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          fullName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Guest",
          role: "guest",
          isGuest: true,
          loggedIn: true,
        };
        try {
          localStorage.setItem("devengine_guest", JSON.stringify(guestDoc));
        } catch {}
      } else {
        const guest = getGuestUser();
        if (guest && guest.uid) {
          setUserUid(guest.uid);
          setUserEmail(guest.email || null);
          setUserName(guest.fullName || null);
          setCheckoutEmail(guest.email || "");
          setCheckoutName(guest.fullName || "");
          if (guest.phone) setCheckoutPhone(guest.phone);
        } else {
          setUserUid(null);
          setUserEmail(null);
          setUserName(null);
        }
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

        const currentGuest = getGuestUser();
        // Fetch reviews, favorite status, and related designs in parallel
        const [revs, isFav, related] = await Promise.all([
          getDesignReviews(item.id),
          checkIsFavorite(item.id, currentGuest?.uid),
          getPublishedDesigns({ limitCount: 6 }),
        ]);

        setReviews(revs);
        setIsFavorite(isFav);
        const filteredRelated = related.filter((d) => d.id !== item.id && d.slug !== item.slug);
        if (filteredRelated.length > 0) {
          setRelatedDesigns(filteredRelated.slice(0, 3));
        } else {
          setRelatedDesigns(DEFAULT_SHOWCASE_DESIGNS.filter((d) => d.slug !== item.slug).slice(0, 3));
        }
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

  // 3D Hero Mockup Auto-Swipe State & Deck Slides
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroSwipePaused, setIsHeroSwipePaused] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"next" | "prev">("next");
  const [isSwipingTurn, setIsSwipingTurn] = useState(false);

  const heroDeckSlides = useMemo(() => {
    if (!design) return [];
    const list: Array<{ id: string; url: string; title: string; badge: string }> = [
      {
        id: "main",
        url: design.thumbnailUrl,
        title: `${design.slug}.devenginehq.com`,
        badge: "Main Experience",
      },
    ];

    if (design.mobileScreenshot && design.mobileScreenshot !== design.thumbnailUrl) {
      list.push({
        id: "mobile",
        url: design.mobileScreenshot,
        title: `${design.slug}-mobile.deven...`,
        badge: "Mobile Responsive",
      });
    }

    if (design.tabletScreenshot && design.tabletScreenshot !== design.thumbnailUrl) {
      list.push({
        id: "tablet",
        url: design.tabletScreenshot,
        title: `${design.slug}-system.deven...`,
        badge: "Design Tokens",
      });
    }

    if (design.previewImages && design.previewImages.length > 0) {
      design.previewImages.forEach((p, idx) => {
        if (!list.some((item) => item.url === p) && list.length < 5) {
          list.push({
            id: `preview_${idx}`,
            url: p,
            title: `${design.slug}-section-0${idx + 1}.deven...`,
            badge: `Showcase Section 0${idx + 1}`,
          });
        }
      });
    }

    const sampleBackdrops = [
      {
        url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
        title: `${design.slug}-analytics.deven...`,
        badge: "Interactive Analytics",
      },
      {
        url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop",
        title: `${design.slug}-insights.deven...`,
        badge: "Dashboard UI",
      },
      {
        url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=800&auto=format&fit=crop",
        title: `${design.slug}-editorial.deven...`,
        badge: "Creative Grid",
      },
    ];

    let sIdx = 0;
    while (list.length < 4 && sIdx < sampleBackdrops.length) {
      list.push({
        id: `sample_${sIdx}`,
        url: sampleBackdrops[sIdx].url,
        title: sampleBackdrops[sIdx].title,
        badge: sampleBackdrops[sIdx].badge,
      });
      sIdx++;
    }

    return list;
  }, [design]);

  useEffect(() => {
    if (heroDeckSlides.length <= 1 || isHeroSwipePaused) return;

    const timer = setInterval(() => {
      setSwipeDirection("next");
      setIsSwipingTurn(true);
      setTimeout(() => {
        setHeroSlideIndex((prev) => (prev + 1) % heroDeckSlides.length);
        setIsSwipingTurn(false);
      }, 420);
    }, 3400);

    return () => clearInterval(timer);
  }, [heroDeckSlides.length, isHeroSwipePaused]);

  const handlePrevHeroSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSwipingTurn || heroDeckSlides.length <= 1) return;
    setSwipeDirection("prev");
    setIsSwipingTurn(true);
    setTimeout(() => {
      setHeroSlideIndex((prev) => (prev - 1 + heroDeckSlides.length) % heroDeckSlides.length);
      setIsSwipingTurn(false);
    }, 380);
  };

  const handleNextHeroSlide = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSwipingTurn || heroDeckSlides.length <= 1) return;
    setSwipeDirection("next");
    setIsSwipingTurn(true);
    setTimeout(() => {
      setHeroSlideIndex((prev) => (prev + 1) % heroDeckSlides.length);
      setIsSwipingTurn(false);
    }, 380);
  };

  const handleToggleFavorite = async () => {
    if (!design) return;
    const activeUid = userUid || auth.currentUser?.uid || getGuestUser()?.uid;
    if (!activeUid) {
      setAuthSheetAction("favorite");
      setIsAuthSheetOpen(true);
      return;
    }

    setIsHeartBouncing(true);
    setTimeout(() => setIsHeartBouncing(false), 800);

    try {
      const nextFav = await toggleFavoriteDesign(design.id, activeUid);
      setIsFavorite(nextFav);
      setLikesCount((prev) => Math.max(0, prev + (nextFav ? 1 : -1)));
      if (nextFav) {
        setFavSuccessPopup({
          isOpen: true,
          designTitle: design.title,
          designSlug: design.slug,
        });
      } else {
        showToast("Removed from favorites.");
      }
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

  // Auth Success Callback from GuestAuthSheet
  const handleAuthSuccess = async (user: any) => {
    setUserUid(user.uid);
    setUserEmail(user.email || null);
    setUserName(user.displayName || user.email?.split("@")[0] || "Guest");
    setCheckoutEmail(user.email || "");
    setCheckoutName(user.displayName || "");

    showToast("Signed in successfully!");

    if (authSheetAction === "favorite" && design) {
      try {
        const nextFav = await toggleFavoriteDesign(design.id, user.uid);
        setIsFavorite(nextFav);
        setLikesCount((prev) => Math.max(0, prev + (nextFav ? 1 : -1)));
        if (nextFav) {
          setFavSuccessPopup({
            isOpen: true,
            designTitle: design.title,
            designSlug: design.slug,
          });
        }
      } catch {}
    }
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!design) return;
    const activeUid = userUid || auth.currentUser?.uid || getGuestUser()?.uid;
    if (!activeUid) {
      setAuthSheetAction("review");
      setIsAuthSheetOpen(true);
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
        customerUid: userUid || undefined,
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
      setDesign((prev) => (prev ? { ...prev, salesCount: (prev.salesCount || 0) + 1 } : prev));
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

        {/* Favorite Success Profile Popup with Navigation Button */}
        {favSuccessPopup && favSuccessPopup.isOpen && (
          <div
            role="dialog"
            aria-label="Favorite added to profile"
            className="fixed bottom-6 right-6 z-50 max-w-sm w-[calc(100vw-3rem)] p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-[#0c1424]/95 border border-cyan-400/50 dark:border-cyan-500/40 shadow-[0_12px_45px_rgba(44,236,247,0.3)] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-300 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center flex-none shadow-sm">
                  <span className="material-symbols-outlined text-rose-500 text-2xl font-fill animate-bounce">
                    favorite
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    Added to Your Profile!
                  </h4>
                  <p className="text-xs text-[#0284c7] dark:text-[#2cecf7] font-semibold line-clamp-1 mt-0.5">
                    {favSuccessPopup.designTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFavSuccessPopup(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Dismiss notification"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This design has been saved to your guest profile favorites. You can view all saved items and track updates anytime.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <Link
                href="/guest-profile"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#2cecf7] hover:bg-[#20d8e2] text-[#02040a] font-black text-xs shadow-md shadow-[#2cecf7]/30 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">person</span>
                <span>Go to Profile</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </Link>
              <button
                type="button"
                onClick={() => setFavSuccessPopup(null)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 pt-24 sm:pt-28 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* ════════════════════ 1. TOP HERO SPLIT (METADATA + 3D PERSPECTIVE MOCKUPS) ════════════════════ */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pt-2 pb-4">
              {/* Left Column: Breadcrumb, Category, Title, Subtitle, Author, Ratings */}
              <div className="lg:col-span-6 space-y-4">
                {/* Breadcrumbs */}
                <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Link href="/" className="hover:text-slate-900 dark:hover:text-white flex items-center transition-colors">
                    <span className="material-symbols-outlined text-sm">home</span>
                  </Link>
                  <span>&gt;</span>
                  <Link href="/landing-page-designs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    Designs
                  </Link>
                  <span>&gt;</span>
                  <Link
                    href={`/landing-page-designs?category=${design.category}`}
                    className="capitalize hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    {design.categoryName || design.category}
                  </Link>
                  <span>&gt;</span>
                  <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-[200px]">
                    {design.title}
                  </span>
                </nav>

                {/* Category Pill Badge */}
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2cecf7]/10 dark:bg-[#2cecf7]/15 text-[#008f9b] dark:text-[#2cecf7] border border-[#2cecf7]/30 text-xs font-bold tracking-wide">
                    <span className="material-symbols-outlined text-sm">category</span>
                    <span>{design.categoryName || "Portfolio"}</span>
                  </span>
                </div>

                {/* Big Bold Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.08]">
                  {design.title}
                </h1>

                {/* Subtitle / Description */}
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                  {design.shortDescription || design.fullDescription}
                </p>

                {/* Author Bar */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm">
                    DE
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-sm font-bold text-slate-900 dark:text-white">DevEngine HQ</strong>
                      <span
                        className="w-4 h-4 rounded-full bg-[#2cecf7] text-[#02040a] flex items-center justify-center text-[10px] font-black"
                        title="Verified Studio"
                      >
                        ✓
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        D-PRO
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Available for custom work</span>
                    </div>
                  </div>
                </div>

                {/* Stats row (Rating + Sales) */}
                <div className="flex items-center gap-5 text-xs font-semibold text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500 text-sm">★</span>
                    <span className="font-bold text-slate-900 dark:text-white">5.0</span>
                    <span className="text-slate-400">({reviews.length || 5} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-[#00c5d4] dark:text-[#2cecf7]">bolt</span>
                    <span>
                      {(design.salesCount || 3200) >= 1000
                        ? `${((design.salesCount || 3200) / 1000).toFixed(1)}k+`
                        : design.salesCount}{" "}
                      sales
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: 3D Perspective Floating Mockup Composition with Animated Auto-Swipe */}
              <div
                className="lg:col-span-6 relative flex items-center justify-center min-h-[320px] sm:min-h-[420px] overflow-hidden select-none group/deck"
                onMouseEnter={() => setIsHeroSwipePaused(true)}
                onMouseLeave={() => setIsHeroSwipePaused(false)}
              >
                {/* 3D Mockup Card with animated auto swipe */}
                <div
                  className="relative w-full max-w-lg aspect-[16/11] flex items-center justify-center cursor-pointer"
                  style={{ perspective: "1200px" }}
                  onClick={() => handleNextHeroSlide()}
                  title="Click to swipe next mockup (auto-plays every 3.4s)"
                >
                  {heroDeckSlides.map((slide, idx) => {
                    const offset = (idx - heroSlideIndex + heroDeckSlides.length) % heroDeckSlides.length;
                    const isFront = offset === 0;

                    // Clean presentation without offset white ghost cards in the background
                    let transformStyle = "";
                    let zIndex = 10;
                    let opacity = 0;
                    let pointerEvents: "auto" | "none" = "none";

                    if (isFront) {
                      zIndex = 30;
                      opacity = isSwipingTurn ? 0.35 : 1;
                      pointerEvents = "auto";
                      if (isSwipingTurn) {
                        transformStyle =
                          swipeDirection === "next"
                            ? "perspective(1200px) rotateY(-20deg) rotateX(6deg) translateX(-40px) scale(0.97)"
                            : "perspective(1200px) rotateY(20deg) rotateX(6deg) translateX(40px) scale(0.97)";
                      } else {
                        transformStyle = "perspective(1200px) rotateY(-6deg) rotateX(4deg) translateZ(0px) scale(1)";
                      }
                    } else {
                      zIndex = 5;
                      opacity = 0;
                      pointerEvents = "none";
                      transformStyle = "perspective(1200px) rotateY(0deg) translateZ(-50px) scale(0.95)";
                    }

                    return (
                      <div
                        key={slide.id}
                        className={`absolute w-72 sm:w-96 md:w-[420px] aspect-[16/10] rounded-2xl sm:rounded-3xl bg-slate-950 border overflow-hidden shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isFront
                            ? "border-slate-300 dark:border-slate-700/80 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                            : "border-transparent opacity-0 pointer-events-none"
                        }`}
                        style={{
                          transform: transformStyle,
                          zIndex,
                          opacity,
                          pointerEvents,
                        }}
                      >
                        {/* Browser Toolbar Header */}
                        <div className="h-6 sm:h-7 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700/70 px-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-mono text-slate-600 dark:text-slate-400 truncate max-w-[160px] sm:max-w-[200px] text-center">
                            {slide.title}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7] animate-ping" />
                            <span className="text-[8px] font-mono font-bold text-[#008f9b] dark:text-[#2cecf7]">
                              AUTO
                            </span>
                          </div>
                        </div>

                        {/* Image Showcase */}
                        <div className="relative w-full h-[calc(100%-24px)] sm:h-[calc(100%-28px)] bg-slate-950 overflow-hidden">
                          <img
                            src={slide.url}
                            alt={slide.badge}
                            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                          />

                          {/* Subtle Bottom-only Vignette for Badge Readability */}
                          {isFront && (
                            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
                          )}

                          {/* Front Card Interactive Controls & Badge */}
                          {isFront && (
                            <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white pointer-events-auto">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#02040a]/85 backdrop-blur-md text-[#2cecf7] border border-[#2cecf7]/30 shadow">
                                {slide.badge}
                              </span>

                              {/* Interactive Paging Pips */}
                              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2 py-1 rounded-full border border-white/15">
                                {heroDeckSlides.map((_, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHeroSlideIndex(pIdx);
                                    }}
                                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                      heroSlideIndex === pIdx
                                        ? "w-4 bg-[#2cecf7] shadow-[0_0_8px_rgba(44,236,247,0.8)]"
                                        : "w-1.5 bg-white/40 hover:bg-white/80"
                                    }`}
                                    title={`Slide ${pIdx + 1}`}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Manual Swipe Arrows on Hover */}
                  <button
                    type="button"
                    onClick={(e) => handlePrevHeroSlide(e)}
                    className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-[#070e1a]/95 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center opacity-0 group-hover/deck:opacity-100 transition-all hover:scale-110 hover:border-[#2cecf7] cursor-pointer"
                    title="Previous preview (swipe back)"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleNextHeroSlide(e)}
                    className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-40 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/95 dark:bg-[#070e1a]/95 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center opacity-0 group-hover/deck:opacity-100 transition-all hover:scale-110 hover:border-[#2cecf7] cursor-pointer"
                    title="Next preview (swipe forward)"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            </section>

            {/* ════════════════════ 2. VIEW SWITCHER & ACTION TOOLBAR BAR ════════════════════ */}
            <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 py-4 my-6 border-y border-slate-200/80 dark:border-slate-800">
              {/* Segmented View Control (Preview, Desktop, Tablet, Mobile, Components) */}
              <div className="flex items-center gap-1 p-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 overflow-x-auto">
                {[
                  { key: "preview" as const, label: "Preview", icon: "play_arrow" },
                  { key: "desktop" as const, label: "Desktop", icon: "desktop_windows" },
                  { key: "tablet" as const, label: "Tablet", icon: "tablet_mac" },
                  { key: "mobile" as const, label: "Mobile", icon: "smartphone" },
                  { key: "components" as const, label: "Components", icon: "widgets" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveView(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      activeView === tab.key
                        ? "bg-[#2cecf7] text-[#02040a] shadow-[0_2px_12px_rgba(44,236,247,0.35)]"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Right: Actions (Likes Pill, Share, Primary Purchase CTA) */}
              <div className="flex items-center gap-2.5 self-end sm:self-auto">
                {/* Heart / Favorites Count */}
                <button
                  type="button"
                  onClick={handleToggleFavorite}
                  className={`relative overflow-visible px-3.5 py-2 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isFavorite
                      ? "border-rose-500/50 bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.35)]"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-rose-400 hover:text-rose-500"
                  } ${isHeartBouncing ? "scale-110 border-rose-400" : ""}`}
                  title={isFavorite ? "Saved" : "Save shot"}
                >
                  {isHeartBouncing && (
                    <span className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping pointer-events-none" />
                  )}
                  <span
                    className={`material-symbols-outlined text-base transition-transform duration-300 ${
                      isFavorite ? "text-rose-500 font-fill" : ""
                    } ${isHeartBouncing ? "scale-140 -rotate-12 animate-bounce" : ""}`}
                  >
                    {isFavorite ? "favorite" : "favorite_border"}
                  </span>
                  <span className={isHeartBouncing ? "scale-110 font-black text-rose-500" : ""}>
                    {likesCount > 0 ? likesCount : 14}
                  </span>
                </button>

                {/* Share Link */}
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-[#2cecf7] flex items-center justify-center transition-colors cursor-pointer"
                  title="Share link"
                >
                  <span className="material-symbols-outlined text-base">share</span>
                </button>

                {/* Purchase CTA Pill Button */}
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="px-5 py-2 rounded-full bg-[#2cecf7] text-[#02040a] hover:bg-[#20d8e2] font-black text-xs transition-all shadow-[0_4px_14px_rgba(44,236,247,0.35)] flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">shopping_cart</span>
                  <span>
                    {design.isFree
                      ? "Download Free"
                      : `Purchase for ${design.currency === "BDT" ? "৳" : "$"}${design.price?.toLocaleString() || "3,900"}`}
                  </span>
                </button>
              </div>
            </section>

            {/* ════════════════════ 3. MAIN CONTENT GRID (SHOWCASE CARD + COMMERCIAL LICENSE CARD) ════════════════════ */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT COLUMN: Main Showcase & Thumbnails Card (lg:col-span-8) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="rounded-[32px] bg-white dark:bg-[#070e1a] p-4 sm:p-5 border border-slate-200/90 dark:border-slate-800 shadow-xl overflow-hidden space-y-4">
                  {/* Dynamic Presentation Screen */}
                  <div className="rounded-2xl overflow-hidden bg-black aspect-[16/10] sm:aspect-[16/9] w-full relative shadow-inner">
                    {activeView === "preview" ? (
                      <iframe
                        src={embedVideoUrl}
                        title={`${design.title} motion video showcase`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : activeView === "desktop" ? (
                      <div
                        onClick={() => setLightboxImage(design.thumbnailUrl)}
                        className="w-full h-full cursor-zoom-in bg-slate-950 flex items-center justify-center"
                        title="Click to inspect full resolution"
                      >
                        <img
                          src={design.thumbnailUrl}
                          alt={`${design.title} desktop layout`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : activeView === "tablet" ? (
                      <div
                        onClick={() => setLightboxImage(design.tabletScreenshot || design.thumbnailUrl)}
                        className="w-full h-full cursor-zoom-in bg-slate-950 flex items-center justify-center p-3 sm:p-6"
                        title="Click to inspect tablet layout"
                      >
                        <div className="w-[88%] h-full rounded-2xl border-4 border-slate-800 bg-black overflow-hidden shadow-2xl">
                          <img
                            src={design.tabletScreenshot || design.thumbnailUrl}
                            alt={`${design.title} tablet layout`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : activeView === "mobile" ? (
                      <div
                        onClick={() => setLightboxImage(design.mobileScreenshot || design.thumbnailUrl)}
                        className="w-full h-full cursor-zoom-in bg-slate-950 flex items-center justify-center p-3 sm:p-6"
                        title="Click to inspect mobile responsive layout"
                      >
                        <div className="w-48 sm:w-56 h-full rounded-3xl border-4 border-slate-800 bg-black overflow-hidden shadow-2xl">
                          <img
                            src={design.mobileScreenshot || design.thumbnailUrl}
                            alt={`${design.title} mobile layout`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Components & Tokens view */
                      <div
                        onClick={() =>
                          setLightboxImage(
                            design.tabletScreenshot ||
                              (design.previewImages && design.previewImages[0]) ||
                              design.thumbnailUrl
                          )
                        }
                        className="w-full h-full cursor-zoom-in bg-slate-950 p-6 flex flex-col justify-between"
                        title="Click to inspect design system tokens"
                      >
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs">
                            <strong className="block text-[#2cecf7]">Typography</strong>
                            <span className="text-[11px] text-slate-400">Space Grotesk</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs">
                            <strong className="block text-[#2cecf7]">Color Tokens</strong>
                            <span className="text-[11px] text-slate-400">#2cecf7 Exact Brand</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs">
                            <strong className="block text-[#2cecf7]">Motion</strong>
                            <span className="text-[11px] text-slate-400">Framer Springs</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-white text-xs">
                            <strong className="block text-[#2cecf7]">Format</strong>
                            <span className="text-[11px] text-slate-400">Next.js 14 + Figma</span>
                          </div>
                        </div>
                        <div className="text-center text-xs text-slate-400">
                          Click visual to open high-resolution design system tokens sheet
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sub Status Bar */}
                  <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-400 flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                        Interactive Motion Reel • 60FPS Micro-Interactions
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      Framer Motion &amp; Next.js
                    </div>
                  </div>

                  {/* Thumbnails Row Matching Image */}
                  <div className="flex items-center gap-3 pt-1 overflow-x-auto pb-1">
                    {/* Thumb 1: Video poster */}
                    <button
                      type="button"
                      onClick={() => setActiveView("preview")}
                      className={`w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeView === "preview"
                          ? "border-[#2cecf7] shadow-[0_0_12px_rgba(44,236,247,0.4)] scale-105"
                          : "border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                      title="Motion video reel"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=400&auto=format&fit=crop"
                        alt="Video reel"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Thumb 2: Desktop layout */}
                    <button
                      type="button"
                      onClick={() => setActiveView("desktop")}
                      className={`w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeView === "desktop"
                          ? "border-[#2cecf7] shadow-[0_0_12px_rgba(44,236,247,0.4)] scale-105"
                          : "border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                      title="Desktop layout"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=400&auto=format&fit=crop"
                        alt="Dark dashboard"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Thumb 3: Light Hero layout */}
                    <button
                      type="button"
                      onClick={() => setActiveView("tablet")}
                      className={`w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeView === "tablet"
                          ? "border-[#2cecf7] shadow-[0_0_12px_rgba(44,236,247,0.4)] scale-105"
                          : "border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                      title="Tablet layout"
                    >
                      <img
                        src={design.thumbnailUrl}
                        alt="Hero design"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Thumb 4: Mobile / Editorial layout */}
                    <button
                      type="button"
                      onClick={() => setActiveView("mobile")}
                      className={`w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                        activeView === "mobile"
                          ? "border-[#2cecf7] shadow-[0_0_12px_rgba(44,236,247,0.4)] scale-105"
                          : "border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100"
                      }`}
                      title="Mobile view"
                    >
                      <img
                        src="https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=400&auto=format&fit=crop"
                        alt="Editorial layout"
                        className="w-full h-full object-cover"
                      />
                    </button>

                    {/* Thumb 5: +2 count card to open Lightbox */}
                    <button
                      type="button"
                      onClick={() => setLightboxImage(design.thumbnailUrl)}
                      className="w-20 sm:w-24 aspect-[16/10] rounded-xl bg-slate-100 dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-sm shrink-0 hover:border-[#2cecf7] hover:text-[#008f9b] dark:hover:text-[#2cecf7] transition-all cursor-pointer"
                      title="View all assets"
                    >
                      +2
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Elevated Commercial License Card (lg:col-span-4) */}
              <div className="lg:col-span-4">
                <div className="rounded-[32px] bg-white dark:bg-[#070e1a] p-6 sm:p-7 border border-slate-200/90 dark:border-slate-800 shadow-xl sticky top-28 space-y-5">
                  {/* License Header */}
                  <div className="flex items-center justify-between text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-lg">
                        verified_user
                      </span>
                      <span>Commercial License</span>
                    </div>
                    <span
                      className="material-symbols-outlined text-slate-400 text-base cursor-help"
                      title="Includes unlimited client & commercial production usage"
                    >
                      info
                    </span>
                  </div>

                  {/* Price Row */}
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                      {design.currency === "BDT" ? "৳" : "$"}{design.price?.toLocaleString() || "3,900"}
                    </span>
                    {design.originalPrice && (
                      <span className="text-slate-400 text-base line-through font-semibold">
                        {design.currency === "BDT" ? "৳" : "$"}{design.originalPrice?.toLocaleString() || "4,900"}
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      -{design.discountPercent || 20}%
                    </span>
                  </div>

                  {/* Checklist */}
                  <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    {[
                      "Instant delivery after purchase",
                      "Use in client & commercial projects",
                      "Lifetime updates",
                      "Free improvements & fixes",
                      "Full documentation",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-base shrink-0">
                          check
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(true)}
                      className="w-full py-3.5 rounded-2xl bg-[#2cecf7] text-[#02040a] hover:bg-[#20d8e2] font-black text-xs sm:text-sm transition-all shadow-[0_4px_16px_rgba(44,236,247,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-lg">shopping_cart</span>
                      <span>Purchase &amp; Instant Delivery</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsBuildTogetherOpen(true)}
                      className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-[#2cecf7] bg-transparent text-slate-800 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">chat</span>
                      <span>Get in touch</span>
                    </button>
                  </div>

                  {/* Trust Footer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-5 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#00a8b5] dark:text-[#2cecf7]">shield</span>
                      <span>Secure payment</span>
                    </div>
                    <span>|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#00a8b5] dark:text-[#2cecf7]">bolt</span>
                      <span>Instant access</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ════════════════════ 4. ARCHITECTURE, WHAT'S INCLUDED & TECHNOLOGIES CARD ════════════════════ */}
            <section className="rounded-[32px] bg-white dark:bg-[#070e1a] p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xl mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Overview & Architecture */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-lg">architecture</span>
                  <h4>Overview &amp; Architecture</h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {design.fullDescription ||
                    "A refined portfolio page for designers, photographers, and independent makers, with a clean layout, smooth interactions, and a modern, professional look."}
                </p>
              </div>

              {/* What's Included */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-lg">redeem</span>
                  <h4>What's Included</h4>
                </div>
                <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  {(design.whatsIncluded || [
                    "Full Responsive Code (Next.js & React)",
                    "Framer Motion Smooth Animations",
                    "Figma Design System & Components",
                    "Commercial Lifetime License",
                    "Free Updates & Documentation",
                  ]).map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-sm shrink-0">
                        check_circle
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technologies & Specs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                  <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-lg">code</span>
                  <h4>Technologies</h4>
                </div>

                {/* Tech Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { name: "Next.js", icon: "N" },
                    { name: "React", icon: "⚛" },
                    { name: "TypeScript", icon: "TS" },
                    { name: "CSS", icon: "3" },
                  ].map((tech) => (
                    <span
                      key={tech.name}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                    >
                      <span className="text-[#00a8b5] dark:text-[#2cecf7] font-mono text-[10px]">{tech.icon}</span>
                      <span>{tech.name}</span>
                    </span>
                  ))}
                </div>

                {/* Metadata list */}
                <div className="pt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500">License:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Commercial Lifetime</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                    <span className="text-slate-500">Delivery:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Protected Digital Delivery</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Support:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Included Direct</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ════════════════════ 5. CUSTOMIZATION / FULL-STACK TAKEOVER BANNER ════════════════════ */}
            <section className="rounded-[28px] p-6 sm:p-7 border border-[#2cecf7]/30 bg-gradient-to-r from-[#2cecf7]/10 via-sky-500/5 to-transparent dark:from-[#0a2538] dark:to-[#071322] flex flex-col sm:flex-row items-center justify-between gap-5 shadow-lg mt-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00bcd4] to-[#2cecf7] text-[#02040a] flex items-center justify-center font-mono font-black text-lg shadow-[0_4px_16px_rgba(44,236,247,0.35)] shrink-0">
                  &lt;/&gt;
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Need customization or full-stack takeover?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                    DevEngine engineers custom brand identities, high-conversion landing pages, and backend integrations.
                  </p>
                </div>
              </div>

              <Link
                href="/services"
                className="px-6 py-2.5 rounded-full border border-[#2cecf7] bg-white/80 dark:bg-slate-900/80 text-slate-900 dark:text-[#2cecf7] hover:bg-[#2cecf7] hover:text-[#02040a] font-bold text-xs transition-all shadow-sm shrink-0 flex items-center gap-1.5"
              >
                <span>Hire DevEngine Studio</span>
                <span className="material-symbols-outlined text-sm">arrow_outward</span>
              </Link>
            </section>

            {/* ════════════════════ 6. CUSTOMER REVIEWS & RATINGS SECTION ════════════════════ */}
            <section className="mt-12 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-xl">chat</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      Customer Reviews &amp; Ratings
                    </h3>
                    <p className="text-xs text-slate-500">Real feedback from verified purchasers</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">5.0</span>
                  <div className="flex text-amber-500 text-sm">★★★★★</div>
                  <span className="text-xs text-slate-500 font-medium">({reviews.length || 5} reviews)</span>
                </div>
              </div>

              {/* 2-Column Review Display */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Review Cards List (lg:col-span-7) */}
                <div className="lg:col-span-7 space-y-4">
                  {(reviews.length > 0
                    ? reviews
                    : [
                        {
                          id: "rev_demo",
                          customerName: "Liam Vance",
                          rating: 5,
                          comment:
                            "Minimal, gorgeous typography, and the dark mode switch is pure elegance. Client inquiries jumped by 40% after re-launching with Framefolio.",
                          createdAt: "2026-02-12T11:00:00.000Z",
                        },
                      ]
                  ).map((rev, idx) => (
                    <div
                      key={rev.id || idx}
                      className="rounded-2xl bg-white dark:bg-[#070e1a] p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white shrink-0">
                            {rev.customerName ? rev.customerName.slice(0, 2).toUpperCase() : "LV"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {rev.customerName || "Liam Vance"}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                Verified Purchase
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex text-amber-500 text-xs">
                          {"★".repeat(rev.rating || 5)}
                          {"☆".repeat(5 - (rev.rating || 5))}
                        </div>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{rev.comment}</p>

                      <span className="text-[11px] text-slate-400 block font-mono">
                        {new Date(rev.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Right: Write a Customer Review Card (lg:col-span-5) */}
                <div className="lg:col-span-5">
                  <form
                    onSubmit={handleSubmitReview}
                    className="rounded-2xl bg-white dark:bg-[#070e1a] p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-3"
                  >
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Write a Customer Review
                    </h4>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Your Rating</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewRating(star)}
                            className={`text-base transition-colors cursor-pointer ${
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
                      placeholder="Share your feedback on the layout, responsiveness, animations, and code quality..."
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#2cecf7]"
                    />

                    <button
                      type="submit"
                      disabled={submittingReview || !reviewComment.trim()}
                      className="w-full py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs hover:bg-[#20d8e2] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                </div>
              </div>
            </section>

            {/* ════════════════════ 7. MORE BY DEVENGINE HQ SECTION ════════════════════ */}
            <section className="mt-14 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00a8b5] dark:text-[#2cecf7] text-xl">layers</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                      More by DevEngine HQ
                    </h3>
                    <p className="text-xs text-slate-500">Explore other high-performance landing pages.</p>
                  </div>
                </div>

                <Link
                  href="/landing-page-designs"
                  className="text-xs font-bold text-[#00a8b5] dark:text-[#2cecf7] hover:underline flex items-center gap-1"
                >
                  <span>View All Designs</span>
                  <span>→</span>
                </Link>
              </div>

              {/* 3 Signature Cards Grid Matching Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedDesigns.map((rel) => (
                  <div
                    key={rel.id}
                    className="rounded-3xl bg-white dark:bg-[#070e1a] border border-slate-200/90 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                  >
                    {/* Thumbnail with pills */}
                    <div className="relative aspect-[16/10] bg-slate-900 overflow-hidden">
                      <Link href={`/landing-page-designs/${rel.slug}`} className="block w-full h-full">
                        <img
                          src={rel.thumbnailUrl}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      </Link>

                      {/* Top badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#02040a]/70 backdrop-blur-md text-[#2cecf7] border border-white/10">
                          {rel.categoryName || rel.category}
                        </span>
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const activeUid = userUid || auth.currentUser?.uid || getGuestUser()?.uid;
                            if (!activeUid) {
                              setAuthSheetAction("favorite");
                              setIsAuthSheetOpen(true);
                              return;
                            }
                            const saved = await toggleFavoriteDesign(rel.id, activeUid);
                            if (saved) {
                              setFavSuccessPopup({
                                isOpen: true,
                                designTitle: rel.title,
                                designSlug: rel.slug,
                              });
                            } else {
                              showToast("Removed from favorites.");
                            }
                          }}
                          className="w-7 h-7 rounded-full bg-white/90 dark:bg-[#02040a]/80 backdrop-blur-md flex items-center justify-center text-slate-700 dark:text-slate-200 hover:text-rose-500 pointer-events-auto transition-colors cursor-pointer active:scale-125"
                        >
                          <span className="material-symbols-outlined text-sm">favorite_border</span>
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <Link href={`/landing-page-designs/${rel.slug}`}>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#00a8b5] dark:group-hover:text-[#2cecf7] transition-colors">
                            {rel.title}
                          </h4>
                        </Link>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {rel.shortDescription}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[9px] font-bold">
                            DE
                          </div>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                            DevEngine HQ
                          </span>
                          <span className="w-3.5 h-3.5 rounded-full bg-[#2cecf7] text-[#02040a] flex items-center justify-center text-[8px] font-black">
                            ✓
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-amber-500 text-[11px]">★ {rel.rating || "4.8"}</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {rel.currency === "BDT" ? "৳" : "$"}{rel.price?.toLocaleString() || "4,900"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
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

                  <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href="/guest-profile"
                      className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#2cecf7] transition-all"
                    >
                      View in Guest Profile
                    </Link>
                    <button
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setCompletedOrder(null);
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-black text-xs hover:bg-[#2cecf7]/90 transition-all cursor-pointer"
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

        {/* Build Together Request Sheet */}
        {isBuildTogetherOpen && design && (
          <PurchaseRequestSheet
            design={design}
            onClose={() => setIsBuildTogetherOpen(false)}
          />
        )}

        {/* Guest Auth Sheet (Sign in or Create Account) */}
        <GuestAuthSheet
          isOpen={isAuthSheetOpen}
          onClose={() => setIsAuthSheetOpen(false)}
          onSuccess={handleAuthSuccess}
          title={
            authSheetAction === "favorite"
              ? "Save to Your Collection"
              : authSheetAction === "review"
              ? "Submit Customer Review"
              : "Guest Account Access"
          }
          description={
            authSheetAction === "favorite"
              ? "Sign in or create a guest account to save this landing page design to your inspiration collection."
              : "Sign in or create a guest account to submit verified feedback and ratings."
          }
        />
      </div>
    </>
  );
}
