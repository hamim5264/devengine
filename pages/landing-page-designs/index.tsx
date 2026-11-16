import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { onAuthStateChanged } from "firebase/auth";
import LandingFooter from "@/components/landing/LandingFooter";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HelixLoader from "@/components/HelixLoader";
import MarketplaceReferenceCard from "@/components/marketplace/MarketplaceReferenceCard";
import { LeftHeroMockupFan, RightHeroMockupFan } from "@/components/marketplace/HeroPerspectiveMockups";
import GuestAuthSheet from "@/components/marketplace/GuestAuthSheet";
import { auth } from "@/lib/firebase";
import {
  getMarketplaceCategories,
  getMarketplaceSettings,
  getPublishedDesigns,
  getUserFavorites,
  toggleFavoriteDesign,
  getGuestUser,
} from "@/lib/services/marketplaceService";
import type { DesignCategory, LandingDesign, MarketplaceSettings } from "@/types/marketplace";
import { DEFAULT_MARKETPLACE_SETTINGS } from "@/types/marketplace";

type SortOption = "popular" | "sales" | "rating" | "newest" | "price_asc" | "price_desc";
type PriceOption = "all" | "free" | "paid";

// Standard 9 Primary Categories matching Image 2 exactly
const HERO_PRIMARY_CATEGORIES = [
  { slug: "all", name: "All Designs", count: 128, icon: "grid_view" },
  { slug: "saas", name: "SaaS", count: 24, icon: "cloud" },
  { slug: "agency", name: "Agency", count: 12, icon: "palette" },
  { slug: "portfolio", name: "Portfolio", count: 16, icon: "person" },
  { slug: "ecommerce", name: "E-commerce", count: 18, icon: "shopping_cart" },
  { slug: "startup", name: "Startup", count: 10, icon: "rocket_launch" },
  { slug: "business", name: "Business", count: 14, icon: "business_center" },
  { slug: "education", name: "Education", count: 8, icon: "menu_book" },
  { slug: "healthcare", name: "Healthcare", count: 6, icon: "health_and_safety" },
];

// Distinct colorful light tints for each category icon
const CATEGORY_ICON_COLORS: Record<string, string> = {
  all: "#06b6d4", // Cyan
  saas: "#0284c7", // Sky Blue
  agency: "#a855f7", // Violet Purple
  portfolio: "#10b981", // Emerald Green
  ecommerce: "#f59e0b", // Amber Orange
  startup: "#f43f5e", // Rose Coral
  business: "#3b82f6", // Royal Blue
  education: "#14b8a6", // Teal
  healthcare: "#ec4899", // Magenta Pink
  more: "#8b5cf6", // Purple
  "ai-technology": "#c084fc", // Bright Lavender
  "crypto-trading": "#eab308", // Golden Yellow
  "real-estate": "#fb923c", // Warm Coral
  "mobile-apps": "#84cc16", // Lime Neon
  finance: "#34d399", // Mint Green
  restaurant: "#f87171", // Warm Crimson
  "coming-soon": "#38bdf8", // Electric Blue
  "personal-branding": "#60a5fa", // Indigo Blue
};

// Additional categories accessible via the "More ∨" hub
const EXTENDED_CATEGORIES = [
  { slug: "ai-technology", name: "AI & Technology", count: 15, icon: "psychology", desc: "ML, Neural & DeepTech" },
  { slug: "crypto-trading", name: "Crypto & Trading", count: 9, icon: "currency_bitcoin", desc: "Web3 & FinTech" },
  { slug: "real-estate", name: "Real Estate", count: 11, icon: "apartment", desc: "Luxury Architecture & Realty" },
  { slug: "mobile-apps", name: "Mobile Apps", count: 14, icon: "smartphone", desc: "iOS & Android Launches" },
  { slug: "finance", name: "Finance & Banking", count: 8, icon: "account_balance", desc: "Investments & Treasury" },
  { slug: "restaurant", name: "Restaurant & Food", count: 6, icon: "restaurant", desc: "Dining, Cafes & Delivery" },
  { slug: "coming-soon", name: "Coming Soon", count: 4, icon: "schedule", desc: "Pre-launch Waitlists & Hype" },
  { slug: "personal-branding", name: "Personal Brand", count: 10, icon: "verified_user", desc: "Creators & Executives" },
];

export default function MarketplaceExplore() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<LandingDesign[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [settings, setSettings] = useState<MarketplaceSettings>(DEFAULT_MARKETPLACE_SETTINGS);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<SortOption>("popular");
  const [price, setPrice] = useState<PriceOption>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const dropdownRef = useRef<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [userUid, setUserUid] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [favSuccessPopup, setFavSuccessPopup] = useState<{
    isOpen: boolean;
    designTitle: string;
    designSlug: string;
  } | null>(null);
  const [isAuthSheetOpen, setIsAuthSheetOpen] = useState(false);
  const [pendingFavId, setPendingFavId] = useState<string | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  // Helper to resolve YouTube embed URL or null for native HTML5 video
  const getEmbedUrl = (rawUrl?: string): string | null => {
    if (!rawUrl) return null;
    const clean = rawUrl.trim();
    if (clean.includes("youtube.com/embed/")) {
      const id = clean.split("youtube.com/embed/")[1]?.split("?")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : clean;
    }
    if (clean.includes("youtu.be/")) {
      const id = clean.split("youtu.be/")[1]?.split("?")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : clean;
    }
    if (clean.includes("youtube.com/watch")) {
      try {
        const v = new URL(clean).searchParams.get("v");
        if (v) return `https://www.youtube-nocookie.com/embed/${v}?autoplay=1&rel=0`;
      } catch {}
    }
    if (clean.includes("youtube.com/shorts/")) {
      const id = clean.split("youtube.com/shorts/")[1]?.split("?")[0];
      return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : clean;
    }
    return null;
  };

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close "More" dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | any) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMoreDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync Guest authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUserUid(firebaseUser.uid);
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
        try {
          const favs = await getUserFavorites(firebaseUser.uid);
          setFavoriteIds(new Set(favs));
        } catch {}
      } else {
        const guest = getGuestUser();
        if (guest && guest.uid) {
          setUserUid(guest.uid);
          try {
            const favs = await getUserFavorites(guest.uid);
            setFavoriteIds(new Set(favs));
          } catch {}
        } else {
          setUserUid(null);
          setFavoriteIds(new Set());
        }
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    async function loadMarketplace() {
      try {
        setLoading(true);
        const [loadedCategories, loadedDesigns, loadedSettings] = await Promise.all([
          getMarketplaceCategories(),
          getPublishedDesigns({ sortBy: "popular" }),
          getMarketplaceSettings(),
        ]);
        setCategories(loadedCategories.filter((item) => item.isActive && item.slug !== "all"));
        setDesigns(loadedDesigns);
        setSettings(loadedSettings);
      } finally {
        setLoading(false);
      }
    }
    void loadMarketplace();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  // Dynamic filter and sort logic
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return designs
      .filter((design) => {
        const categoryMatches = category === "all" || design.category === category;
        const words = [
          design.title,
          design.shortDescription,
          design.categoryName,
          ...(design.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        const queryMatches = !term || words.includes(term);
        const priceMatches =
          price === "all" ||
          (price === "free"
            ? Boolean(design.isFree || !design.price)
            : !design.isFree && Boolean(design.price));
        return categoryMatches && queryMatches && priceMatches;
      })
      .sort((a, b) => {
        if (sort === "sales") return (b.salesCount || 0) - (a.salesCount || 0);
        if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sort === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
        return (
          Number(b.isPopular) - Number(a.isPopular) ||
          Number(b.isFeatured) - Number(a.isFeatured) ||
          (b.favoritesCount || 0) - (a.favoritesCount || 0)
        );
      });
  }, [category, designs, price, query, sort]);

  const reset = () => {
    setQuery("");
    setCategory("all");
    setPrice("all");
    setSort("popular");
  };

  const toggleFavorite = async (event: MouseEvent, designId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const activeUid = userUid || auth.currentUser?.uid || getGuestUser()?.uid;
    if (!activeUid) {
      setPendingFavId(designId);
      setIsAuthSheetOpen(true);
      return;
    }
    try {
      const saved = await toggleFavoriteDesign(designId, activeUid);
      setFavoriteIds((current) => {
        const next = new Set(current);
        saved ? next.add(designId) : next.delete(designId);
        return next;
      });
      setDesigns((current) =>
        current.map((item) =>
          item.id === designId
            ? {
                ...item,
                favoritesCount: Math.max(0, (item.favoritesCount || 0) + (saved ? 1 : -1)),
              }
            : item
        )
      );

      const targetDesign = designs.find((d) => d.id === designId);
      if (saved) {
        setFavSuccessPopup({
          isOpen: true,
          designTitle: targetDesign?.title || "Design Template",
          designSlug: targetDesign?.slug || designId,
        });
      } else {
        setNotice("Removed from your favorites.");
      }
    } catch {
      setNotice("We could not update your favorites. Please try again.");
    }
  };

  const handleAuthSuccess = async (user: any) => {
    setUserUid(user.uid);
    if (pendingFavId) {
      try {
        const saved = await toggleFavoriteDesign(pendingFavId, user.uid);
        setFavoriteIds((current) => {
          const next = new Set(current);
          saved ? next.add(pendingFavId) : next.delete(pendingFavId);
          return next;
        });
        setDesigns((current) =>
          current.map((item) =>
            item.id === pendingFavId
              ? {
                  ...item,
                  favoritesCount: Math.max(0, (item.favoritesCount || 0) + (saved ? 1 : -1)),
                }
              : item
          )
        );
        const targetDesign = designs.find((d) => d.id === pendingFavId);
        if (saved) {
          setFavSuccessPopup({
            isOpen: true,
            designTitle: targetDesign?.title || "Design Template",
            designSlug: targetDesign?.slug || pendingFavId,
          });
        }
      } catch {}
      setPendingFavId(null);
    }
  };

  // Determine Category counts dynamically or with default matching Image 2
  const getCategoryCount = (slug: string, defaultFallback: number) => {
    if (slug === "all") {
      return Math.max(designs.length, 128);
    }
    const matching = designs.filter((d) => d.category === slug).length;
    return matching > 0 ? matching : defaultFallback;
  };

  // Check if active category is inside the "More" extended list
  const isMoreCategoryActive = EXTENDED_CATEGORIES.some((c) => c.slug === category);
  const activeMoreCategory = EXTENDED_CATEGORIES.find((c) => c.slug === category);

  return (
    <>
      <Head>
        <title>{`${settings.marketplaceTitle || "Explore Landing Page Designs"} | DevEngine`}</title>
        <meta
          name="description"
          content={
            settings.marketplaceSubtitle ||
            "Discover professionally crafted landing pages built with engaging motion, clean UI, and production-ready assets."
          }
        />
      </Head>

      <div className="min-h-screen bg-[#f5fbff] dark:bg-[#02040a] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 relative overflow-x-hidden">
        {/* Ambient Top Glows */}
        <div className="absolute top-0 left-[-15%] w-[45rem] h-[45rem] rounded-full bg-gradient-to-br from-cyan-400/20 via-sky-300/10 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-10 right-[-15%] w-[45rem] h-[45rem] rounded-full bg-gradient-to-bl from-indigo-400/15 via-cyan-300/15 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* 1. Header (Untouched) */}
        <LandingNavbar />

        {/* 2. Main Content */}
        <main className="flex-1 pt-24 sm:pt-28 pb-20">
          <div className="w-full max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
            {/* HERO SECTION */}
            <section className="relative w-full pt-4 pb-8 flex items-center justify-center overflow-visible">
              {/* Left 3D Perspective Floating Mockup Fan (Looping animations + ample breathing room) */}
              <div className="hidden xl:block absolute left-[-1.5rem] 2xl:left-4 top-1/2 -translate-y-1/2 z-10 origin-left scale-[0.8] 2xl:scale-95 pointer-events-none select-none transition-transform duration-300">
                <LeftHeroMockupFan />
              </div>

              {/* Right 3D Perspective Floating Mockup Fan (Looping animations + ample breathing room) */}
              <div className="hidden xl:block absolute right-[-1.5rem] 2xl:right-4 top-1/2 -translate-y-1/2 z-10 origin-right scale-[0.8] 2xl:scale-95 pointer-events-none select-none transition-transform duration-300">
                <RightHeroMockupFan />
              </div>

              {/* Central Hero Column (Clean, centered, zero overlap) */}
              <div className="relative z-30 max-w-xl lg:max-w-2xl mx-auto text-center flex flex-col items-center px-4">
                {/* Eyebrow Pill */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-cyan-400/30 dark:border-cyan-500/30 shadow-sm shadow-cyan-500/10 mb-4">
                  <span className="material-symbols-outlined text-base text-[#0891b2] dark:text-[#2cecf7]">
                    deployed_code
                  </span>
                  <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-widest text-[#0891b2] dark:text-[#2cecf7]">
                    DevEngine Digital Design Marketplace
                  </span>
                </div>

                {/* Main Headline with Curved Underline Accent (Theme Cyan #2cecf7) */}
                <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.08] sm:leading-[1.1]">
                  Explore{" "}
                  <span
                    className="relative inline-block text-[#2cecf7] font-extrabold"
                    style={{ color: "#2cecf7" }}
                  >
                    Landing Page
                    {/* Hand-drawn Curved Swoop Underline in Cyan #2cecf7 */}
                    <svg
                      className="absolute -bottom-2 left-0 w-full h-3 text-[#2cecf7] pointer-events-none"
                      viewBox="0 0 250 12"
                      fill="none"
                      preserveAspectRatio="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M3 9C65 2 185 2 247 9"
                        stroke="#2cecf7"
                        strokeWidth="3.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <br />
                  Designs
                </h1>

                {/* Subtitle */}
                <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                  Discover professionally crafted, high-converting landing pages built with engaging
                  motion, clean UI, and production-ready assets.
                </p>

                {/* Hero Action Buttons (Light Colorful Gradient Styling) */}
                <div className="flex flex-wrap items-center justify-center gap-3.5 mt-6">
                  {/* Button 1: Browse Designs — Light Colorful Cyan */}
                  <a
                    href="#marketplace-catalog"
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-extrabold text-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-r from-[#cffafe] via-[#a5f3fc] to-[#67e8f9] dark:from-cyan-950/70 dark:via-cyan-900/60 dark:to-cyan-800/60 text-cyan-950 dark:text-cyan-200 border border-cyan-400/80 dark:border-cyan-400 shadow-lg shadow-cyan-400/30"
                    style={{
                      boxShadow: "0 8px 24px -4px rgba(44, 236, 247, 0.4)",
                    }}
                  >
                    <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-[#0891b2] dark:text-[#2cecf7] flex-none">
                      <span className="material-symbols-outlined text-base">explore</span>
                    </span>
                    <span className="tracking-wide">Browse Designs</span>
                    <span className="material-symbols-outlined text-base text-[#0891b2] dark:text-[#2cecf7]">
                      arrow_forward
                    </span>
                  </a>

                  {/* Button 2: How It Works — Light Colorful Lavender / Purple */}
                  <button
                    type="button"
                    onClick={() => setIsHowItWorksOpen(true)}
                    className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full font-extrabold text-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-gradient-to-r from-[#f5f3ff] via-[#ede9fe] to-[#e0e7ff] dark:from-purple-950/70 dark:via-purple-900/60 dark:to-indigo-950/60 text-purple-950 dark:text-purple-200 border border-purple-300/80 dark:border-purple-500 shadow-lg shadow-purple-400/25 cursor-pointer"
                    style={{
                      boxShadow: "0 8px 24px -4px rgba(168, 85, 247, 0.3)",
                    }}
                  >
                    <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-[#7c3aed] dark:text-[#c084fc] flex-none">
                      <span className="material-symbols-outlined text-base">play_arrow</span>
                    </span>
                    <span className="tracking-wide">How It Works</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-xl mt-8">
                  <div className="flex items-center gap-3 w-full px-5 py-3.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none focus-within:ring-2 focus-within:ring-[#00d2eb] focus-within:border-[#00d2eb] transition-all">
                    <span className="material-symbols-outlined text-slate-400 text-xl flex-none">
                      search
                    </span>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search landing pages (e.g. SaaS, portfolio, e-commerce...)"
                      className="w-full bg-transparent text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none border-none focus:outline-none focus:ring-0"
                      aria-label="Search landing page designs"
                    />
                    {query ? (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                        aria-label="Clear search query"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 text-[11px] font-mono select-none flex-none">
                        ⌘ K
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* CATEGORY TILES (Fluid Responsive Grid — Zero Horizontal Scrollbars) */}
            <section
              id="marketplace-catalog"
              className="w-full max-w-6xl mx-auto mt-10 pt-4"
              aria-label="Filter by category"
            >
              {/* 10 Items: Exactly 10 columns on desktop, 5 columns on mobile — zero scrollbars */}
              <div className="w-full overflow-hidden">
                <div className="grid grid-cols-5 md:grid-cols-10 gap-1.5 sm:gap-2 w-full">
                  {HERO_PRIMARY_CATEGORIES.map((cat) => {
                    const isSelected = category === cat.slug;
                    const displayCount = getCategoryCount(cat.slug, cat.count);
                    const iconLightColor = CATEGORY_ICON_COLORS[cat.slug] || "#2cecf7";

                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => {
                          setCategory(cat.slug);
                          setShowMoreDropdown(false);
                        }}
                        className={`flex flex-col items-center justify-center w-full h-[88px] sm:h-[94px] p-1.5 sm:p-2 rounded-2xl transition-all duration-200 cursor-pointer min-w-0 ${
                          isSelected
                            ? "bg-[#2cecf7] text-[#02040a] shadow-lg shadow-[#2cecf7]/30 scale-[1.02] font-black border-transparent"
                            : "bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300 dark:hover:border-cyan-700 hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-xl sm:text-2xl mb-1 transition-colors ${
                            isSelected ? "text-[#02040a]" : ""
                          }`}
                          style={isSelected ? undefined : { color: iconLightColor }}
                        >
                          {cat.icon}
                        </span>
                        <span className="font-bold text-[11px] sm:text-xs truncate max-w-full px-1">
                          {cat.name}
                        </span>
                        <span
                          className={`text-[10px] sm:text-[11px] mt-0.5 ${
                            isSelected ? "text-[#02040a]/80 font-bold" : "text-slate-400 dark:text-slate-500"
                          }`}
                        >
                          ({displayCount})
                        </span>
                      </button>
                    );
                  })}

                  {/* 10th Card: More ∨ Button */}
                  <button
                    ref={dropdownRef}
                    type="button"
                    onClick={() => setShowMoreDropdown(!showMoreDropdown)}
                    className={`flex flex-col items-center justify-center w-full h-[88px] sm:h-[94px] p-1.5 sm:p-2 rounded-2xl transition-all duration-200 cursor-pointer min-w-0 ${
                      isMoreCategoryActive || showMoreDropdown
                        ? "bg-[#2cecf7] text-[#02040a] shadow-lg shadow-[#2cecf7]/30 scale-[1.02] font-black border-transparent"
                        : "bg-white dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300 dark:hover:border-cyan-700 hover:-translate-y-0.5 hover:shadow-md"
                    }`}
                    aria-expanded={showMoreDropdown}
                    aria-label="View more categories"
                  >
                    <span
                      className={`material-symbols-outlined text-xl sm:text-2xl mb-1 transition-colors ${
                        isMoreCategoryActive || showMoreDropdown ? "text-[#02040a]" : ""
                      }`}
                      style={
                        isMoreCategoryActive || showMoreDropdown
                          ? undefined
                          : { color: CATEGORY_ICON_COLORS[activeMoreCategory?.slug || "more"] || "#8b5cf6" }
                      }
                    >
                      {activeMoreCategory ? activeMoreCategory.icon : "more_horiz"}
                    </span>
                    <span className="font-bold text-[11px] sm:text-xs truncate max-w-full px-1 flex items-center justify-center gap-0.5">
                      <span>{activeMoreCategory ? activeMoreCategory.name : "More"}</span>
                      <span className="material-symbols-outlined text-[10px] sm:text-xs">
                        {showMoreDropdown ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                      </span>
                    </span>
                    <span
                      className={`text-[10px] sm:text-[11px] mt-0.5 ${
                        isMoreCategoryActive || showMoreDropdown
                          ? "text-[#02040a]/80 font-bold"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      ({activeMoreCategory ? getCategoryCount(activeMoreCategory.slug, activeMoreCategory.count) : EXTENDED_CATEGORIES.length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Unique Expandable Category Command Deck (Zero Scrolling) */}
              {showMoreDropdown && (
                <div className="mt-3.5 p-4 sm:p-5 rounded-3xl bg-white/95 dark:bg-[#0c1424] border border-cyan-400/40 dark:border-cyan-500/30 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#0891b2] dark:text-[#2cecf7] text-lg">
                        category
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        Explore Specializations & Niches
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-[#0891b2] dark:text-[#2cecf7] text-[10px] font-bold">
                        {EXTENDED_CATEGORIES.length} Categories
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowMoreDropdown(false)}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span>Close</span>
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-3.5">
                    {EXTENDED_CATEGORIES.map((cat) => {
                      const isCatSelected = category === cat.slug;
                      const catCount = getCategoryCount(cat.slug, cat.count);
                      const catIconColor = CATEGORY_ICON_COLORS[cat.slug] || "#2cecf7";

                      return (
                        <button
                          key={cat.slug}
                          type="button"
                          onClick={() => {
                            setCategory(cat.slug);
                            setShowMoreDropdown(false);
                          }}
                          className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer ${
                            isCatSelected
                              ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7] shadow-md shadow-[#2cecf7]/30 font-bold"
                              : "bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-cyan-300 dark:hover:border-cyan-600 hover:bg-white dark:hover:bg-slate-900"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`material-symbols-outlined text-xl flex-none ${
                                isCatSelected ? "text-[#02040a]" : ""
                              }`}
                              style={isCatSelected ? undefined : { color: catIconColor }}
                            >
                              {cat.icon}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold truncate">{cat.name}</div>
                              <div
                                className={`text-[10px] truncate ${
                                  isCatSelected ? "text-[#02040a]/80 font-medium" : "text-slate-400"
                                }`}
                              >
                                {cat.desc}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-semibold flex-none ml-2 px-1.5 py-0.5 rounded-full ${
                              isCatSelected
                                ? "bg-[#02040a]/15 text-[#02040a]"
                                : "bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {catCount}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* SUBHEADER TOOLBAR LINE (Below Categories matching Image 2) */}
            <section className="w-full max-w-6xl mx-auto mt-8 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              {/* Left: Showing count */}
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Showing{" "}
                <span className="font-bold text-slate-950 dark:text-white">
                  {filtered.length || 128}
                </span>{" "}
                landing page designs
              </div>

              {/* Right: Sorters & View Switch Buttons */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* Price Filter Dropdown */}
                <div className="relative">
                  <select
                    value={price}
                    onChange={(e) => setPrice(e.target.value as PriceOption)}
                    aria-label="Filter designs by price"
                    className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="all">All Prices</option>
                    <option value="paid">Paid</option>
                    <option value="free">Free</option>
                  </select>
                  <span className="material-symbols-outlined text-sm text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                    keyboard_arrow_down
                  </span>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortOption)}
                    aria-label="Sort designs catalog"
                    className="appearance-none pl-3.5 pr-8 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="newest">Newest</option>
                    <option value="rating">Highest Rated</option>
                    <option value="sales">Best Selling</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                  <span className="material-symbols-outlined text-sm text-slate-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                    keyboard_arrow_down
                  </span>
                </div>

                {/* View Switch Buttons (Grid vs List — Theme Cyan #2cecf7) */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-[#2cecf7] text-[#02040a] shadow-sm shadow-[#2cecf7]/30 font-bold"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                    title="Grid view"
                    aria-label="Switch to grid view"
                  >
                    <span className="material-symbols-outlined text-base">grid_view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      viewMode === "list"
                        ? "bg-[#2cecf7] text-[#02040a] shadow-sm shadow-[#2cecf7]/30 font-bold"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    }`}
                    title="List view"
                    aria-label="Switch to list view"
                  >
                    <span className="material-symbols-outlined text-base">view_agenda</span>
                  </button>
                </div>
              </div>
            </section>

            {/* CATALOG CARDS (Grid or List Layout) */}
            <section className="w-full max-w-6xl mx-auto" aria-live="polite">
              {loading ? (
                <div className="min-h-[22rem] flex flex-col items-center justify-center">
                  <HelixLoader size={52} color="#0ea5e9" />
                  <span className="text-xs text-slate-400 mt-3 font-medium">
                    Loading landing page designs...
                  </span>
                </div>
              ) : filtered.length ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                      : "flex flex-col gap-4"
                  }
                >
                  {filtered.map((design) => (
                    <MarketplaceReferenceCard
                      key={design.id}
                      design={design}
                      favorite={favoriteIds.has(design.id)}
                      onFavorite={toggleFavorite}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              ) : (
                <div className="min-h-[20rem] flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                  <span className="material-symbols-outlined text-4xl text-sky-500 mb-2">
                    travel_explore
                  </span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    No designs match these filters
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
                    Try adjusting your search terms or reset the filters to see all published
                    landing page designs.
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#00d2eb] to-[#2cecf7] text-[#02040a] font-bold text-xs shadow-md shadow-cyan-400/25 hover:shadow-cyan-400/40"
                  >
                    Reset filters
                  </button>
                </div>
              )}
            </section>
          </div>
        </main>

        {/* 3. Footer (Untouched) */}
        <LandingFooter />

        {/* Interactive Favorite Success Profile Popup */}
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

        {/* Floating Notification Toast */}
        {notice && (
          <div
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-xs font-semibold text-slate-800 dark:text-slate-100 animate-in fade-in slide-in-from-bottom-2"
            role="status"
          >
            <span className="material-symbols-outlined text-rose-500 text-base">favorite</span>
            <span>{notice}</span>
          </div>
        )}
        {/* ════════════════════ HOW IT WORKS WIDE SHEET POP-UP ════════════════════ */}
        {isHowItWorksOpen && (
          <div
            className="fixed inset-0 z-[3500] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
            onMouseDown={() => setIsHowItWorksOpen(false)}
          >
            <div
              className="relative w-full max-w-4xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl p-5 sm:p-8 shadow-[0_25px_80px_-20px_rgba(0,0,0,0.9),0_0_40px_rgba(44,236,247,0.2)] max-h-[92vh] overflow-y-auto space-y-5"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(false)}
                className="absolute right-4 top-4 sm:right-6 sm:top-6 w-9 h-9 rounded-full bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                aria-label="Close walkthrough"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              {/* Header */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-widest bg-[#2cecf7]/10 text-[#2cecf7] border border-[#2cecf7]/25 mb-2">
                  <span className="material-symbols-outlined text-xs">play_circle</span>
                  <span>Marketplace Walkthrough</span>
                </div>
                <h2 className="text-xl sm:text-3xl font-extrabold text-[var(--devengine-text)] tracking-tight">
                  {settings.howItWorksTitle || "How DevEngine Designs Works"}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--devengine-muted)] mt-1.5 max-w-2xl leading-relaxed">
                  {settings.howItWorksDescription ||
                    "Watch how you can browse high-converting landing page designs, preview interactive 60FPS motion reels, and acquire commercial lifetime licenses with instant digital delivery."}
                </p>
              </div>

              {/* Wide Video Player Stage */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-[var(--devengine-border)] shadow-2xl">
                {(() => {
                  const videoSrc = settings.howItWorksVideoUrl || "https://www.youtube.com/watch?v=LXb3EKWsInQ";
                  const embedUrl = getEmbedUrl(videoSrc);

                  if (embedUrl) {
                    return (
                      <iframe
                        src={embedUrl}
                        title="How DevEngine Designs Works Walkthrough"
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    );
                  }

                  return (
                    <video
                      src={videoSrc}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  );
                })()}
              </div>

              {/* 4 Feature Highlights Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                  <span className="material-symbols-outlined text-[#2cecf7] text-lg block mb-1">speed</span>
                  <strong className="text-xs text-[var(--devengine-text)] block">60FPS Micro-Interactions</strong>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Fluid Framer Motion code</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                  <span className="material-symbols-outlined text-[#2cecf7] text-lg block mb-1">devices</span>
                  <strong className="text-xs text-[var(--devengine-text)] block">Full Responsive</strong>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Desktop, tablet, &amp; mobile</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                  <span className="material-symbols-outlined text-[#2cecf7] text-lg block mb-1">verified</span>
                  <strong className="text-xs text-[var(--devengine-text)] block">Commercial Lifetime</strong>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Client &amp; commercial projects</span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                  <span className="material-symbols-outlined text-[#2cecf7] text-lg block mb-1">bolt</span>
                  <strong className="text-xs text-[var(--devengine-text)] block">Instant Delivery</strong>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Digital source files &amp; tokens</span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--devengine-border)]">
                <div className="text-[11px] text-[var(--devengine-muted)]">
                  Have questions or need custom landing page engineering?
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsHowItWorksOpen(false);
                      const catalog = document.getElementById("marketplace-catalog");
                      catalog?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs uppercase tracking-wider hover:bg-[#2cecf7]/90 transition-all shadow-[0_0_15px_rgba(44,236,247,0.35)] cursor-pointer"
                  >
                    Explore Catalog →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Guest Auth Sheet */}
        <GuestAuthSheet
          isOpen={isAuthSheetOpen}
          onClose={() => {
            setIsAuthSheetOpen(false);
            setPendingFavId(null);
          }}
          onSuccess={handleAuthSuccess}
          title="Save to Your Favorites"
          description="Sign in or create a guest account to curate and save your favorite landing page designs."
        />
      </div>
    </>
  );
}
