import React, { useEffect, useState, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
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

interface CategoryMeta {
  title: string;
  tagline: string;
  icon: string;
  badgeColor: string;
}

const CATEGORY_METADATA: Record<string, CategoryMeta> = {
  android: {
    title: "Mobile & Cross-Platform Systems",
    tagline:
      "Native Android and high-performance Flutter architectures engineered for fluid mobile experiences.",
    icon: "phone_android",
    badgeColor: "#38f2ff",
  },
  ios: {
    title: "iOS & Mobile Architectures",
    tagline:
      "Precision-crafted Swift and multi-platform mobile engines optimized for Apple silicon and modern UI.",
    icon: "phone_iphone",
    badgeColor: "#78f5ff",
  },
  web: {
    title: "Web Platforms & Cloud Infrastructure",
    tagline:
      "High-concurrency Next.js, React, and microservice architectures built for enterprise scalability.",
    icon: "language",
    badgeColor: "#3495ea",
  },
  ai: {
    title: "AI Models & Intelligent Agents",
    tagline:
      "Context-aware neural agents, multi-modal Gemini vision pipelines, and embedded intelligence engines.",
    icon: "smart_toy",
    badgeColor: "#a855f7",
  },
  automation: {
    title: "Automated Pipelines & DevTools",
    tagline:
      "Zero-latency automated scripts, background telemetry monitors, and programmatic workflows.",
    icon: "precision_manufacturing",
    badgeColor: "#10b981",
  },
};

export default function ViewAllProjectsPage() {
  const [config, setConfig] = useState<ArchiveConfig>(DEFAULT_ARCHIVE_CONFIG);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "name">("recent");
  const [viewMode, setViewMode] = useState<"sections" | "grid">("sections");
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch Archive CMS Config & Firestore Projects
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [archiveData, snap] = await Promise.all([
          getArchiveConfig(),
          getDocs(query(collection(db, "projects"), where("isPublic", "==", true))),
        ]);

        if (isMounted) setConfig(archiveData);

        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: d.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            category: data.category || "android",
            price: data.price ?? "0",
            discount: data.discount,
            pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
            tags: Array.isArray(data.tags) ? data.tags : [],
            isPublic: !!data.isPublic,
            imageUrl: data.imageUrl || data.image || "",
            details: data.details || "",
          } as ProjectItem;
        });

        if (isMounted) setProjects(list);
      } catch (err) {
        console.error("Error loading all projects:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Available unique categories
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

  // Filtered & Sorted Projects
  const filteredProjects = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const cat = selectedCategory.toLowerCase().trim();

    let result = projects.filter((p) => {
      const pCat = (p.category || "").toLowerCase();
      const pTags = (p.tags || []).map((t) => t.toLowerCase());
      const pTitle = p.title.toLowerCase();
      const pSub = p.subtitle.toLowerCase();
      const pDetails = (p.details || "").toLowerCase();

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
            pCat === "android"));

      const matchesSearch =
        !q ||
        pTitle.includes(q) ||
        pSub.includes(q) ||
        pDetails.includes(q) ||
        pCat.includes(q) ||
        pTags.some((t) => t.includes(q));

      return matchesCat && matchesSearch;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "price-asc") {
        const priceA = Number(a.discount || a.price) || 0;
        const priceB = Number(b.discount || b.price) || 0;
        return priceA - priceB;
      }
      if (sortBy === "price-desc") {
        const priceA = Number(a.discount || a.price) || 0;
        const priceB = Number(b.discount || b.price) || 0;
        return priceB - priceA;
      }
      return 0; // Default recent order
    });

    return result;
  }, [projects, selectedCategory, searchQuery, sortBy]);

  // Group projects section-wise by category
  const groupedProjects = useMemo(() => {
    const groups: { [cat: string]: ProjectItem[] } = {};

    filteredProjects.forEach((p) => {
      const cat = (p.category || "general").toLowerCase();
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    return groups;
  }, [filteredProjects]);

  return (
    <>
      <Head>
        <title>ALL PROJECTS // DEVENGINE ARCHIVE - Full Systems Catalog</title>
        <meta
          name="description"
          content="Complete index of production-ready mobile applications, web platforms, and automated software architectures engineered by DevEngine."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Global Cyber Backdrop */}
      <div className="fixed inset-0 bg-[#030712] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(14,19,31,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-60" />

      {/* Landing Navbar with DASHBOARD and ARCHIVE options */}
      <LandingNavbar />

      <main className="w-full relative text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712] overflow-x-hidden pt-32 pb-24">
        {/* =========================================================================
            HEADER & HERO DIRECTORY
        ========================================================================= */}
        <section className="px-6 sm:px-12 md:px-20 max-w-7xl mx-auto pt-8 pb-12">
          {/* Breadcrumb & Live Repo Status */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono">
              <Link href="/home" className="text-gray-400 hover:text-white transition">
                DASHBOARD
              </Link>
              <span className="text-gray-600">/</span>
              <Link href="/projects" className="text-gray-400 hover:text-white transition">
                ARCHIVE
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-[#38f2ff] font-bold">ALL PROJECTS</span>
            </div>

            <div className="inline-flex items-center gap-2 bg-[#0e131f]/80 px-3.5 py-1.5 rounded-full border border-white/10 text-[11px] font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300">LIVE REPOSITORY SYNC</span>
              <span className="text-gray-500">|</span>
              <span className="text-[#38f2ff] font-bold">{projects.length} SYSTEMS DEPLOYED</span>
            </div>
          </div>

          {/* Headline */}
          <div className="max-w-4xl">
            <div className="inline-block bg-[#38f2ff]/10 text-[#38f2ff] px-3.5 py-1 rounded font-jetbrains text-xs uppercase tracking-widest border border-[#38f2ff]/30 font-semibold mb-4">
              SYSTEMS ARCHIVE DIRECTORY
            </div>
            <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl text-white tracking-tight mb-6 leading-tight">
              Every Architecture.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#78f5ff] to-[#3495ea]">
                Fully Documented &amp; Production-Ready.
              </span>
            </h1>
            <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl leading-relaxed">
              Explore our complete repository across mobile engineering, high-throughput cloud infrastructure, intelligent AI workflows, and cross-platform tools.
            </p>
          </div>
        </section>

        {/* =========================================================================
            METRICS COMMAND STRIP (Exact width and container style as Search Command Center)
        ========================================================================= */}
        <section className="px-6 sm:px-12 md:px-20 pb-4">
          <div className="max-w-7xl mx-auto bg-[#080e1a]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0e131f]/80 p-4 sm:p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">
                  Total Systems
                </div>
                <div className="font-space text-2xl sm:text-3xl font-bold text-white">
                  {projects.length}
                </div>
              </div>

              <div className="bg-[#0e131f]/80 p-4 sm:p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">
                  Tech Categories
                </div>
                <div className="font-space text-2xl sm:text-3xl font-bold text-[#38f2ff]">
                  {availableCategories.length}
                </div>
              </div>

              <div className="bg-[#0e131f]/80 p-4 sm:p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">
                  Licensing
                </div>
                <div className="font-space text-base sm:text-lg font-bold text-white whitespace-nowrap">
                  Commercial / Full Source
                </div>
              </div>

              <div className="bg-[#0e131f]/80 p-4 sm:p-5 rounded-xl border border-white/5 flex flex-col justify-between">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">
                  Delivery Format
                </div>
                <div className="font-space text-base sm:text-lg font-bold text-emerald-400 whitespace-nowrap">
                  Instant Cloud Access
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            STICKY COMMAND & FILTER CENTER
        ========================================================================= */}
        <section className="sticky top-20 z-30 px-6 sm:px-12 md:px-20 py-4 mb-8">
          <div className="max-w-7xl mx-auto bg-[#080e1a]/90 backdrop-blur-2xl p-4 sm:p-5 rounded-2xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.7)] space-y-4">
            {/* Top Row: Search + Sort + View Mode */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search input with Ctrl+K shortcut */}
              <div className="relative w-full md:w-96">
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
                  placeholder="Search by title, tag, or technology..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#161c28] border border-white/10 rounded-xl py-2.5 pl-11 pr-14 text-sm text-white placeholder-gray-500 focus:border-[#38f2ff] focus:outline-none transition font-sans"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1 text-xs font-bold"
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

              {/* Controls: Sort & View Toggle */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {/* Sort Selector */}
                <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                  <span>SORT:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-[#161c28] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#38f2ff] focus:outline-none font-mono"
                  >
                    <option value="recent">Latest Releases</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">System Name (A-Z)</option>
                  </select>
                </div>

                {/* View Mode Toggle: Section-wise vs Unified Grid */}
                <div className="flex items-center bg-[#161c28] p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setViewMode("sections")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                      viewMode === "sections"
                        ? "bg-[#38f2ff] text-black font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Grouped by Category Section"
                  >
                    <span className="material-symbols-outlined text-sm">view_agenda</span>
                    <span>Sections</span>
                  </button>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 ${
                      viewMode === "grid"
                        ? "bg-[#38f2ff] text-black font-bold shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                    title="Bento Matrix View"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    <span>Matrix</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Dynamic Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none border-t border-white/5 pt-3">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-jetbrains text-xs tracking-wider transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                    : "bg-[#0e131f] text-gray-400 hover:text-white border border-white/5 hover:border-white/20"
                }`}
              >
                ALL ({projects.length})
              </button>

              {availableCategories.map((cat) => {
                const count = projects.filter(
                  (p) => p.category?.toLowerCase() === cat.toLowerCase()
                ).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full font-jetbrains text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                        : "bg-[#0e131f] text-gray-400 hover:text-white border border-white/5 hover:border-white/20"
                    }`}
                  >
                    <span>{cat}</span>
                    {count > 0 && (
                      <span className="text-[10px] opacity-75">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* =========================================================================
            PROJECT CONTENT SECTION
        ========================================================================= */}
        <div className="px-6 sm:px-12 md:px-20 max-w-7xl mx-auto">
          {loading ? (
            <div className="py-32 flex flex-col items-center justify-center">
              <HelixLoader size={56} color="#38f2ff" />
              <p className="mt-4 font-jetbrains text-xs text-gray-400">
                Compiling multi-domain engineering directory…
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-16 text-center bg-[#080e1a]/80 rounded-3xl border border-white/10 max-w-2xl mx-auto my-12">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 text-[#38f2ff]">
                <span className="material-symbols-outlined text-2xl">search_off</span>
              </div>
              <h3 className="font-space text-xl font-bold text-white mb-2">
                No matching systems located
              </h3>
              <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
                No projects found matching &ldquo;{searchQuery}&rdquo; in category &ldquo;
                {selectedCategory.toUpperCase()}&rdquo;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-6 py-2.5 rounded-full bg-[#38f2ff] text-black font-mono text-xs font-bold hover:bg-[#00dbe8] transition"
              >
                Reset All Filters
              </button>
            </div>
          ) : viewMode === "sections" ? (
            /* =======================================================================
               VIEW MODE 1: SECTION-WISE GROUPED BY CATEGORY DOMAIN
            ======================================================================= */
            <div className="space-y-20">
              {Object.entries(groupedProjects).map(([catKey, catProjects]) => {
                const meta = CATEGORY_METADATA[catKey] || {
                  title: `${catKey.toUpperCase()} Solutions`,
                  tagline: "High-performance specialized architecture engineered for modern use.",
                  icon: "layers",
                  badgeColor: "#38f2ff",
                };

                return (
                  <section
                    key={catKey}
                    id={`sec-${catKey}`}
                    className="pt-6 pb-2 scroll-mt-36"
                  >
                    {/* High-Tech Category Section Header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-white/10">
                      <div>
                        <div className="inline-flex items-center gap-2 bg-[#161c28] px-3 py-1 rounded-full border border-white/10 mb-3">
                          <span
                            className="material-symbols-outlined text-sm"
                            style={{ color: meta.badgeColor }}
                          >
                            {meta.icon}
                          </span>
                          <span className="font-jetbrains text-xs uppercase tracking-widest font-bold text-white">
                            {catKey} DOMAIN
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            ({catProjects.length} Systems)
                          </span>
                        </div>
                        <h2 className="font-space font-bold text-2xl sm:text-4xl text-white tracking-tight">
                          {meta.title}
                        </h2>
                        <p className="font-sans text-sm text-[#849495] max-w-2xl mt-1">
                          {meta.tagline}
                        </p>
                      </div>

                      <div className="text-xs font-mono text-gray-500">
                        SHOWING {catProjects.length} ARCHITECTURES
                      </div>
                    </div>

                    {/* Different Bento Grid Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {catProjects.map((project, idx) => {
                        const dummyImage =
                          config.defaultProjectImages?.[idx % 6] ||
                          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop";
                        const displayImage = project.imageUrl || dummyImage;

                        // STYLE A: Hero Spotlight Card (spans 2 cols on first item)
                        if (idx === 0) {
                          return (
                            <Link
                              key={project.id}
                              href={`/projects/${project.slug}`}
                              className="md:col-span-2 bg-[#080e1a]/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden shadow-2xl"
                            >
                              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6">
                                <div>
                                  <div className="inline-flex items-center gap-2 bg-[#38f2ff]/10 text-[#38f2ff] px-2.5 py-0.5 rounded font-jetbrains text-[10px] uppercase font-bold mb-2">
                                    ★ FEATURED IN {catKey.toUpperCase()}
                                  </div>
                                  <h3 className="font-space text-2xl sm:text-3xl font-bold text-white group-hover:text-[#38f2ff] transition-colors">
                                    {project.title}
                                  </h3>
                                  <p className="text-sm text-[#849495] mt-1 line-clamp-2 max-w-xl">
                                    {project.subtitle || project.details}
                                  </p>
                                </div>

                                <div className="text-right flex-shrink-0">
                                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-widest mb-1.5">
                                    Licensing Rates
                                  </div>
                                  <PriceDisplay
                                    prices={getProjectPrices(project)}
                                    align="right"
                                    size="md"
                                  />
                                </div>
                              </div>

                              {/* Widescreen Image Mockup Frame */}
                              <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-white/10 my-4 shadow-2xl">
                                <Image
                                  src={displayImage}
                                  alt={project.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a] via-transparent to-transparent pointer-events-none" />
                                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
                                  {(project.tags || []).slice(0, 4).map((t) => (
                                    <span
                                      key={t}
                                      className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-gray-300 border border-white/10"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="flex justify-between items-center pt-3 border-t border-white/5 font-jetbrains text-xs">
                                <span className="text-gray-400 group-hover:text-white transition flex items-center gap-1">
                                  Inspect Architecture Details ↗
                                </span>
                                <span className="bg-[#38f2ff] text-black px-4 py-1.5 rounded-full font-bold">
                                  VIEW SPECS
                                </span>
                              </div>
                            </Link>
                          );
                        }

                        // STYLE B: Cyber Glass Telemetry Card
                        if (idx % 2 === 1) {
                          return (
                            <Link
                              key={project.id}
                              href={`/projects/${project.slug}`}
                              className="bg-[#080e1a]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 group flex flex-col justify-between shadow-xl"
                            >
                              <div>
                                <div className="flex justify-between items-center mb-3">
                                  <span className="bg-[#161c28] px-2.5 py-1 rounded font-jetbrains text-[10px] text-gray-300 uppercase">
                                    {project.category}
                                  </span>
                                  <span className="text-emerald-400 text-[10px] font-mono flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    READY
                                  </span>
                                </div>

                                <h3 className="font-space text-xl font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-2">
                                  {project.title}
                                </h3>

                                <p className="text-xs text-[#849495] line-clamp-2 mb-4">
                                  {project.subtitle || project.details}
                                </p>

                                {/* Image Frame */}
                                <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 mb-4">
                                  <Image
                                    src={displayImage}
                                    alt={project.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                    unoptimized
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 via-transparent to-transparent pointer-events-none" />
                                </div>
                              </div>

                              <div className="pt-3 border-t border-white/5 flex flex-wrap justify-between items-center gap-2">
                                <div>
                                  <div className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-1">
                                    PRICE
                                  </div>
                                  <PriceDisplay
                                    prices={getProjectPrices(project)}
                                    size="sm"
                                  />
                                </div>
                                <span className="font-mono text-xs text-white group-hover:text-[#38f2ff] transition">
                                  Details →
                                </span>
                              </div>
                            </Link>
                          );
                        }

                        // STYLE C: Matrix Bento Card
                        return (
                          <Link
                            key={project.id}
                            href={`/projects/${project.slug}`}
                            className="bg-[#080e1a]/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 group flex flex-col justify-between shadow-xl"
                          >
                            <div>
                              <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-mono text-[#38f2ff]">
                                  SYS_{project.id.slice(0, 6).toUpperCase()}
                                </span>
                                <span className="text-gray-500 group-hover:text-[#38f2ff] transition">
                                  ↗
                                </span>
                              </div>

                              <h3 className="font-space text-xl font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-2">
                                {project.title}
                              </h3>

                              <p className="text-xs text-[#849495] line-clamp-2 mb-4">
                                {project.subtitle}
                              </p>

                              {/* Image Frame */}
                              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10 mb-4">
                                <Image
                                  src={displayImage}
                                  alt={project.title}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                                  unoptimized
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 via-transparent to-transparent pointer-events-none" />
                              </div>
                            </div>

                            <div className="pt-3 border-t border-white/5 flex flex-wrap justify-between items-center gap-2 font-jetbrains text-xs">
                              <span className="text-gray-400">
                                {project.category.toUpperCase()}
                              </span>
                              <PriceDisplay
                                prices={getProjectPrices(project)}
                                align="right"
                                size="sm"
                              />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            /* =======================================================================
               VIEW MODE 2: UNIFIED BENTO MATRIX GRID
            ======================================================================= */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredProjects.map((project, idx) => {
                const dummyImage =
                  config.defaultProjectImages?.[idx % 6] ||
                  "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop";
                const displayImage = project.imageUrl || dummyImage;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.slug}`}
                    className="bg-[#080e1a]/85 backdrop-blur-xl rounded-3xl p-6 border border-white/10 hover:border-[#38f2ff]/40 transition-all duration-300 group flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="bg-[#161c28] px-2.5 py-1 rounded font-jetbrains text-[10px] text-gray-300 uppercase">
                          {project.category}
                        </span>
                        <span className="text-gray-600 group-hover:text-[#38f2ff] transition">
                          ↗
                        </span>
                      </div>

                      <h3 className="font-space text-lg font-bold text-white group-hover:text-[#38f2ff] transition-colors mb-1.5">
                        {project.title}
                      </h3>

                      <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                        {project.subtitle}
                      </p>

                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/10 mb-4">
                        <Image
                          src={displayImage}
                          alt={project.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 via-transparent to-transparent pointer-events-none" />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex flex-wrap justify-between items-center gap-2 font-jetbrains text-xs">
                      <div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider block mb-1">
                          PRICE
                        </span>
                        <PriceDisplay
                          prices={getProjectPrices(project)}
                          size="sm"
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-300 group-hover:text-[#38f2ff] transition">
                        Inspect System →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Cyber Dashboard Footer */}
      <LandingFooter />
    </>
  );
}
