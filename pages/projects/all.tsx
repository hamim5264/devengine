import React, { useEffect, useState, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
  pricingPlans?: any[];
  tags: string[];
  isPublic?: boolean;
  imageUrl?: string;
  image?: string;
  images?: string[];
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
    tagline: "Native Android and high-performance Flutter architectures engineered for fluid mobile experiences.",
    icon: "phone_android",
    badgeColor: "#2cecf7",
  },
  ios: {
    title: "iOS & Mobile Architectures",
    tagline: "Precision-crafted Swift and multi-platform mobile engines optimized for Apple silicon and modern UI.",
    icon: "phone_iphone",
    badgeColor: "#38bdf8",
  },
  web: {
    title: "Web Platforms & Cloud Infrastructure",
    tagline: "High-concurrency Next.js, React, and microservice architectures built for enterprise scalability.",
    icon: "language",
    badgeColor: "#3495ea",
  },
  ai: {
    title: "AI Models & Intelligent Agents",
    tagline: "Context-aware neural agents, multi-modal Gemini vision pipelines, and embedded intelligence engines.",
    icon: "smart_toy",
    badgeColor: "#a855f7",
  },
  "ai-machine-learning": {
    title: "AI & Machine Learning Systems",
    tagline: "Next-gen deep learning, computer vision, and context-aware predictive engines.",
    icon: "psychology",
    badgeColor: "#c084fc",
  },
  automation: {
    title: "Automated Pipelines & DevTools",
    tagline: "Zero-latency automated scripts, background telemetry monitors, and programmatic workflows.",
    icon: "precision_manufacturing",
    badgeColor: "#10b981",
  },
  "e-commerce": {
    title: "E-Commerce & Digital Storefronts",
    tagline: "High-conversion transactional architectures, inventory synchronization, and multi-gateway checkout engines.",
    icon: "shopping_cart",
    badgeColor: "#f59e0b",
  },
  ecommerce: {
    title: "E-Commerce & Digital Storefronts",
    tagline: "High-conversion transactional architectures, inventory synchronization, and multi-gateway checkout engines.",
    icon: "shopping_cart",
    badgeColor: "#f59e0b",
  },
  community: {
    title: "Community & Collaborative Networks",
    tagline: "Interactive community portals, real-time message feeds, and verified member management architectures.",
    icon: "groups",
    badgeColor: "#06b6d4",
  },
  "job-portal": {
    title: "Recruitment & Career Portals",
    tagline: "Enterprise talent matching systems, applicant tracking, and automated candidate evaluation engines.",
    icon: "work",
    badgeColor: "#6366f1",
  },
  education: {
    title: "EdTech & Learning Platforms",
    tagline: "Modern courseware distribution, student telemetry, and interactive assessment infrastructure.",
    icon: "school",
    badgeColor: "#ec4899",
  },
};

function getCategoryMeta(cat: string): CategoryMeta {
  const key = cat.toLowerCase().trim();
  return (
    CATEGORY_METADATA[key] || {
      title: `${cat.toUpperCase()} Solutions`,
      tagline: "High-performance specialized architecture engineered for modern use.",
      icon: "layers",
      badgeColor: "#2cecf7",
    }
  );
}

function formatCategoryLabel(cat: string): string {
  const clean = cat.toLowerCase().trim();
  if (clean === "all") return "All Architectures";
  if (clean === "ai-machine-learning") return "AI & ML";
  if (clean === "job-portal") return "Job Portals";
  if (clean === "e-commerce" || clean === "ecommerce") return "E-Commerce";
  if (clean === "ios") return "iOS";
  if (clean === "web") return "Web Platforms";
  if (clean === "ai") return "AI & Agents";
  if (clean === "android") return "Android";
  if (clean === "automation") return "Automation";
  if (clean === "community") return "Community";
  if (clean === "education") return "Education";
  return clean
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Adaptive Image Frame Component
 * Dynamically flexes based on image orientation (portrait phone, landscape desktop, or square),
 * with ambient blurred backdrop glow and a cyber blueprint fallback when images are absent.
 */
function ProjectImageFrame({
  src,
  alt,
  category,
  title,
  tags,
  maxHeightClass = "max-h-[220px] sm:max-h-[260px]",
}: {
  src?: string;
  alt: string;
  category: string;
  title: string;
  tags?: string[];
  maxHeightClass?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const meta = getCategoryMeta(category);
  const hasImage = Boolean(src && !imgError);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[var(--devengine-border)] bg-gradient-to-b from-[var(--devengine-raised)] to-[var(--devengine-surface)] flex items-center justify-center p-3 sm:p-4 min-h-[190px] sm:min-h-[240px] group-hover:border-[#2cecf7]/60 transition-all duration-300 shadow-inner">
      {/* Background ambient blur when image exists */}
      {hasImage && (
        <img
          src={src}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-20 dark:opacity-30 scale-125 pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Cyber blueprint grid texture */}
      <div className="absolute inset-0 bg-[linear-gradient(var(--devengine-border)_1px,transparent_1px),linear-gradient(90deg,var(--devengine-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-15 pointer-events-none" />

      {/* Top window dots / category indicator */}
      <div className="absolute top-2.5 left-3 flex items-center gap-1.5 z-20 opacity-70">
        <span className="w-2 h-2 rounded-full bg-rose-500/70" />
        <span className="w-2 h-2 rounded-full bg-amber-500/70" />
        <span className="w-2 h-2 rounded-full bg-emerald-500/70" />
        <span className="text-[9px] font-mono text-[var(--devengine-muted)] ml-1 tracking-wider uppercase font-semibold">
          {category}
        </span>
      </div>

      {hasImage ? (
        <img
          src={src}
          alt={alt || title}
          onError={() => setImgError(true)}
          className={`relative z-10 ${maxHeightClass} w-auto max-w-full object-contain rounded-xl shadow-md group-hover:scale-[1.03] transition-transform duration-500`}
          loading="lazy"
        />
      ) : (
        /* Sleek Blueprint Fallback when no image is uploaded */
        <div className="relative z-10 flex flex-col items-center justify-center text-center p-6 w-full h-full min-h-[180px]">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-sm border border-[var(--devengine-border)]"
            style={{ backgroundColor: `${meta.badgeColor}15`, color: meta.badgeColor }}
          >
            <span className="material-symbols-outlined text-2xl">{meta.icon}</span>
          </div>
          <div className="text-xs font-mono font-bold text-[var(--devengine-text)] uppercase tracking-wider mb-1 line-clamp-1">
            {title}
          </div>
          <div className="text-[10px] font-mono text-[var(--devengine-muted)] tracking-widest uppercase">
            SYSTEM ARCHITECTURE BLUEPRINT
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">
              PRODUCTION READY
            </span>
          </div>
        </div>
      )}

      {/* Bottom Tags Pill Bar */}
      {tags && tags.length > 0 && (
        <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap gap-1 z-20 pointer-events-none">
          {tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="bg-[var(--devengine-surface)]/90 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-mono text-[var(--devengine-text)] border border-[var(--devengine-border)] shadow-xs"
            >
              #{t}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="bg-[var(--devengine-surface)]/90 backdrop-blur-md px-1.5 py-0.5 rounded-md text-[9px] font-mono text-[var(--devengine-muted)] border border-[var(--devengine-border)] shadow-xs">
              +{tags.length - 3}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ViewAllProjectsPage() {
  const [config, setConfig] = useState<ArchiveConfig>(DEFAULT_ARCHIVE_CONFIG);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc" | "name">("recent");
  const [viewMode, setViewMode] = useState<"sections" | "grid" | "showcase">("sections");
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
        const colRef = collection(db, "projects");
        let [archiveData, snap] = await Promise.all([
          getArchiveConfig(),
          getDocs(query(colRef, where("isPublic", "==", true))),
        ]);

        if (snap.empty) {
          snap = await getDocs(colRef);
        }

        if (isMounted) setConfig(archiveData);

        const list = snap.docs
          .filter((d) => (d.data() as any).isPublic !== false)
          .map((d) => {
            const data = d.data() as any;
            const allImages = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
            const primaryImage = allImages[0] || data.imageUrl || data.image || "";

            return {
              id: d.id,
              slug: data.slug || d.id,
              title: data.title || "Untitled System",
              subtitle: data.subtitle || "",
              category: data.category || "general",
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
              pricingPlans: Array.isArray(data.pricingPlans) ? data.pricingPlans : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              isPublic: data.isPublic !== false,
              imageUrl: primaryImage,
              image: primaryImage,
              images: allImages,
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

      {/* Landing Navbar with Navigation & Global Theme Switcher */}
      <LandingNavbar />

      <main className="w-full relative min-h-screen bg-[var(--devengine-page)] text-[var(--devengine-text)] font-[family-name:var(--font-site,'Poppins',sans-serif)] overflow-x-hidden pt-28 sm:pt-32 pb-24 transition-colors duration-300">
        {/* Ambient subtle cyber blueprint & atmospheric lighting */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -top-[15%] -left-[10%] w-[min(60vw,750px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.18),transparent_70%)] blur-[90px] opacity-35 dark:opacity-50" />
          <div className="absolute bottom-[10%] -right-[8%] w-[min(55vw,680px)] aspect-square rounded-full bg-[radial-gradient(circle,rgba(44,236,247,0.15),transparent_70%)] blur-[90px] opacity-30 dark:opacity-40" />
          <div className="absolute inset-0 bg-[linear-gradient(var(--devengine-border)_1px,transparent_1px),linear-gradient(90deg,var(--devengine-border)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20 dark:opacity-30 [mask-image:radial-gradient(ellipse_90%_80%_at_50%_50%,#000_30%,transparent_85%)]" />
        </div>

        {/* =========================================================================
            HEADER & HERO DIRECTORY (EXECUTIVE HIGH-CONTRAST HERO)
        ========================================================================= */}
        <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pt-6 pb-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* Breadcrumb & Live Repo Telemetry Status */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono">
                <Link href="/home" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium">
                  DASHBOARD
                </Link>
                <span className="opacity-40 text-slate-400">/</span>
                <Link href="/projects" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium">
                  ARCHIVE
                </Link>
                <span className="opacity-40 text-slate-400">/</span>
                <span className="text-[#0284c7] dark:text-[#2cecf7] font-bold">ALL PROJECTS</span>
              </div>

              <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-200/90 dark:border-emerald-500/20 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold">LIVE REPOSITORY SYNC</span>
                <span className="opacity-40">|</span>
                <span className="font-bold">{projects.length} SYSTEMS DEPLOYED</span>
              </div>
            </div>

            {/* Headline with 100% Solid, Crisp, High-Contrast Typography */}
            <div className="max-w-5xl">
              <div className="inline-flex items-center gap-2 bg-cyan-50 dark:bg-[#2cecf7]/10 text-[#0284c7] dark:text-[#2cecf7] px-3.5 py-1 rounded-full font-jetbrains text-xs uppercase tracking-widest border border-cyan-200 dark:border-[#2cecf7]/20 font-bold mb-4 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284c7] dark:bg-[#2cecf7]" />
                SYSTEMS ARCHIVE DIRECTORY
              </div>
              <h1 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight mb-4 sm:mb-5 leading-[1.12]">
                <span className="text-slate-950 dark:text-slate-50">Every Architecture.</span>
                <br />
                <span className="text-[#0284c7] dark:text-[#2cecf7]">
                  Fully Documented &amp; Production-Ready.
                </span>
              </h1>
              <p className="font-sans text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed font-normal">
                Explore our complete repository across mobile engineering, high-throughput cloud infrastructure, intelligent AI workflows, and cross-platform tools.
              </p>
            </div>
          </motion.div>
        </section>

        {/* =========================================================================
            METRICS COMMAND STRIP (EXECUTIVE TELEMETRY CARDS)
        ========================================================================= */}
        <section className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 pb-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="w-full"
          >
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {/* Metric 1: Total Systems */}
              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    Total Architectures
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-[#0284c7] dark:text-[#2cecf7] flex items-center justify-center border border-cyan-200/60 dark:border-cyan-500/20">
                    <span className="material-symbols-outlined text-lg">deployed_code</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)]">
                    {projects.length}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    ● Deployed
                  </span>
                </div>
              </div>

              {/* Metric 2: Tech Domains */}
              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    Tech Domains
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-200/60 dark:border-sky-500/20">
                    <span className="material-symbols-outlined text-lg">category</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#0284c7] dark:text-[#2cecf7] font-[family-name:var(--font-site,'Poppins',sans-serif)]">
                    {availableCategories.length}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                    Cross-Stack
                  </span>
                </div>
              </div>

              {/* Metric 3: Licensing */}
              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    License Rights
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-500/20">
                    <span className="material-symbols-outlined text-lg">verified_user</span>
                  </div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-[family-name:var(--font-site,'Poppins',sans-serif)]">
                    Commercial Use
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                    Full Source Code Rights
                  </div>
                </div>
              </div>

              {/* Metric 4: Delivery Speed */}
              <div className="bg-white dark:bg-[#0a0f1d] p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xs hover:border-[#2cecf7] transition-all duration-300 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                    Delivery Speed
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-500/20">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                  </div>
                </div>
                <div>
                  <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-[family-name:var(--font-site,'Poppins',sans-serif)]">
                    Instant Cloud Access
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-medium">
                    Immediate Git / Portal
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* =========================================================================
            STICKY COMMAND & FILTER CENTER (POLISHED & HIGH CONTRAST)
        ========================================================================= */}
        <section className="sticky top-[68px] sm:top-[76px] z-30 w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 py-2.5 sm:py-3 mb-6 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="w-full bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-2xl p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-cyan-500/20 shadow-xl shadow-slate-200/40 dark:shadow-black/60 space-y-3 pointer-events-auto"
          >
            {/* Top Row: Search + Sort + View Mode Switcher */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search input with Ctrl+K shortcut */}
              <div className="relative w-full md:w-80 lg:w-96 xl:w-[460px] 2xl:w-[520px]">
                <svg
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
                  placeholder="Search architectures, tags, stacks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-full py-2 pl-10 pr-12 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#2cecf7] focus:bg-white dark:focus:bg-[#111827] focus:ring-2 focus:ring-[#2cecf7]/20 outline-none transition font-sans shadow-2xs"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                ) : (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex gap-1 pointer-events-none">
                    <kbd className="font-jetbrains text-[9px] bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      ⌘
                    </kbd>
                    <kbd className="font-jetbrains text-[9px] bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      K
                    </kbd>
                  </div>
                )}
              </div>

              {/* Controls: Sort & 3 Grid Looks Switcher */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
                {/* Sort Selector */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-slate-400 font-medium">
                  <span className="hidden sm:inline font-semibold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">SORT:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-50 dark:bg-[#111827] border border-slate-200 dark:border-slate-700/80 rounded-full px-3.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-[#2cecf7] outline-none font-mono cursor-pointer font-medium shadow-2xs"
                  >
                    <option value="recent">Latest Releases</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name">System Name (A-Z)</option>
                  </select>
                </div>

                {/* 3 Grid Looks: Sections | Matrix | Showcase */}
                <div className="flex items-center bg-slate-100 dark:bg-[#111827] p-1 rounded-full border border-slate-200/80 dark:border-slate-800 shadow-inner">
                  <button
                    onClick={() => setViewMode("sections")}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === "sections"
                        ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                    }`}
                    title="Domain Category Sections"
                  >
                    <span className="material-symbols-outlined text-sm">view_agenda</span>
                    <span className="hidden sm:inline">Sections</span>
                  </button>

                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                    }`}
                    title="Bento Matrix Grid"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    <span className="hidden sm:inline">Matrix</span>
                  </button>

                  <button
                    onClick={() => setViewMode("showcase")}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                      viewMode === "showcase"
                        ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium"
                    }`}
                    title="Architectural Spec Showcase"
                  >
                    <span className="material-symbols-outlined text-sm">view_carousel</span>
                    <span className="hidden sm:inline">Showcase</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Row: Dynamic High-Contrast Category Filter Chips (Clean & Scrollbar-Free) */}
            <div
              className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth border-t border-slate-100 dark:border-slate-800/80 pt-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              <button
                onClick={() => setSelectedCategory("all")}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full font-jetbrains text-xs tracking-wide transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/20 border border-[#2cecf7]"
                    : "bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 hover:border-[#2cecf7] shadow-2xs"
                }`}
              >
                <span>All Architectures</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${selectedCategory === "all" ? "bg-[#02040a]/15 text-[#02040a] font-bold" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold"}`}>
                  {projects.length}
                </span>
              </button>

              {availableCategories.map((cat) => {
                const count = projects.filter(
                  (p) => p.category?.toLowerCase() === cat.toLowerCase()
                ).length;
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();

                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full font-jetbrains text-xs tracking-wide transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                      isSelected
                        ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-md shadow-[#2cecf7]/20 border border-[#2cecf7]"
                        : "bg-slate-50 dark:bg-[#111827] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/80 hover:border-[#2cecf7] shadow-2xs"
                    }`}
                  >
                    <span>{formatCategoryLabel(cat)}</span>
                    {count > 0 && (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isSelected ? "bg-[#02040a]/15 text-[#02040a] font-bold" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold"}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {(selectedCategory !== "all" || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="whitespace-nowrap px-3.5 py-1.5 rounded-full font-jetbrains text-xs tracking-wide transition-all cursor-pointer flex items-center gap-1.5 shrink-0 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/40 ml-auto"
                  title="Clear active search and category filter"
                >
                  <span>Clear Filter</span>
                  <span className="text-[10px] font-bold">✕</span>
                </button>
              )}
            </div>
          </motion.div>
        </section>


        {/* =========================================================================
            PROJECT CONTENT SECTION (ANIMATED & MULTI-VIEW)
        ========================================================================= */}
        <div className="w-full max-w-[1780px] 2xl:max-w-[1920px] mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 relative z-10 pb-20">
          {loading ? (
            <div className="py-28 flex flex-col items-center justify-center">
              <HelixLoader size={56} color="#2cecf7" />
              <p className="mt-4 font-jetbrains text-xs text-[var(--devengine-muted)]">
                Compiling multi-domain engineering directory…
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-10 sm:p-16 text-center bg-[var(--devengine-surface)] rounded-3xl border border-[var(--devengine-border)] max-w-2xl mx-auto my-12 shadow-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--devengine-soft)] border border-[var(--devengine-border)] flex items-center justify-center mx-auto mb-4 text-[#0284c7] dark:text-[#2cecf7]">
                <span className="material-symbols-outlined text-2xl">search_off</span>
              </div>
              <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] text-xl font-bold text-[var(--devengine-text)] mb-2">
                No matching systems located
              </h3>
              <p className="text-sm text-[var(--devengine-muted)] mb-6 max-w-md mx-auto">
                No projects found matching &ldquo;{searchQuery}&rdquo; in category &ldquo;
                {selectedCategory.toUpperCase()}&rdquo;.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-6 py-2.5 rounded-full bg-[#2cecf7] text-[#02040a] font-mono text-xs font-bold hover:bg-[#53f2fb] transition cursor-pointer shadow-sm"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${viewMode}-${selectedCategory}-${sortBy}-${searchQuery}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.3 }}
              >
                {/* -------------------------------------------------------------
                    VIEW MODE 1: SECTIONS VIEW (Grouped with Spotlight Hero)
                ------------------------------------------------------------- */}
                {viewMode === "sections" && (
                  <div className="space-y-16 sm:space-y-20">
                    {Object.entries(groupedProjects).map(([catKey, catProjects]) => {
                      const meta = getCategoryMeta(catKey);

                      return (
                        <section key={catKey} id={`sec-${catKey}`} className="pt-4 pb-2 scroll-mt-36">
                          {/* Domain Header */}
                          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6 pb-4 border-b border-[var(--devengine-border)]">
                            <div>
                              <div className="inline-flex items-center gap-2 bg-[var(--devengine-surface)] px-3 py-1 rounded-full border border-[var(--devengine-border)] mb-2.5 shadow-xs">
                                <span className="material-symbols-outlined text-sm" style={{ color: meta.badgeColor }}>
                                  {meta.icon}
                                </span>
                                <span className="font-jetbrains text-xs uppercase tracking-widest font-bold text-[var(--devengine-text)]">
                                  {catKey} DOMAIN
                                </span>
                                <span className="text-[10px] font-mono text-[var(--devengine-muted)]">
                                  ({catProjects.length} Systems)
                                </span>
                              </div>
                              <h2 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] font-bold text-2xl sm:text-3xl lg:text-4xl text-[var(--devengine-text)] tracking-tight">
                                {meta.title}
                              </h2>
                              <p className="font-sans text-xs sm:text-sm text-[var(--devengine-muted)] max-w-2xl mt-1">
                                {meta.tagline}
                              </p>
                            </div>

                            <div className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase tracking-wider">
                              SHOWING {catProjects.length} ARCHITECTURES
                            </div>
                          </div>

                          {/* Grid with Spotlight First Item */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
                            {catProjects.map((project, idx) => {
                              const displayImage =
                                project.imageUrl ||
                                project.image ||
                                (Array.isArray(project.images) && project.images[0]) ||
                                "";

                              // Spotlight Hero Card (Item 0 spans 2 cols on lg)
                              if (idx === 0) {
                                return (
                                  <Link
                                    key={project.id}
                                    href={`/projects/${project.slug}`}
                                    className="md:col-span-2 bg-[var(--devengine-surface)] backdrop-blur-2xl rounded-3xl p-5 sm:p-7 border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all duration-300 group flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-xl hover:shadow-[#2cecf7]/5"
                                  >
                                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                                      <div>
                                        <div className="inline-flex items-center gap-1.5 bg-[var(--devengine-soft)] text-[#0284c7] dark:text-[#2cecf7] px-2.5 py-0.5 rounded font-jetbrains text-[10px] uppercase font-bold mb-2 border border-[var(--devengine-border)]">
                                          ★ FEATURED ARCHITECTURE
                                        </div>
                                        <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] text-2xl sm:text-3xl font-bold text-[var(--devengine-text)] group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors">
                                          {project.title}
                                        </h3>
                                        <p className="text-xs sm:text-sm text-[var(--devengine-muted)] mt-1 line-clamp-2 max-w-xl">
                                          {project.subtitle || project.details}
                                        </p>
                                      </div>

                                      <div className="text-left sm:text-right flex-shrink-0">
                                        <div className="text-[9px] font-mono text-[var(--devengine-muted)] uppercase tracking-widest mb-1 font-semibold">
                                          Licensing Rates
                                        </div>
                                        <PriceDisplay prices={getProjectPrices(project)} align="left" size="md" />
                                      </div>
                                    </div>

                                    {/* Flexible Image Preview Frame */}
                                    <ProjectImageFrame
                                      src={displayImage}
                                      alt={project.title}
                                      category={project.category}
                                      title={project.title}
                                      tags={project.tags}
                                      maxHeightClass="max-h-[220px] sm:max-h-[300px]"
                                    />

                                    <div className="flex justify-between items-center pt-3.5 mt-4 border-t border-[var(--devengine-border)] font-jetbrains text-xs">
                                      <span className="text-[var(--devengine-muted)] group-hover:text-[var(--devengine-text)] transition flex items-center gap-1 text-[11px]">
                                        Inspect Architecture Details ↗
                                      </span>
                                      <span className="bg-[#2cecf7] text-[#02040a] px-4 py-1.5 rounded-full font-bold shadow-sm text-xs hover:bg-[#53f2fb] transition">
                                        VIEW SPECS
                                      </span>
                                    </div>
                                  </Link>
                                );
                              }

                              // Standard Bento Card
                              return (
                                <Link
                                  key={project.id}
                                  href={`/projects/${project.slug}`}
                                  className="bg-[var(--devengine-surface)] backdrop-blur-xl rounded-3xl p-5 sm:p-6 border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all duration-300 group flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-[#2cecf7]/5"
                                >
                                  <div>
                                    <div className="flex justify-between items-center mb-2.5">
                                      <span className="bg-[var(--devengine-soft)] px-2.5 py-0.5 rounded font-jetbrains text-[10px] text-[#0284c7] dark:text-[#2cecf7] uppercase font-bold border border-[var(--devengine-border)]">
                                        {project.category}
                                      </span>
                                      <span className="text-emerald-500 text-[10px] font-mono flex items-center gap-1 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        READY
                                      </span>
                                    </div>

                                    <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] text-lg sm:text-xl font-bold text-[var(--devengine-text)] group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors mb-1.5">
                                      {project.title}
                                    </h3>

                                    <p className="text-xs sm:text-sm text-[var(--devengine-muted)] line-clamp-2 mb-3.5 leading-relaxed font-normal">
                                      {project.subtitle || project.details}
                                    </p>

                                    {/* Flexible Inside Frame */}
                                    <ProjectImageFrame
                                      src={displayImage}
                                      alt={project.title}
                                      category={project.category}
                                      title={project.title}
                                      tags={project.tags}
                                    />
                                  </div>

                                  <div className="pt-3.5 mt-4 border-t border-[var(--devengine-border)] flex flex-wrap justify-between items-center gap-2">
                                    <div>
                                      <div className="text-[10px] font-mono font-bold text-[var(--devengine-muted)] uppercase tracking-wider mb-1">
                                        PRICE
                                      </div>
                                      <PriceDisplay prices={getProjectPrices(project)} size="md" />
                                    </div>
                                    <span className="font-mono text-xs text-[#0284c7] dark:text-[#2cecf7] font-semibold transition group-hover:translate-x-1 duration-300">
                                      Details →
                                    </span>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}

                {/* -------------------------------------------------------------
                    VIEW MODE 2: MATRIX VIEW (Uniform Multi-Column Bento Grid)
                ------------------------------------------------------------- */}
                {viewMode === "grid" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-5 sm:gap-6">
                    {filteredProjects.map((project) => {
                      const displayImage =
                        project.imageUrl ||
                        project.image ||
                        (Array.isArray(project.images) && project.images[0]) ||
                        "";

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.slug}`}
                          className="bg-[var(--devengine-surface)] backdrop-blur-xl rounded-3xl p-5 border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all duration-300 group flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-[#2cecf7]/5"
                        >
                          <div>
                            <div className="flex justify-between items-center mb-2.5">
                              <span className="bg-[var(--devengine-soft)] px-2.5 py-0.5 rounded font-jetbrains text-[10px] text-[#0284c7] dark:text-[#2cecf7] uppercase font-bold border border-[var(--devengine-border)]">
                                {project.category}
                              </span>
                              <span className="text-[10px] font-mono text-[var(--devengine-muted)] group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition">
                                ↗
                              </span>
                            </div>

                            <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] text-lg font-bold text-[var(--devengine-text)] group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors mb-1.5">
                              {project.title}
                            </h3>

                            <p className="text-xs sm:text-sm text-[var(--devengine-muted)] line-clamp-2 mb-3 leading-relaxed font-normal">
                              {project.subtitle || project.details}
                            </p>

                            {/* Flexible Image Preview Frame */}
                            <ProjectImageFrame
                              src={displayImage}
                              alt={project.title}
                              category={project.category}
                              title={project.title}
                              tags={project.tags}
                            />
                          </div>

                          <div className="pt-3.5 mt-3.5 border-t border-[var(--devengine-border)] flex flex-wrap justify-between items-center gap-2 font-jetbrains text-xs">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                                PRICE
                              </span>
                              <PriceDisplay prices={getProjectPrices(project)} size="md" />
                            </div>
                            <span className="text-xs font-mono text-[#0284c7] dark:text-[#2cecf7] font-semibold transition group-hover:translate-x-1 duration-300">
                              Inspect →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {/* -------------------------------------------------------------
                    VIEW MODE 3: SHOWCASE VIEW (Detailed Full-Width Spec Sheet)
                ------------------------------------------------------------- */}
                {viewMode === "showcase" && (
                  <div className="space-y-6">
                    {filteredProjects.map((project) => {
                      const displayImage =
                        project.imageUrl ||
                        project.image ||
                        (Array.isArray(project.images) && project.images[0]) ||
                        "";
                      const meta = getCategoryMeta(project.category);

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.slug}`}
                          className="bg-[var(--devengine-surface)] backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-[var(--devengine-border)] hover:border-[#2cecf7] transition-all duration-300 group flex flex-col md:flex-row gap-6 items-stretch shadow-sm hover:shadow-xl hover:shadow-[#2cecf7]/5"
                        >
                          {/* Left Column: Adaptive Showcase Image Frame */}
                          <div className="w-full md:w-[45%] flex-shrink-0">
                            <ProjectImageFrame
                              src={displayImage}
                              alt={project.title}
                              category={project.category}
                              title={project.title}
                              tags={project.tags}
                              maxHeightClass="max-h-[220px] sm:max-h-[280px]"
                            />
                          </div>

                          {/* Right Column: Architectural Specifications */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                                <div className="flex items-center gap-2">
                                  <span
                                    className="px-2.5 py-0.5 rounded font-jetbrains text-[10px] uppercase font-bold border border-[var(--devengine-border)]"
                                    style={{ backgroundColor: `${meta.badgeColor}15`, color: meta.badgeColor }}
                                  >
                                    {project.category}
                                  </span>
                                  <span className="text-[10px] font-mono text-[var(--devengine-muted)]">
                                    SYS_{project.id.slice(0, 6).toUpperCase()}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1.5 text-emerald-500 text-[10px] font-mono font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  VERIFIED ARCHITECTURE
                                </span>
                              </div>

                              <h3 className="font-[family-name:var(--font-site,'Poppins',sans-serif)] text-2xl sm:text-3xl font-bold text-[var(--devengine-text)] group-hover:text-[#0284c7] dark:group-hover:text-[#2cecf7] transition-colors mb-2">
                                {project.title}
                              </h3>

                              <p className="text-xs sm:text-sm text-[var(--devengine-muted)] leading-relaxed mb-4">
                                {project.subtitle || project.details}
                              </p>

                              {/* Technical Highlights / Tags */}
                              {project.tags && project.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {project.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="bg-[var(--devengine-raised)] px-2.5 py-1 rounded-lg text-[10px] font-mono text-[var(--devengine-text)] border border-[var(--devengine-border)]"
                                    >
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-4 border-t border-[var(--devengine-border)] flex flex-wrap justify-between items-center gap-4">
                              <div>
                                <span className="text-[10px] font-mono font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1">
                                  LICENSING RATE
                                </span>
                                <PriceDisplay prices={getProjectPrices(project)} size="md" />
                              </div>

                              <span className="bg-[#2cecf7] text-[#02040a] px-5 py-2 rounded-full font-bold shadow-sm text-xs hover:bg-[#53f2fb] transition flex items-center gap-1.5">
                                <span>Inspect Architecture</span>
                                <span>↗</span>
                              </span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Landing Footer */}
      <LandingFooter />
    </>
  );
}
