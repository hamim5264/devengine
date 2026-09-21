import React, { useEffect, useState, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { ArchiveConfig } from "@/types/archive";
import {
  getArchiveConfig,
  DEFAULT_ARCHIVE_CONFIG,
} from "@/lib/services/archiveService";

import PriceDisplay from "@/components/projects/PriceDisplay";
import { getProjectPrices } from "@/lib/services/currencyService";
import { CurrencyPricing } from "@/types/currency";

interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: string | number;
  discount?: string | number;
  pricing?: CurrencyPricing[];
  tags: string[];
  isPublic?: boolean;
  imageUrl?: string;
  image?: string;
  details?: string;
}

export default function ArchivePage() {
  const [config, setConfig] = useState<ArchiveConfig>(DEFAULT_ARCHIVE_CONFIG);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Live offers carousel state
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);

  // Countdown clock state for In The Lab (Days, Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({
    days: 42,
    hours: 18,
    minutes: 59,
    seconds: 30,
  });

  // Keyboard shortcut listener (Cmd+K / Ctrl+K) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 1. Fetch Archive CMS config & Projects from Firestore
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        // Load Archive CMS Config
        const archiveData = await getArchiveConfig();
        if (isMounted) setConfig(archiveData);

        // Load Public Projects
        const colRef = collection(db, "projects");
        let snap = await getDocs(query(colRef, where("isPublic", "==", true)));
        // Fallback in case existing projects in Firestore do not have explicit isPublic: true
        if (snap.empty) {
          snap = await getDocs(colRef);
        }

        const list = snap.docs
          .filter((d) => (d.data() as any).isPublic !== false)
          .map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              slug: data.slug || d.id,
              title: data.title || "Untitled System",
              subtitle: data.subtitle || "",
              category: data.category || "General",
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              isPublic: data.isPublic !== false,
              imageUrl: data.imageUrl || data.image || "",
              details: data.details || "",
            } as ProjectItem;
          });

        if (isMounted) setProjects(list);
      } catch (err) {
        console.error("Error loading archive data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Compute dynamic categories combining admin-defined categories + database project categories
  const availableCategories = useMemo(() => {
    const defaultCats = ["android", "ios", "web", "ai", "automation"];
    const baseList =
      config.categories && config.categories.length > 0
        ? config.categories
        : defaultCats;

    const catMap = new Map<string, string>();
    baseList.forEach((c) => {
      const clean = c.trim();
      if (clean && clean.toLowerCase() !== "all") {
        catMap.set(clean.toLowerCase(), clean);
      }
    });

    projects.forEach((p) => {
      if (p.category) {
        const clean = p.category.trim();
        if (clean && !catMap.has(clean.toLowerCase())) {
          catMap.set(clean.toLowerCase(), clean);
        }
      }
    });

    return Array.from(catMap.values());
  }, [projects, config.categories]);

  // 3. Filter projects based on search query and category
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cat = selectedCategory.toLowerCase().trim();

    return projects.filter((p) => {
      const pCat = (p.category || "").toLowerCase();
      const pTags = (p.tags || []).map((t) => t.toLowerCase());
      const pTitle = p.title.toLowerCase();
      const pSub = p.subtitle.toLowerCase();
      const pDetails = (p.details || "").toLowerCase();

      // Category matching
      const matchesCat =
        cat === "all" ||
        pCat === cat ||
        pTags.includes(cat) ||
        (cat === "ai" &&
          (pTags.includes("gemini") ||
            pTags.includes("ml") ||
            pTitle.includes("ai") ||
            pSub.includes("ai"))) ||
        (cat === "automation" &&
          (pTags.includes("bot") ||
            pTags.includes("automation") ||
            pTitle.includes("auto") ||
            pSub.includes("auto"))) ||
        (cat === "ios" &&
          (pTags.includes("flutter") ||
            pTags.includes("ios") ||
            pCat === "android")); // Cross-platform Flutter apps also target iOS

      // Search query matching
      const matchesSearch =
        !q ||
        pTitle.includes(q) ||
        pSub.includes(q) ||
        pDetails.includes(q) ||
        pCat.includes(q) ||
        pTags.some((t) => t.includes(q));

      return matchesCat && matchesSearch;
    });
  }, [projects, selectedCategory, searchQuery]);

  // 4. Live Offers filtered by admin-configured visible count
  const visibleOfferSlides = useMemo(() => {
    const allSlides = config.liveOffers.slides || [];
    const limit =
      typeof config.liveOffers.maxVisibleOffers === "number" &&
      config.liveOffers.maxVisibleOffers > 0
        ? config.liveOffers.maxVisibleOffers
        : allSlides.length;
    return allSlides.slice(0, limit);
  }, [config.liveOffers.slides, config.liveOffers.maxVisibleOffers]);

  // Auto-Swipe for visible offer slides (Every 5 seconds)
  useEffect(() => {
    if (visibleOfferSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveOfferIndex((prev) =>
        prev + 1 >= visibleOfferSlides.length ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(timer);
  }, [visibleOfferSlides.length]);

  // 5. In The Lab Real-Time Live Countdown with Seconds
  useEffect(() => {
    const target = new Date(
      config.lab.targetLaunchDate || "2026-12-31T23:59:59Z"
    ).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diff = target - now;

      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [config.lab.targetLaunchDate]);

  // 6. Featured Case Study Project lookup
  const featuredProject = useMemo(() => {
    if (!config.featuredCaseStudy.projectId) return null;
    return projects.find(
      (p) =>
        p.slug === config.featuredCaseStudy.projectId ||
        p.id === config.featuredCaseStudy.projectId
    );
  }, [projects, config.featuredCaseStudy.projectId]);

  // 7. 4 Most Recent Projects for The Archive Bento Grid
  const recent4Projects = useMemo(() => {
    return filteredProjects.slice(0, 4);
  }, [filteredProjects]);

  return (
    <>
      <Head>
        <title>THE DEVENGINE ARCHIVE - High-Fidelity Engineering Catalog</title>
        <meta
          name="description"
          content={config.hero.subtitle || "The Pinnacle of Digital Craftsmanship."}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Global Dark Shader Canvas & Grid */}
      <div className="fixed inset-0 bg-[#030712] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(14,19,31,0.9)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-60" />

      {/* Shared Cinematic Landing Navbar (With ARCHIVE option active) */}
      <LandingNavbar />

      <main className="w-full relative text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712] overflow-x-hidden">
        {/* =========================================================================
            SECTION 1: MASSIVE HERO
        ========================================================================= */}
        <section className="min-h-screen flex items-center justify-center relative pt-36 pb-20 px-6 sm:px-12 md:px-20 overflow-hidden">
          <div className="text-center z-10 max-w-5xl mx-auto w-full">
            {/* Pinnacle Badge */}
            <div className="inline-flex items-center gap-2 bg-[#0e131f]/60 backdrop-blur-xl px-4 py-2 rounded-full mb-8 border border-[#38f2ff]/30 shadow-[0_0_20px_rgba(56,242,255,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38f2ff] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38f2ff]" />
              </span>
              <p className="font-jetbrains text-[10px] sm:text-xs text-[#38f2ff] tracking-widest uppercase m-0 font-semibold">
                {config.hero.badgeText}
              </p>
            </div>

            {/* Massive Hero Headline */}
            <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl lg:text-8xl mb-8 text-white leading-tight tracking-tight shadow-sm">
              {config.hero.title}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#78f5ff] to-[#3495ea]">
                {config.hero.titleHighlight}
              </span>
            </h1>

            <p className="font-sans text-base sm:text-lg md:text-xl text-[#849495] max-w-3xl mx-auto mb-12 leading-relaxed">
              {config.hero.subtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row justify-center gap-5 items-center">
              <a
                href="#archive-feed"
                className="bg-[#38f2ff] text-[#030712] font-jetbrains text-xs uppercase tracking-wider font-bold px-10 py-5 rounded-full shadow-[0_0_30px_rgba(56,242,255,0.4)] hover:shadow-[0_0_50px_rgba(56,242,255,0.7)] transition-all transform hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto"
              >
                {config.hero.ctaPrimaryText}
              </a>
              <a
                href="#lab-section"
                className="bg-[#0e131f]/60 backdrop-blur-xl text-white font-jetbrains text-xs uppercase tracking-wider px-10 py-5 rounded-full hover:bg-white/5 transition-all border border-white/10 flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {config.hero.ctaSecondaryText} <span className="text-sm">→</span>
              </a>
            </div>
          </div>

          {/* Abstract 3D Revolving Orbital Ecosystem Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full z-0 pointer-events-none opacity-25 mix-blend-screen">
            <div
              className="absolute top-[40%] left-[20%] w-64 h-64 border border-[#38f2ff]/20 rounded-full animate-[spin_20s_linear_infinite]"
              style={{ transform: "rotateX(70deg) rotateZ(0deg)" }}
            />
            <div
              className="absolute top-[40%] left-[20%] w-96 h-96 border border-[#3495ea]/20 rounded-full animate-[spin_30s_linear_infinite_reverse]"
              style={{ transform: "rotateX(70deg) rotateZ(45deg)" }}
            />
            <div
              className="absolute top-[30%] right-[15%] w-80 h-80 border border-[#78f5ff]/20 rounded-full animate-[spin_25s_linear_infinite]"
              style={{ transform: "rotateX(60deg) rotateY(20deg)" }}
            />
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: FILTER COMMAND CENTER
        ========================================================================= */}
        <section
          id="filter-center"
          className="py-6 px-6 sm:px-12 md:px-20 sticky top-20 z-30"
        >
          <div className="max-w-5xl mx-auto bg-[#080e1a]/85 backdrop-blur-2xl p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)]">
            {/* Search Input with Keyboard Shortcut & Clear Button */}
            <div className="relative w-full md:w-80">
              <svg
                className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <circle cx="11" cy="11" r="8" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search archive..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#161c28] border border-white/10 rounded-xl py-2.5 pl-11 pr-14 text-sm text-white placeholder-gray-500 focus:border-[#38f2ff] focus:outline-none transition font-sans"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 rounded-full text-xs font-bold transition"
                  title="Clear search"
                >
                  ✕
                </button>
              ) : (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 pointer-events-none">
                  <kbd className="font-jetbrains text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
                    ⌘
                  </kbd>
                  <kbd className="font-jetbrains text-[9px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-gray-400">
                    K
                  </kbd>
                </div>
              )}
            </div>

            {/* Dynamic Category Pills (Populated from admin categories + database) */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap px-5 py-2 rounded-full font-jetbrains text-xs tracking-wider transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                    : "bg-[#0e131f] text-gray-400 hover:text-white border border-white/5 hover:border-white/20"
                }`}
              >
                ALL
              </button>

              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`whitespace-nowrap px-5 py-2 rounded-full font-jetbrains text-xs tracking-wider uppercase transition-all ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                      : "bg-[#0e131f] text-gray-400 hover:text-white border border-white/5 hover:border-white/20"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: FEATURED CASE STUDY (3D Mobile Frame Mockup)
        ========================================================================= */}
        <section className="py-20 w-full px-6 sm:px-12 md:px-20 overflow-hidden">
          <div className="max-w-6xl mx-auto bg-[#080e1a]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 md:p-16 border border-[#38f2ff]/20 relative overflow-hidden shadow-2xl group hover:border-[#38f2ff]/40 transition-colors">
            {/* Ambient Cyan Backdrop Glow */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#38f2ff]/10 to-transparent pointer-events-none rounded-r-3xl" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative z-10">
              {/* Left Column: Case Study Specs */}
              <div>
                <div className="inline-block bg-[#38f2ff]/10 text-[#38f2ff] font-jetbrains text-xs px-3 py-1 rounded tracking-widest uppercase mb-6 border border-[#38f2ff]/30 font-semibold">
                  {config.featuredCaseStudy.badgeText}
                </div>

                <h2 className="font-space text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                  {featuredProject?.title || config.featuredCaseStudy.title}
                  <br />
                  <span className="text-gray-400 text-2xl sm:text-3xl font-medium">
                    {featuredProject?.subtitle || config.featuredCaseStudy.titleHighlight}
                  </span>
                </h2>

                <p className="font-sans text-base text-[#849495] mb-8 max-w-xl leading-relaxed">
                  {featuredProject?.details || config.featuredCaseStudy.description}
                </p>

                <div className="grid grid-cols-2 gap-6 mb-10 border-t border-white/10 pt-6 max-w-md">
                  <div>
                    <p className="font-jetbrains text-[10px] text-gray-500 mb-1 tracking-widest uppercase">
                      Tech Stack
                    </p>
                    <p className="font-sans text-sm text-white font-medium">
                      {featuredProject?.tags?.join(", ") ||
                        config.featuredCaseStudy.techStack}
                    </p>
                  </div>
                  <div>
                    <p className="font-jetbrains text-[10px] text-gray-500 mb-1 tracking-widest uppercase">
                      License
                    </p>
                    <p className="font-sans text-sm text-white font-medium">
                      {config.featuredCaseStudy.license}
                    </p>
                  </div>
                </div>

                {featuredProject ? (
                  <Link
                    href="/projects/case-study"
                    className="inline-flex items-center gap-3 bg-white/10 hover:bg-[#38f2ff] text-white hover:text-[#030712] font-jetbrains text-xs tracking-wider uppercase px-8 py-4 rounded-full border border-white/15 transition-all shadow-lg font-bold cursor-pointer"
                  >
                    {config.featuredCaseStudy.buttonText} <span>↗</span>
                  </Link>
                ) : (
                  <Link
                    href="/projects/case-study"
                    className="inline-flex items-center gap-3 bg-[#38f2ff] text-[#030712] font-jetbrains text-xs tracking-wider uppercase px-8 py-4 rounded-full transition-all shadow-lg font-bold cursor-pointer"
                  >
                    {config.featuredCaseStudy.buttonText} <span>↗</span>
                  </Link>
                )}
              </div>

              {/* Right Column: Simulated 3D Mobile Phone Frame */}
              <div className="relative h-[560px] flex justify-center items-center group">
                <Link
                  href="/projects/case-study"
                  className="relative block cursor-pointer group/phone"
                  aria-label="View Featured Case Study Details"
                >
                  <div className="relative w-[280px] h-[550px] rounded-[44px] bg-[#0e131f] border-[6px] border-[#242a36] shadow-[0_0_60px_rgba(56,242,255,0.25)] overflow-hidden transition-transform duration-700 transform lg:rotate-y-[-12deg] lg:rotate-x-[4deg] group-hover/phone:rotate-0 group-hover/phone:border-[#38f2ff]/60">
                    {/* Dynamic Island Notch */}
                    <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-end px-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#161c28] border border-white/20" />
                    </div>

                    {/* Phone Screen Mockup Content */}
                    <div className="w-full h-full relative">
                      <Image
                        src={
                          config.featuredCaseStudy.phoneImage ||
                          featuredProject?.imageUrl ||
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop"
                        }
                        alt={config.featuredCaseStudy.title}
                        fill
                        className="object-cover group-hover/phone:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                    </div>
                  </div>
                </Link>

                {/* Floating Ambient Glow Orbs */}
                <div className="absolute top-1/4 -right-8 w-24 h-24 bg-[#38f2ff]/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-1/4 -left-8 w-28 h-28 bg-[#3495ea]/20 rounded-full blur-2xl pointer-events-none" />
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: LIVE OFFERS (Banner Carousel with Auto-Swipe)
        ========================================================================= */}
        {visibleOfferSlides && visibleOfferSlides.length > 0 && (
          <section className="py-10 px-6 sm:px-12 md:px-20">
            <div className="max-w-6xl mx-auto relative group">
              {/* Header Bar: LIVE OFFERS badge & Slide Progress indicators */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="font-jetbrains text-xs text-red-400 tracking-widest uppercase font-bold">
                    {config.liveOffers.badgeText}
                  </span>
                  <span className="text-[11px] font-mono text-gray-500 ml-2">
                    ({visibleOfferSlides.length} Featured Deals)
                  </span>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 items-center">
                  {visibleOfferSlides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveOfferIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeOfferIndex
                          ? "w-8 bg-[#38f2ff] shadow-[0_0_8px_#38f2ff]"
                          : "w-3 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Go to offer slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Active Slide Card */}
              {(() => {
                const slide =
                  visibleOfferSlides[activeOfferIndex] || visibleOfferSlides[0];

                // Intelligently resolve project by projectId, slug, title match, or first available project
                const targetProject =
                  projects.find(
                    (p) =>
                      (slide.projectId &&
                        (p.slug === slide.projectId || p.id === slide.projectId)) ||
                      (slide.title &&
                        (p.title.toLowerCase().includes(slide.title.toLowerCase()) ||
                          slide.title.toLowerCase().includes(p.title.toLowerCase())))
                  ) ||
                  projects.find(
                    (p) =>
                      slide.projectId &&
                      (p.slug.toLowerCase().includes(slide.projectId.toLowerCase()) ||
                        slide.projectId.toLowerCase().includes(p.slug.toLowerCase()))
                  ) ||
                  projects[0];

                const targetSlug =
                  targetProject?.slug ||
                  targetProject?.id ||
                  slide.projectId ||
                  (projects[0] ? (projects[0].slug || projects[0].id) : "snapcaption-ai");

                return (
                  <div className="bg-[#080e1a]/80 backdrop-blur-2xl rounded-3xl overflow-hidden relative min-h-[420px] border border-[#38f2ff]/30 shadow-2xl">
                    {/* Abstract Backdrop Glow */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[450px] h-[450px] border border-[#38f2ff]/10 rounded-full mix-blend-screen opacity-50" />
                      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#38f2ff]/5 to-transparent" />
                    </div>

                    <div className="relative z-10 p-8 sm:p-12 md:p-16 h-full flex flex-col md:flex-row justify-between items-center gap-8">
                      {/* Left: Offer Details */}
                      <div className="flex-1 space-y-4">
                        <span className="bg-[#38f2ff]/10 text-[#38f2ff] px-3 py-1 rounded font-jetbrains text-xs border border-[#38f2ff]/30 font-semibold inline-block">
                          {slide.tag}
                        </span>

                        <Link
                          href={`/projects/${targetSlug}`}
                          className="block group/title cursor-pointer"
                        >
                          <h3 className="font-space font-bold text-3xl sm:text-5xl text-white leading-tight group-hover/title:text-[#38f2ff] transition-colors">
                            {slide.title} <br />
                            <span className="text-red-400 font-space text-2xl sm:text-4xl">
                              {slide.discountBadge}
                            </span>
                          </h3>
                        </Link>

                        <p className="font-sans text-sm sm:text-base text-[#849495] max-w-md">
                          {slide.description}
                        </p>

                        <div className="flex items-baseline gap-4 pt-2">
                          <span className="font-jetbrains text-xl text-[#849495] line-through opacity-60">
                            {slide.originalPrice}
                          </span>
                          <span className="font-space text-3xl sm:text-4xl text-[#38f2ff] font-bold">
                            {slide.offerPrice}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <Link
                            href={`/projects/${targetSlug}`}
                            id="claim-offer-btn"
                            className="inline-flex items-center gap-2.5 bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-sans text-sm uppercase tracking-wider font-bold px-8 py-4 rounded-full shadow-[0_0_25px_rgba(56,242,255,0.4)] hover:shadow-[0_0_35px_rgba(56,242,255,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <span>{slide.claimButtonText || "CLAIM OFFER"}</span>
                            <span className="text-base font-bold">→</span>
                          </Link>
                          <Link
                            href={`/projects/${targetSlug}`}
                            className="font-jetbrains text-xs text-gray-400 hover:text-[#38f2ff] transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer py-2"
                          >
                            <span>Inspect Specs</span>
                            <span className="text-sm">↗</span>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Offer Banner Image Mockup */}
                      <div className="flex-1 w-full flex justify-center md:justify-end">
                        <Link
                          href={`/projects/${targetSlug}`}
                          className="relative w-full max-w-sm h-64 border border-white/10 rounded-2xl overflow-hidden shadow-2xl group hover:border-[#38f2ff]/60 transition-all block cursor-pointer"
                        >
                          <Image
                            src={
                              slide.frameImage ||
                              "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop"
                            }
                            alt={slide.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 via-transparent to-transparent pointer-events-none" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        )}

        {/* =========================================================================
            SECTION 5: THE ARCHIVE (Recent 4 Projects Bento Grid + View All)
        ========================================================================= */}
        <section id="archive-feed" className="py-20 px-6 sm:px-12 md:px-20 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 mb-12">
            <div>
              <h2 className="font-space font-bold text-3xl sm:text-5xl text-white mb-2 tracking-tight">
                The Archive
              </h2>
              <p className="font-sans text-base text-[#849495] max-w-xl">
                A meticulously categorized collection of production-ready systems.
              </p>
              {searchQuery && (
                <p className="text-xs text-[#38f2ff] font-mono mt-2">
                  Showing {filteredProjects.length} results matching &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                onClick={() => setShowAllCatalog(!showAllCatalog)}
                className="font-jetbrains text-xs uppercase tracking-wider text-gray-400 hover:text-white transition flex items-center gap-1.5"
              >
                {showAllCatalog ? "COLLAPSE VIEW" : "QUICK VIEW"}
              </button>
              <span className="text-gray-600">|</span>
              <Link
                href="/projects/all"
                className="font-jetbrains text-xs uppercase tracking-wider text-[#38f2ff] hover:underline flex items-center gap-1.5 font-bold"
              >
                VIEW ALL PROJECTS <span>→</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#38f2ff" />
              <p className="mt-4 font-jetbrains text-xs text-gray-400">
                Synchronizing project repository…
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-[#080e1a] rounded-2xl border border-white/5">
              <p className="font-space text-lg text-white mb-2">
                No matching projects found
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Try adjusting your search query or selecting a different category.
              </p>
              {(searchQuery || selectedCategory !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="px-4 py-2 bg-[#161c28] border border-white/10 hover:border-[#38f2ff] rounded-lg text-xs font-mono text-[#38f2ff]"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Editorial Bento Grid: 4 Recent Projects */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[340px]">
                {/* Card 1: Large Feature (spans 2 cols) */}
                {recent4Projects[0] && (
                  <Link
                    href={`/projects/${recent4Projects[0].slug || recent4Projects[0].id}`}
                    className="md:col-span-2 bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-8 relative overflow-hidden group border border-white/5 hover:border-[#38f2ff]/40 hover:shadow-[0_0_30px_rgba(56,242,255,0.15)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-space text-2xl sm:text-3xl font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-2">
                          {recent4Projects[0].title}
                        </h3>
                        <p className="font-sans text-sm text-[#849495] max-w-md line-clamp-2">
                          {recent4Projects[0].subtitle || recent4Projects[0].details}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#161c28] px-3 py-1 rounded-full font-jetbrains text-[10px] text-gray-300 uppercase border border-white/10">
                          {recent4Projects[0].category}
                        </span>
                        <span className="text-gray-500 group-hover:text-[#38f2ff] font-jetbrains text-sm transition-colors">
                          ↗
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end w-full pt-4 gap-4">
                      <div>
                        <span className="font-jetbrains text-[10px] text-gray-400 uppercase tracking-widest block mb-1.5">
                          Licensing Rates
                        </span>
                        <PriceDisplay
                          prices={getProjectPrices(recent4Projects[0])}
                          size="md"
                        />
                      </div>

                      {/* Project Image Frame */}
                      <div className="w-48 sm:w-56 h-32 rounded-xl overflow-hidden border border-white/10 relative shadow-2xl group-hover:border-[#38f2ff]/40 transition-all flex-shrink-0">
                        <Image
                          src={
                            recent4Projects[0].imageUrl ||
                            config.defaultProjectImages?.[0] ||
                            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent4Projects[0].title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>
                  </Link>
                )}

                {/* Card 2: Standard Bento Card */}
                {recent4Projects[1] && (
                  <Link
                    href={`/projects/${recent4Projects[1].slug || recent4Projects[1].id}`}
                    className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-[#38f2ff]/40 hover:shadow-[0_0_25px_rgba(56,242,255,0.12)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-[#161c28] px-3 py-1 rounded-full font-jetbrains text-[10px] text-gray-300 uppercase border border-white/10">
                          {recent4Projects[1].category}
                        </span>
                        <span className="text-gray-500 group-hover:text-[#38f2ff] transition-colors">
                          ↗
                        </span>
                      </div>
                      <h3 className="font-space text-lg font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-1">
                        {recent4Projects[1].title}
                      </h3>
                      <p className="font-sans text-xs text-[#849495] line-clamp-2">
                        {recent4Projects[1].subtitle || recent4Projects[1].details}
                      </p>
                    </div>

                    {/* Project Image Frame */}
                    <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 relative my-2 group-hover:border-[#38f2ff]/40 transition-all">
                      <Image
                        src={
                          recent4Projects[1].imageUrl ||
                          config.defaultProjectImages?.[1] ||
                          "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop"
                        }
                        alt={recent4Projects[1].title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/70 via-transparent to-transparent pointer-events-none" />
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex flex-wrap justify-between items-center gap-2">
                      <span className="font-jetbrains text-[9px] text-gray-500 uppercase tracking-wider">
                        Price
                      </span>
                      <PriceDisplay
                        prices={getProjectPrices(recent4Projects[1])}
                        size="sm"
                      />
                    </div>
                  </Link>
                )}

                {/* Card 3: Standard Bento Card */}
                {recent4Projects[2] && (
                  <Link
                    href={`/projects/${recent4Projects[2].slug || recent4Projects[2].id}`}
                    className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-[#38f2ff]/40 hover:shadow-[0_0_25px_rgba(56,242,255,0.12)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-[#161c28] px-3 py-1 rounded-full font-jetbrains text-[10px] text-gray-300 uppercase border border-white/10">
                          {recent4Projects[2].category}
                        </span>
                        <span className="text-gray-500 group-hover:text-[#38f2ff] transition-colors">
                          ↗
                        </span>
                      </div>
                      <h3 className="font-space text-lg font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-1">
                        {recent4Projects[2].title}
                      </h3>
                      <p className="font-sans text-xs text-[#849495] line-clamp-2">
                        {recent4Projects[2].subtitle || recent4Projects[2].details}
                      </p>
                    </div>

                    {/* Project Image Frame */}
                    <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 relative my-2 group-hover:border-[#38f2ff]/40 transition-all">
                      <Image
                        src={
                          recent4Projects[2].imageUrl ||
                          config.defaultProjectImages?.[2] ||
                          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                        }
                        alt={recent4Projects[2].title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/70 via-transparent to-transparent pointer-events-none" />
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex flex-wrap justify-between items-center gap-2">
                      <span className="font-jetbrains text-[9px] text-gray-500 uppercase tracking-wider">
                        Price
                      </span>
                      <PriceDisplay
                        prices={getProjectPrices(recent4Projects[2])}
                        size="sm"
                      />
                    </div>
                  </Link>
                )}

                {/* Card 4: Standard Bento Card */}
                {recent4Projects[3] && (
                  <Link
                    href={`/projects/${recent4Projects[3].slug || recent4Projects[3].id}`}
                    className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-6 relative overflow-hidden group border border-white/5 hover:border-[#38f2ff]/40 hover:shadow-[0_0_25px_rgba(56,242,255,0.12)] transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-[#161c28] px-3 py-1 rounded-full font-jetbrains text-[10px] text-gray-300 uppercase border border-white/10">
                          {recent4Projects[3].category}
                        </span>
                        <span className="text-gray-500 group-hover:text-[#38f2ff] transition-colors">
                          ↗
                        </span>
                      </div>
                      <h3 className="font-space text-lg font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-1">
                        {recent4Projects[3].title}
                      </h3>
                      <p className="font-sans text-xs text-[#849495] line-clamp-2">
                        {recent4Projects[3].subtitle || recent4Projects[3].details}
                      </p>
                    </div>

                    {/* Project Image Frame */}
                    <div className="w-full h-28 rounded-xl overflow-hidden border border-white/10 relative my-2 group-hover:border-[#38f2ff]/40 transition-all">
                      <Image
                        src={
                          recent4Projects[3].imageUrl ||
                          config.defaultProjectImages?.[3] ||
                          "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
                        }
                        alt={recent4Projects[3].title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/70 via-transparent to-transparent pointer-events-none" />
                    </div>

                    <div className="pt-2.5 border-t border-white/5 flex flex-wrap justify-between items-center gap-2">
                      <span className="font-jetbrains text-[9px] text-gray-500 uppercase tracking-wider">
                        Price
                      </span>
                      <PriceDisplay
                        prices={getProjectPrices(recent4Projects[3])}
                        size="sm"
                      />
                    </div>
                  </Link>
                )}
              </div>

              {/* View All Catalog Grid (When expanded) */}
              {showAllCatalog && filteredProjects.length > 4 && (
                <div className="mt-12 pt-12 border-t border-white/10 space-y-6">
                  <h3 className="font-space text-xl font-bold text-white flex items-center justify-between">
                    <span>Full Catalog ({filteredProjects.length} Projects)</span>
                    <span className="text-xs font-mono text-gray-400">
                      Filtered by: {selectedCategory.toUpperCase()}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.slice(4).map((project, idx) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.slug || project.id}`}
                        className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 hover:border-[#38f2ff]/30 hover:shadow-[0_0_25px_rgba(56,242,255,0.1)] transition-all group flex flex-col justify-between cursor-pointer"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="bg-[#161c28] px-2.5 py-1 rounded font-jetbrains text-[10px] text-gray-300 uppercase">
                              {project.category}
                            </span>
                            <span className="text-gray-600 group-hover:text-[#38f2ff] transition-colors">
                              ↗
                            </span>
                          </div>
                          <h4 className="font-space text-lg font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-1.5">
                            {project.title}
                          </h4>
                          <p className="text-xs text-gray-400 line-clamp-2 mb-3">
                            {project.subtitle}
                          </p>

                          {/* Image Frame for catalog items */}
                          <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 relative my-2 group-hover:border-[#38f2ff]/40 transition-all">
                            <Image
                              src={
                                project.imageUrl ||
                                config.defaultProjectImages?.[
                                  (idx + 4) % (config.defaultProjectImages?.length || 6)
                                ] ||
                                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                              }
                              alt={project.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/70 via-transparent to-transparent pointer-events-none" />
                          </div>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex flex-wrap justify-between items-center gap-2 font-jetbrains text-xs">
                          <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">
                            Price
                          </span>
                          <PriceDisplay
                            prices={getProjectPrices(project)}
                            size="sm"
                          />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* =========================================================================
            SECTION 6: IN THE LAB (Classified Development & Live Countdown)
        ========================================================================= */}
        <section
          id="lab-section"
          className="py-20 px-6 sm:px-12 md:px-20 relative overflow-hidden"
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-block bg-[#161c28] px-3.5 py-1 rounded border border-white/10 font-jetbrains text-[10px] text-gray-400 tracking-widest uppercase mb-4">
                {config.lab.badgeText}
              </div>
              <h2 className="font-space font-bold text-3xl sm:text-5xl text-white">
                {config.lab.title}
              </h2>
            </div>

            <div className="bg-[#080e1a]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 md:p-16 border border-white/10 relative overflow-hidden shadow-2xl">
              {/* Spinning Centerpiece Core */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] opacity-15 pointer-events-none flex items-center justify-center">
                <div className="absolute w-full h-full border border-[#38f2ff]/30 rounded-full animate-[spin_40s_linear_infinite]" />
                <div className="absolute w-3/4 h-3/4 border-t border-b border-[#3495ea]/40 rounded-full animate-[spin_20s_linear_infinite_reverse]" />
                <div className="absolute w-1/2 h-1/2 border border-[#78f5ff]/20 rounded-full" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                {/* Left: Project Progress */}
                <div className="flex-1 text-center md:text-left space-y-6">
                  <div>
                    <h3 className="font-space font-bold text-3xl sm:text-5xl text-white mb-2">
                      {config.lab.projectName}
                    </h3>
                    <p className="font-jetbrains text-xs text-[#38f2ff] tracking-widest uppercase font-semibold">
                      {config.lab.techDomain}
                    </p>
                  </div>

                  {/* 5-Stage Stepper */}
                  <div className="max-w-md mx-auto md:mx-0">
                    <div className="flex justify-between font-jetbrains text-[10px] text-gray-400 mb-2">
                      <span className="text-[#38f2ff] font-bold">IDEA</span>
                      <span className="text-[#38f2ff] font-bold">DESIGN</span>
                      <span className="text-[#38f2ff] font-bold">DEV</span>
                      <span>TEST</span>
                      <span>LAUNCH</span>
                    </div>

                    <div className="h-2.5 bg-[#161c28] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-gradient-to-r from-[#38f2ff] to-[#78f5ff] rounded-full relative transition-all duration-1000"
                        style={{ width: `${config.lab.progressPercentage}%` }}
                      >
                        <div className="absolute top-0 right-0 h-full w-3 bg-white/60 blur-xs" />
                      </div>
                    </div>

                    <div className="text-right mt-1.5 font-jetbrains text-xs text-[#38f2ff] font-bold">
                      {config.lab.progressPercentage}% COMPLETE
                    </div>
                  </div>

                  {/* Metadata Chips */}
                  <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto md:mx-0 font-jetbrains text-xs">
                    <div className="bg-[#161c28] p-3.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-1">
                        EXPECTED DEPLOY
                      </div>
                      <div className="text-white font-bold">
                        {config.lab.expectedDeploy}
                      </div>
                    </div>
                    <div className="bg-[#161c28] p-3.5 rounded-xl border border-white/5">
                      <div className="text-[10px] text-gray-500 mb-1">
                        TECH DOMAIN
                      </div>
                      <div className="text-white font-bold">
                        {config.lab.techDomain}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Massive Real-Time Countdown Clock with SECONDS */}
                <div className="flex-1 flex justify-center">
                  <div className="bg-[#0e131f]/90 p-6 sm:p-8 rounded-2xl border border-[#38f2ff]/20 flex gap-3 sm:gap-5 text-center shadow-2xl">
                    <div>
                      <div className="font-space font-bold text-3xl sm:text-5xl text-white">
                        {String(timeLeft.days).padStart(2, "0")}
                      </div>
                      <div className="font-jetbrains text-[9px] sm:text-[10px] text-[#38f2ff] tracking-widest font-semibold mt-1">
                        DAYS
                      </div>
                    </div>
                    <div className="font-space text-2xl sm:text-4xl text-gray-600 font-bold self-center">
                      :
                    </div>
                    <div>
                      <div className="font-space font-bold text-3xl sm:text-5xl text-white">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </div>
                      <div className="font-jetbrains text-[9px] sm:text-[10px] text-[#38f2ff] tracking-widest font-semibold mt-1">
                        HOURS
                      </div>
                    </div>
                    <div className="font-space text-2xl sm:text-4xl text-gray-600 font-bold self-center">
                      :
                    </div>
                    <div>
                      <div className="font-space font-bold text-3xl sm:text-5xl text-white">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </div>
                      <div className="font-jetbrains text-[9px] sm:text-[10px] text-[#38f2ff] tracking-widest font-semibold mt-1">
                        MINS
                      </div>
                    </div>
                    <div className="font-space text-2xl sm:text-4xl text-gray-600 font-bold self-center">
                      :
                    </div>
                    <div>
                      <div className="font-space font-bold text-3xl sm:text-5xl text-[#38f2ff] animate-pulse">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </div>
                      <div className="font-jetbrains text-[9px] sm:text-[10px] text-[#38f2ff] tracking-widest font-semibold mt-1">
                        SECS
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 7: TECHNOLOGY WALL
        ========================================================================= */}
        <section className="py-20 px-6 sm:px-12 md:px-20 border-y border-white/5 bg-[#080e1a]/40">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="font-space font-bold text-3xl sm:text-4xl text-white mb-3">
              {config.techWall.title}
            </h2>
            <p className="font-sans text-sm sm:text-base text-[#849495] max-w-xl mx-auto">
              {config.techWall.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3.5 max-w-4xl mx-auto font-jetbrains text-xs">
            {[
              { name: "Flutter", color: "#38f2ff" },
              { name: "React / Next.js", color: "#61DAFB" },
              { name: "PostgreSQL", color: "#336791" },
              { name: "Firebase", color: "#FFCA28" },
              { name: "Tailwind CSS", color: "#38f2ff" },
              { name: "Gemini API", color: "#ffffff" },
              { name: "Node.js", color: "#68A063" },
              { name: "TypeScript", color: "#3178C6" },
            ].map((tech) => (
              <div
                key={tech.name}
                className="bg-[#0e131f] px-5 py-2.5 rounded-full border border-white/10 hover:border-[#38f2ff]/50 hover:bg-white/[0.02] transition-all cursor-default flex items-center gap-2"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: tech.color }}
                />
                <span className="text-gray-300 font-medium">{tech.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            SECTION 8: METRICS & STATISTICS
        ========================================================================= */}
        <section className="py-24 px-6 sm:px-12 md:px-20">
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/5 text-center">
            <div className="pt-4 md:pt-0 px-4">
              <div className="font-space font-bold text-4xl sm:text-6xl text-[#38f2ff] mb-2">
                {config.stats.stat1Value}
              </div>
              <div className="font-jetbrains text-[10px] text-gray-400 tracking-widest uppercase">
                {config.stats.stat1Label}
              </div>
            </div>

            <div className="pt-4 md:pt-0 px-4">
              <div className="font-space font-bold text-4xl sm:text-6xl text-white mb-2">
                {config.stats.stat2Value}
              </div>
              <div className="font-jetbrains text-[10px] text-gray-400 tracking-widest uppercase">
                {config.stats.stat2Label}
              </div>
            </div>

            <div className="pt-4 md:pt-0 px-4">
              <div className="font-space font-bold text-4xl sm:text-6xl text-white mb-2">
                {config.stats.stat3Value}
              </div>
              <div className="font-jetbrains text-[10px] text-gray-400 tracking-widest uppercase">
                {config.stats.stat3Label}
              </div>
            </div>

            <div className="pt-4 md:pt-0 px-4">
              <div className="font-space font-bold text-4xl sm:text-6xl text-white mb-2">
                {config.stats.stat4Value}
              </div>
              <div className="font-jetbrains text-[10px] text-gray-400 tracking-widest uppercase">
                {config.stats.stat4Label}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Shared Dashboard Footer as requested by USER */}
      <LandingFooter />
    </>
  );
}
