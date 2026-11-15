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
  getMarketplaceCategories,
  getPublishedDesigns,
  getMarketplaceSettings,
  getUserFavorites,
  toggleFavoriteDesign,
} from "@/lib/services/marketplaceService";
import type { LandingDesign, DesignCategory, MarketplaceSettings } from "@/types/marketplace";
import { DEFAULT_MARKETPLACE_SETTINGS } from "@/types/marketplace";

export default function MarketplaceExplore() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<LandingDesign[]>([]);
  const [categories, setCategories] = useState<DesignCategory[]>([]);
  const [settings, setSettings] = useState<MarketplaceSettings>(DEFAULT_MARKETPLACE_SETTINGS);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "sales" | "rating" | "newest" | "price_asc" | "price_desc">("popular");
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");

  // Favorites
  const [userUid, setUserUid] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid);
        const favs = await getUserFavorites(user.uid);
        setFavoriteIds(new Set(favs));
      } else {
        setUserUid(null);
        setFavoriteIds(new Set());
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cats, allDesigns, sett] = await Promise.all([
          getMarketplaceCategories(),
          getPublishedDesigns({ sortBy: "popular" }),
          getMarketplaceSettings(),
        ]);
        setCategories(cats.filter((c) => c.isActive));
        setDesigns(allDesigns);
        setSettings(sett);
      } catch (err) {
        console.error("Failed to load marketplace:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // Filtered & Sorted Designs
  const visibleDesigns = useMemo(() => {
    return designs
      .filter((design) => {
        const matchesCategory =
          selectedCategory === "all" || design.category === selectedCategory;
        const matchesSearch =
          !searchQuery ||
          design.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          design.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          design.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          design.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesPrice =
          priceFilter === "all" ||
          (priceFilter === "free" && design.isFree) ||
          (priceFilter === "paid" && !design.isFree);

        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortBy === "sales") return (b.salesCount || 0) - (a.salesCount || 0);
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === "price_asc") return (a.price || 0) - (b.price || 0);
        if (sortBy === "price_desc") return (b.price || 0) - (a.price || 0);
        // Default popular
        return (
          (b.isPopular ? 500 : 0) +
          (b.salesCount || 0) * 10 +
          (b.viewsCount || 0) -
          ((a.isPopular ? 500 : 0) + (a.salesCount || 0) * 10 + (a.viewsCount || 0))
        );
      });
  }, [designs, selectedCategory, searchQuery, priceFilter, sortBy]);

  const handleToggleFavorite = async (e: React.MouseEvent, designId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userUid) {
      showToast("Please sign in to save designs to your favorites.");
      return;
    }

    try {
      const isNowFav = await toggleFavoriteDesign(designId, userUid);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isNowFav) next.add(designId);
        else next.delete(designId);
        return next;
      });

      // Update local count
      setDesigns((prev) =>
        prev.map((d) =>
          d.id === designId
            ? { ...d, favoritesCount: (d.favoritesCount || 0) + (isNowFav ? 1 : -1) }
            : d
        )
      );

      showToast(isNowFav ? "Added to your favorites!" : "Removed from favorites.");
    } catch {
      showToast("Could not update favorites. Try again.");
    }
  };

  return (
    <>
      <Head>
        <title>{settings.marketplaceTitle} | DevEngine</title>
        <meta name="description" content={settings.marketplaceSubtitle} />
        <meta property="og:title" content={`${settings.marketplaceTitle} | DevEngine`} />
        <meta property="og:description" content={settings.marketplaceSubtitle} />
        <link rel="canonical" href="https://www.devenginehq.com/landing-page-designs" />
      </Head>

      <div className="min-h-screen bg-[var(--devengine-bg)] text-[var(--devengine-text)] flex flex-col font-sans transition-colors duration-200">
        <LandingNavbar />

        {/* TOAST NOTIFICATION */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#040a12]/95 border border-[#2cecf7]/50 text-xs font-semibold text-[#2cecf7] shadow-[0_10px_30px_rgba(44,236,247,0.2)] animate-bounce flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">favorite</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 pt-24 sm:pt-28 pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* ════════════════════ DRIBBLE-STYLE HERO HEADER ════════════════════ */}
            <div className="text-center max-w-3xl mx-auto pt-6 pb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2cecf7]/10 border border-[#2cecf7]/30 text-xs font-mono text-[#2cecf7] uppercase tracking-wider mb-4">
                <span className="w-2 h-2 rounded-full bg-[#2cecf7] animate-ping" />
                <span>DevEngine Digital Design Marketplace</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
                Explore <span className="text-[#2cecf7]">Landing Page</span> Designs
              </h1>

              <p className="mt-4 text-base sm:text-lg text-[var(--devengine-muted)] leading-relaxed">
                Discover professionally crafted, high-converting landing pages built with engaging motion, clean Next.js code, and production-ready Figma assets.
              </p>

              {/* Instant Search Bar */}
              <div className="mt-8 max-w-xl mx-auto relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-xl text-[var(--devengine-muted)]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search trading, saas, mobile, portfolio, crypto, dark mode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-sm text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] focus:outline-none focus:border-[#2cecf7] focus:ring-2 focus:ring-[#2cecf7]/20 transition-all shadow-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Related tags pill strip (Dribbble style) */}
              <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs text-[var(--devengine-muted)]">
                <span className="font-mono text-[11px] uppercase tracking-wider">Trending:</span>
                {["SaaS", "Trading", "AI Agent", "Finance", "Portfolio", "Mobile App"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="hover:text-[#2cecf7] underline transition-colors"
                  >
                    #{tag.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* ════════════════════ CATEGORY PILLS & CONTROLS (CLEAN, NO SCROLLBAR) ════════════════════ */}
            <div className="pt-2 pb-8 border-b border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Category Pills - Clean, compact & wrapped without side scrollbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      selectedCategory === "all"
                        ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7] shadow-[0_2px_10px_rgba(44,236,247,0.35)]"
                        : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#2cecf7]/60 bg-white dark:bg-slate-900"
                    }`}
                  >
                    All Work ({designs.length})
                  </button>

                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.slug)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                        selectedCategory === cat.slug
                          ? "bg-[#2cecf7] text-[#02040a] border-[#2cecf7] shadow-[0_2px_10px_rgba(44,236,247,0.35)] font-bold"
                          : "border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-[#2cecf7]/60 bg-white dark:bg-slate-900"
                      }`}
                    >
                      {cat.icon && <span className="material-symbols-outlined text-sm">{cat.icon}</span>}
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>

                {/* Sort & Filter Dropdowns */}
                <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-auto">
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value as any)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#2cecf7]"
                  >
                    <option value="all">All Prices</option>
                    <option value="paid">Premium Paid</option>
                    <option value="free">Free Downloads</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#2cecf7]"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="sales">Best Selling</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ════════════════════ DESIGNS GRID (DRIBBLE STYLE) ════════════════════ */}
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3">
                <HelixLoader size={48} color="#2cecf7" />
                <p className="text-xs uppercase font-mono tracking-widest text-[#2cecf7]">
                  Loading Design Showcase...
                </p>
              </div>
            ) : visibleDesigns.length === 0 ? (
              <div className="py-24 text-center rounded-3xl border border-dashed border-[var(--devengine-border)] my-8">
                <span className="material-symbols-outlined text-5xl text-[var(--devengine-muted)] mb-3">
                  search_off
                </span>
                <h3 className="text-lg font-bold">No Landing Page Designs Match Your Criteria</h3>
                <p className="text-xs text-[var(--devengine-muted)] mt-1 max-w-sm mx-auto">
                  Try clearing your search or switching categories to explore more designs.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setPriceFilter("all");
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs hover:bg-[#2cecf7]/90 transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="pt-8">
                <div className="flex items-center justify-between mb-6 text-xs text-[var(--devengine-muted)]">
                  <span>
                    Showing <strong className="text-[var(--devengine-text)]">{visibleDesigns.length}</strong> crafted landing pages
                  </span>
                  <span className="font-mono">DevEngine Certified Standards</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-7">
                  {visibleDesigns.map((design) => {
                    const isFav = favoriteIds.has(design.id);
                    return (
                      <div
                        key={design.id}
                        className="group flex flex-col rounded-3xl bg-white dark:bg-[#060c18] border-2 border-slate-200/90 dark:border-slate-800/90 hover:border-[#2cecf7] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_16px_36px_rgba(44,236,247,0.2)] overflow-hidden shadow-sm"
                      >
                        {/* 4:3 PREVIEW IMAGE CONTAINER */}
                        <div className="relative aspect-[4/3] bg-black overflow-hidden">
                          <Link href={`/landing-page-designs/${design.slug}`} className="block w-full h-full">
                            {design.thumbnailUrl ? (
                              <img
                                src={design.thumbnailUrl}
                                alt={design.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                <span className="material-symbols-outlined text-3xl">image</span>
                                <span className="text-[10px] mt-1 font-mono uppercase">Preview Ready</span>
                              </div>
                            )}
                          </Link>

                          {/* Motion / Video indicator pill (Top Right - like Dribbble) */}
                          <div className="absolute top-3 right-3 flex items-center gap-1">
                            {design.liveDemoUrl && (
                              <span className="w-7 h-7 rounded-full bg-black/70 backdrop-blur-md text-[#2cecf7] border border-white/10 flex items-center justify-center text-sm shadow" title="Interactive Motion Demo">
                                <span className="material-symbols-outlined text-base">play_circle</span>
                              </span>
                            )}
                          </div>

                          {/* Discount / Free badge (Top Left) */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                            {design.isFree ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500 text-white shadow-md">
                                FREE
                              </span>
                            ) : design.discountPercent && design.discountPercent > 0 ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-500 text-white shadow-md">
                                -{design.discountPercent}% OFF
                              </span>
                            ) : design.isFeatured ? (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-[#2cecf7] text-[#02040a] shadow-md">
                                FEATURED
                              </span>
                            ) : null}
                          </div>

                          {/* Hover Action Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4 pointer-events-none">
                            <div className="w-full flex items-center justify-between pointer-events-auto">
                              <Link
                                href={`/landing-page-designs/${design.slug}`}
                                className="px-3.5 py-1.5 rounded-xl bg-white text-[#02040a] text-xs font-black hover:bg-[#2cecf7] transition-colors shadow-lg"
                              >
                                View Details
                              </Link>

                              {design.liveDemoUrl && (
                                <a
                                  href={design.liveDemoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-[#2cecf7]/40 text-[#2cecf7] text-xs font-bold hover:bg-[#2cecf7] hover:text-[#02040a] transition-all flex items-center gap-1 shadow-lg"
                                >
                                  <span>Live Demo</span>
                                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* CARD BODY & AUTHOR BAR */}
                        <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 gap-3">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#00c5d4] dark:text-[#2cecf7]">
                                {design.categoryName || design.category}
                              </span>
                              <div className="flex items-center gap-1 text-xs">
                                <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">{design.rating || 5.0}</span>
                              </div>
                            </div>

                            <Link
                              href={`/landing-page-designs/${design.slug}`}
                              className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white line-clamp-1 hover:text-[#2cecf7] transition-colors"
                              title={design.title}
                            >
                              {design.title}
                            </Link>

                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-1">
                              {design.shortDescription}
                            </p>
                          </div>

                          {/* FOOTER BAR: AUTHOR & STATS */}
                          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                            {/* Author Badge */}
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-900 border border-[#2cecf7]/60 flex items-center justify-center overflow-hidden shrink-0">
                                <span className="text-[9px] font-black text-[#2cecf7]">DE</span>
                              </div>
                              <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                DevEngine HQ
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-[#2cecf7] text-[#02040a]">
                                PRO
                              </span>
                            </div>

                            {/* Likes, Price & Actions */}
                            <div className="flex items-center gap-2.5">
                              {/* Price */}
                              <div className="text-right">
                                {design.isFree ? (
                                  <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">FREE</span>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <span className="font-black text-sm text-slate-900 dark:text-[#2cecf7]">
                                      {design.currency === "BDT" ? "৳" : "$"}{design.price}
                                    </span>
                                    {design.originalPrice && design.originalPrice > design.price && (
                                      <span className="line-through text-[10px] text-slate-400 font-medium">
                                        {design.currency === "BDT" ? "৳" : "$"}{design.originalPrice}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Favorite Heart Button */}
                              <button
                                onClick={(e) => void handleToggleFavorite(e, design.id)}
                                className={`p-1.5 rounded-lg border transition-all ${
                                  isFav
                                    ? "bg-rose-50 border-rose-500 text-rose-600 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-400"
                                    : "border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500 hover:border-rose-400"
                                }`}
                                title={isFav ? "Saved to favorites" : "Save to favorites"}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {isFav ? "favorite" : "favorite_border"}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
