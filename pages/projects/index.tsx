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
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";
import { ArchiveConfig } from "@/types/archive";
import {
  getArchiveConfig,
  DEFAULT_ARCHIVE_CONFIG,
} from "@/lib/services/archiveService";

import PriceDisplay from "@/components/projects/PriceDisplay";
import { getProjectPrices } from "@/lib/services/currencyService";
import { CurrencyPricing } from "@/types/currency";
import styles from "@/components/projects/Archive.module.css";

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
  const [config, setConfig] = useState<ArchiveConfig>(() => {
    return getCachedData<ArchiveConfig>("archive_config", DEFAULT_ARCHIVE_CONFIG);
  });
  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    return getCachedData<ProjectItem[]>("archive_projects", []);
  });
  const [loading, setLoading] = useState(() => {
    const cachedConfig = getCachedData<ArchiveConfig | null>("archive_config", null);
    const cachedProjects = getCachedData<ProjectItem[] | null>("archive_projects", null);
    return !cachedConfig || !cachedProjects || cachedProjects.length === 0;
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      categoryScrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

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
        // Load Archive CMS Config
        const archiveData = await getArchiveConfig();
        if (isMounted && archiveData) {
          setConfig(archiveData);
          setCachedData("archive_config", archiveData);
        }

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

        if (isMounted) {
          setProjects(list);
          setCachedData("archive_projects", list);
        }
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

  // Smooth scroll reveal observer across all sections
  useEffect(() => {
    if (loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.sectionActive);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    const sections = document.querySelectorAll(`.${styles.scrollSection}`);
    sections.forEach((sec) => observer.observe(sec));

    return () => observer.disconnect();
  }, [loading, projects.length]);

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

  // 6. Featured Case Study Project lookup (Supports Database Project & Manual Custom Entry)
  const isManualCaseStudy = Boolean(config.featuredCaseStudy?.isManual);

  const featuredProject = useMemo(() => {
    if (isManualCaseStudy || !config.featuredCaseStudy?.projectId) return null;
    return projects.find(
      (p) =>
        p.slug === config.featuredCaseStudy.projectId ||
        p.id === config.featuredCaseStudy.projectId
    );
  }, [projects, config.featuredCaseStudy?.projectId, isManualCaseStudy]);

  const caseStudyTitle = isManualCaseStudy
    ? config.featuredCaseStudy.title
    : (featuredProject?.title || config.featuredCaseStudy.title);

  const caseStudySubtitle = isManualCaseStudy
    ? config.featuredCaseStudy.titleHighlight
    : (featuredProject?.subtitle || config.featuredCaseStudy.titleHighlight);

  const caseStudyDescription = isManualCaseStudy
    ? config.featuredCaseStudy.description
    : (featuredProject?.details || config.featuredCaseStudy.description);

  const caseStudyTechStack = isManualCaseStudy
    ? config.featuredCaseStudy.techStack
    : (featuredProject?.tags?.join(", ") || config.featuredCaseStudy.techStack);

  const caseStudyImage = isManualCaseStudy
    ? (config.featuredCaseStudy.phoneImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop")
    : (config.featuredCaseStudy.phoneImage || featuredProject?.imageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop");

  const caseStudyUrl = isManualCaseStudy
    ? (config.featuredCaseStudy.customProjectUrl?.trim() || "/projects/case-study")
    : "/projects/case-study";

  // 7. 5 Most Recent Projects for The Archive Bento Grid (Max 5)
  const recent5Projects = useMemo(() => {
    return filteredProjects.slice(0, 5);
  }, [filteredProjects]);

  const headElement = (
    <Head>
      <title>DevEngine Archive — Software Engineering Case Studies & Systems</title>
      <meta
        name="description"
        content={config.hero.subtitle || "A catalog of software systems, web platforms, and mobile applications engineered by DevEngine. Review our technical architectures and production builds."}
      />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href="https://www.devenginehq.com/projects" />

      {/* OpenGraph */}
      <meta property="og:site_name" content="DevEngine" />
      <meta property="og:title" content="DevEngine Archive — Software Engineering Case Studies & Systems" />
      <meta
        property="og:description"
        content={config.hero.subtitle || "A catalog of software systems, web platforms, and mobile applications engineered by DevEngine. Review our technical architectures and production builds."}
      />
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.devenginehq.com/projects" />
      <meta property="og:image" content="https://www.devenginehq.com/dev_url_logo.png" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="DevEngine Archive — Software Engineering Case Studies & Systems" />
      <meta
        name="twitter:description"
        content={config.hero.subtitle || "A catalog of software systems, web platforms, and mobile applications engineered by DevEngine. Review our technical architectures and production builds."}
      />
      <meta name="twitter:image" content="https://www.devenginehq.com/dev_url_logo.png" />
    </Head>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--devengine-page)] z-50 flex items-center justify-center">
        {headElement}
        <HelixLoader size={80} text="LOADING ARCHIVE..." />
      </div>
    );
  }

  return (
    <>
      {headElement}

      {/* Shared Cinematic Landing Navbar */}
      <LandingNavbar />

      <main className={styles.archiveRoot}>
        {/* Ambient Subtle Cyber Blueprint & Atmospheric Lighting */}
        <div className={styles.ambientCanvas} aria-hidden="true">
          <span className={styles.ambientBlobA} />
          <span className={styles.ambientBlobB} />
          <span className={styles.ambientGrid} />
        </div>

        {/* =========================================================================
            SECTION 1: MASSIVE HERO
        ========================================================================= */}
        <section className={`${styles.heroSection} ${styles.scrollSection} ${styles.sectionActive}`}>
          <div className={styles.heroContent}>
            {/* Pinnacle Badge */}
            <div className={styles.pinnacleBadge}>
              <span className={styles.liveDot} aria-hidden="true" />
              <p className={styles.pinnacleText}>
                {config.hero.badgeText}
              </p>
            </div>

            {/* Massive Hero Headline with Dual-Mode Highlight */}
            <h1 className={styles.heroHeading}>
              {config.hero.title}
              <br />
              <span className={styles.heroHighlight}>
                {config.hero.titleHighlight}
              </span>
            </h1>

            <p className={styles.heroSubtitle}>
              {config.hero.subtitle}
            </p>

            {/* CTAs */}
            <div className={styles.heroActions}>
              <a
                href="#archive-feed"
                className={styles.primaryCta}
              >
                {config.hero.ctaPrimaryText}
              </a>
              <a
                href="#lab-section"
                className={styles.secondaryCta}
              >
                {config.hero.ctaSecondaryText} <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 2: FILTER COMMAND CENTER (Sticky with safe navbar clearance)
        ========================================================================= */}
        <section
          id="filter-center"
          className={styles.filterSection}
        >
          <div className={styles.filterCard}>
            {/* Search Input with Keyboard Shortcut & Clear Button */}
            <div className={styles.searchWrap}>
              <svg
                className={styles.searchIcon}
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
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
                className={styles.searchInput}
                aria-label="Search archive projects"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className={styles.clearSearchBtn}
                  title="Clear search"
                  aria-label="Clear search query"
                >
                  ✕
                </button>
              ) : (
                <div className={styles.kbdBadge} aria-hidden="true">
                  <kbd className={styles.kbdKey}>⌘</kbd>
                  <kbd className={styles.kbdKey}>K</kbd>
                </div>
              )}
            </div>

            {/* Dynamic Category Pills with Side Scroll Controls */}
            <div className={styles.categoryPillsWrapper}>
              <button
                type="button"
                onClick={() => scrollCategories("left")}
                className={styles.scrollNavBtn}
                title="Scroll categories left"
                aria-label="Scroll categories left"
              >
                ‹
              </button>

              <div
                ref={categoryScrollRef}
                className={styles.categoryPills}
                role="tablist"
                aria-label="Project categories"
                onWheel={(e) => {
                  if (e.deltaY !== 0 && categoryScrollRef.current) {
                    categoryScrollRef.current.scrollLeft += e.deltaY;
                  }
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`${styles.catBtn} ${
                    selectedCategory === "all" ? styles.catBtnActive : ""
                  }`}
                  role="tab"
                  aria-selected={selectedCategory === "all"}
                >
                  ALL
                </button>

                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`${styles.catBtn} ${
                      selectedCategory.toLowerCase() === cat.toLowerCase()
                        ? styles.catBtnActive
                        : ""
                    }`}
                    role="tab"
                    aria-selected={selectedCategory.toLowerCase() === cat.toLowerCase()}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => scrollCategories("right")}
                className={styles.scrollNavBtn}
                title="Scroll categories right"
                aria-label="Scroll categories right"
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 3: FEATURED CASE STUDY (3D Mobile Frame Mockup)
        ========================================================================= */}
        <section className={`${styles.sectionBlock} ${styles.scrollSection}`}>
          <div className={styles.caseStudyCard}>
            {/* Left Column: Case Study Specs */}
            <div>
              <span className={styles.caseStudyBadge}>
                {config.featuredCaseStudy.badgeText}
              </span>

              <h2 className={styles.caseStudyTitle}>
                {caseStudyTitle}
                <span className={styles.caseStudySubtitle}>
                  {caseStudySubtitle}
                </span>
              </h2>

              <p className={styles.caseStudyDesc}>
                {caseStudyDescription}
              </p>

              <div className={styles.caseStudyMetaGrid}>
                <div>
                  <p className={styles.metaLabel}>Tech Stack</p>
                  <p className={styles.metaVal}>{caseStudyTechStack}</p>
                </div>
                <div>
                  <p className={styles.metaLabel}>License</p>
                  <p className={styles.metaVal}>{config.featuredCaseStudy.license}</p>
                </div>
              </div>

              {caseStudyUrl.startsWith("http") ? (
                <a
                  href={caseStudyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.caseStudyBtn}
                >
                  {config.featuredCaseStudy.buttonText} <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <Link
                  href={caseStudyUrl}
                  className={styles.caseStudyBtn}
                >
                  {config.featuredCaseStudy.buttonText} <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>

            {/* Right Column: Simulated 3D Mobile Phone Frame */}
            <div className={styles.phoneMockupWrap}>
              {caseStudyUrl.startsWith("http") ? (
                <a
                  href={caseStudyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.phoneFrame}
                  aria-label="View Featured Case Study Details"
                >
                  <div className={styles.dynamicIsland} aria-hidden="true" />
                  <div className="w-full h-full relative">
                    <Image
                      src={caseStudyImage}
                      alt={caseStudyTitle}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                </a>
              ) : (
                <Link
                  href={caseStudyUrl}
                  className={styles.phoneFrame}
                  aria-label="View Featured Case Study Details"
                >
                  <div className={styles.dynamicIsland} aria-hidden="true" />
                  <div className="w-full h-full relative">
                    <Image
                      src={caseStudyImage}
                      alt={caseStudyTitle}
                      fill
                      className="object-cover object-top"
                      unoptimized
                    />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 4: LIVE OFFERS (Banner Carousel with Auto-Swipe)
        ========================================================================= */}
        {visibleOfferSlides && visibleOfferSlides.length > 0 && (
          <section className={`${styles.sectionBlock} ${styles.scrollSection}`}>
            <div className="relative group">
              {/* Header Bar: LIVE OFFERS badge & Slide Progress indicators */}
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                  <span className="font-jetbrains text-xs text-red-500 dark:text-red-400 tracking-widest uppercase font-bold">
                    {config.liveOffers.badgeText}
                  </span>
                  <span className="text-[11px] font-mono opacity-70 ml-2">
                    ({visibleOfferSlides.length} Featured Deals)
                  </span>
                </div>

                {/* Progress Indicators */}
                <div className="flex gap-2 items-center">
                  {visibleOfferSlides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveOfferIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeOfferIndex
                          ? "w-8 bg-[var(--devengine-accent)] shadow-[0_0_8px_var(--devengine-accent)]"
                          : "w-3 bg-[var(--devengine-border)] hover:opacity-80"
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
                  <div className={styles.liveOfferCard}>
                    <div className={styles.offerFlex}>
                      {/* Left: Offer Details */}
                      <div className="flex-1 space-y-4">
                        <span className={styles.offerTag}>
                          {slide.tag}
                        </span>

                        <Link
                          href={`/projects/${targetSlug}`}
                          className="block cursor-pointer"
                        >
                          <h3 className={styles.offerTitle}>
                            {slide.title}
                            <span className={styles.offerDiscount}>
                              {slide.discountBadge}
                            </span>
                          </h3>
                        </Link>

                        <p className="text-sm sm:text-base opacity-80 max-w-md">
                          {slide.description}
                        </p>

                        <div className={styles.offerPriceRow}>
                          <span className={styles.offerOldPrice}>
                            {slide.originalPrice}
                          </span>
                          <span className={styles.offerNewPrice}>
                            {slide.offerPrice}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 pt-2">
                          <Link
                            href={`/projects/${targetSlug}`}
                            id="claim-offer-btn"
                            className={styles.primaryCta}
                          >
                            <span>{slide.claimButtonText || "CLAIM OFFER"}</span>
                            <span aria-hidden="true">→</span>
                          </Link>
                          <Link
                            href={`/projects/${targetSlug}`}
                            className="font-jetbrains text-xs opacity-75 hover:opacity-100 hover:text-[var(--devengine-accent-text)] transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer py-2"
                          >
                            <span>Inspect Specs</span>
                            <span aria-hidden="true">↗</span>
                          </Link>
                        </div>
                      </div>

                      {/* Right: Offer Banner Image Mockup */}
                      <div className="flex-1 w-full flex justify-center md:justify-end">
                        <Link
                          href={`/projects/${targetSlug}`}
                          className={styles.offerBannerImgWrap}
                        >
                          <Image
                            src={
                              slide.frameImage ||
                              "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop"
                            }
                            alt={slide.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
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
            SECTION 5: THE ARCHIVE (Recent 5 Projects Bento Grid + View All)
        ========================================================================= */}
        <section id="archive-feed" className={`${styles.sectionBlock} ${styles.scrollSection}`}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                The Archive
              </h2>
              <p className={styles.sectionSubtitle}>
                A meticulously categorized collection of production-ready systems.
              </p>
              {searchQuery && (
                <p className="text-xs text-[var(--devengine-accent-text)] font-mono mt-2">
                  Showing {filteredProjects.length} results matching &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto font-jetbrains text-xs">
              <button
                type="button"
                onClick={() => setShowAllCatalog(!showAllCatalog)}
                className="opacity-75 hover:opacity-100 uppercase tracking-wider transition-opacity cursor-pointer"
              >
                {showAllCatalog ? "COLLAPSE VIEW" : "QUICK VIEW"}
              </button>
              <span className="opacity-40">|</span>
              <Link
                href="/projects/all"
                className="text-[var(--devengine-accent-text)] hover:underline uppercase tracking-wider font-bold flex items-center gap-1.5"
              >
                VIEW ALL PROJECTS <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <HelixLoader size={48} color="#2cecf7" />
              <p className="mt-4 font-jetbrains text-xs opacity-70">
                Synchronizing project repository…
              </p>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="p-12 text-center bg-[var(--devengine-surface)] rounded-2xl border border-[var(--devengine-border)] shadow-sm">
              <p className="text-lg font-bold mb-2">
                No matching projects found
              </p>
              <p className="text-sm opacity-70 mb-4">
                Try adjusting your search query or selecting a different category.
              </p>
              {(searchQuery || selectedCategory !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                  }}
                  className="px-5 py-2.5 bg-[var(--devengine-soft)] border border-[var(--devengine-border)] rounded-full text-xs font-mono text-[var(--devengine-accent-text)] font-bold cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Unique Multi-Archetype Editorial Bento Grid */}
              <div className={styles.archiveBentoGrid}>
                {/* ARCHETYPE 1: Flagship 2-Column Showcase (Row 1, Left) */}
                {recent5Projects[0] && (
                  <Link
                    href={`/projects/${recent5Projects[0].slug || recent5Projects[0].id}`}
                    className={`${styles.bentoCard} ${styles.bentoFlagshipCol}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={styles.cardCatPill}>
                          {recent5Projects[0].category}
                        </span>
                        <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                          ↗
                        </span>
                      </div>

                      <h3 className={styles.cardTitle}>
                        {recent5Projects[0].title}
                      </h3>
                      <p className={styles.cardDesc}>
                        {recent5Projects[0].subtitle || recent5Projects[0].details}
                      </p>

                      <div className={styles.cardThumbFrame}>
                        <Image
                          src={
                            (recent5Projects[0] as any).images?.[0] ||
                            recent5Projects[0].imageUrl ||
                            (recent5Projects[0] as any).image ||
                            config.defaultProjectImages?.[0] ||
                            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt=""
                          fill
                          className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                          aria-hidden="true"
                          unoptimized
                        />
                        <Image
                          src={
                            (recent5Projects[0] as any).images?.[0] ||
                            recent5Projects[0].imageUrl ||
                            (recent5Projects[0] as any).image ||
                            config.defaultProjectImages?.[0] ||
                            "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent5Projects[0].title}
                          fill
                          className={styles.cardThumbImg}
                          unoptimized
                        />
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div>
                        <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                          Licensing Rates
                        </span>
                        <PriceDisplay
                          prices={getProjectPrices(recent5Projects[0])}
                          size="lg"
                        />
                      </div>
                      <span className="font-jetbrains text-xs sm:text-sm text-[var(--devengine-accent-text)] font-bold hover:underline flex items-center gap-1">
                        View Architecture →
                      </span>
                    </div>
                  </Link>
                )}

                {/* ARCHETYPE 2: Sleek Vertical Telemetry Card (Row 1, Right) */}
                {recent5Projects[1] && (
                  <Link
                    href={`/projects/${recent5Projects[1].slug || recent5Projects[1].id}`}
                    className={`${styles.bentoCard} ${styles.bentoVerticalCol}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={styles.cardCatPill}>
                          {recent5Projects[1].category}
                        </span>
                        <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                          ↗
                        </span>
                      </div>
                      <h3 className={styles.cardTitle}>
                        {recent5Projects[1].title}
                      </h3>
                      <p className={styles.cardDesc}>
                        {recent5Projects[1].subtitle || recent5Projects[1].details}
                      </p>

                      <div className={styles.cardThumbFrame}>
                        <Image
                          src={
                            (recent5Projects[1] as any).images?.[0] ||
                            recent5Projects[1].imageUrl ||
                            (recent5Projects[1] as any).image ||
                            config.defaultProjectImages?.[1] ||
                            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt=""
                          fill
                          className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                          aria-hidden="true"
                          unoptimized
                        />
                        <Image
                          src={
                            (recent5Projects[1] as any).images?.[0] ||
                            recent5Projects[1].imageUrl ||
                            (recent5Projects[1] as any).image ||
                            config.defaultProjectImages?.[1] ||
                            "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent5Projects[1].title}
                          fill
                          className={styles.cardThumbImg}
                          unoptimized
                        />
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div>
                        <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                          Price
                        </span>
                        <PriceDisplay
                          prices={getProjectPrices(recent5Projects[1])}
                          size="md"
                        />
                      </div>
                      <span className="font-jetbrains text-xs text-[var(--devengine-accent-text)] font-bold hover:underline flex items-center gap-1">
                        Explore →
                      </span>
                    </div>
                  </Link>
                )}

                {/* ARCHETYPE 3: Horizontal Split Panorama (Row 2, Left 2-Cols) */}
                {recent5Projects[2] && (
                  <Link
                    href={`/projects/${recent5Projects[2].slug || recent5Projects[2].id}`}
                    className={`${styles.bentoCard} ${styles.bentoHorizontalCard}`}
                  >
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className={styles.cardCatPill}>
                            {recent5Projects[2].category}
                          </span>
                          <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                            ↗
                          </span>
                        </div>
                        <h3 className={styles.cardTitle}>
                          {recent5Projects[2].title}
                        </h3>
                        <p className={styles.cardDesc}>
                          {recent5Projects[2].subtitle || recent5Projects[2].details}
                        </p>
                      </div>

                      <div className={styles.cardFooter}>
                        <div>
                          <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                            Licensing Price
                          </span>
                          <PriceDisplay
                            prices={getProjectPrices(recent5Projects[2])}
                            size="md"
                          />
                        </div>
                        <span className="font-jetbrains text-xs text-[var(--devengine-accent-text)] font-bold hover:underline flex items-center gap-1">
                          Explore System →
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className={styles.cardThumbFrame}>
                        <Image
                          src={
                            (recent5Projects[2] as any).images?.[0] ||
                            recent5Projects[2].imageUrl ||
                            (recent5Projects[2] as any).image ||
                            config.defaultProjectImages?.[2] ||
                            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt=""
                          fill
                          className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                          aria-hidden="true"
                          unoptimized
                        />
                        <Image
                          src={
                            (recent5Projects[2] as any).images?.[0] ||
                            recent5Projects[2].imageUrl ||
                            (recent5Projects[2] as any).image ||
                            config.defaultProjectImages?.[2] ||
                            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent5Projects[2].title}
                          fill
                          className={styles.cardThumbImg}
                          unoptimized
                        />
                      </div>
                    </div>
                  </Link>
                )}

                {/* ARCHETYPE 4: Blueprint Cyber Telemetry Card (Row 2, Right 1-Col) */}
                {recent5Projects[3] && (
                  <Link
                    href={`/projects/${recent5Projects[3].slug || recent5Projects[3].id}`}
                    className={`${styles.bentoCard} ${styles.bentoTelemetryCol}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className={styles.cardCatPill}>
                          {recent5Projects[3].category}
                        </span>
                        <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                          ↗
                        </span>
                      </div>
                      <h3 className={styles.cardTitle}>
                        {recent5Projects[3].title}
                      </h3>
                      <p className={styles.cardDesc}>
                        {recent5Projects[3].subtitle || recent5Projects[3].details}
                      </p>

                      <div className={styles.cardThumbFrame}>
                        <Image
                          src={
                            (recent5Projects[3] as any).images?.[0] ||
                            recent5Projects[3].imageUrl ||
                            (recent5Projects[3] as any).image ||
                            config.defaultProjectImages?.[3] ||
                            "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt=""
                          fill
                          className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                          aria-hidden="true"
                          unoptimized
                        />
                        <Image
                          src={
                            (recent5Projects[3] as any).images?.[0] ||
                            recent5Projects[3].imageUrl ||
                            (recent5Projects[3] as any).image ||
                            config.defaultProjectImages?.[3] ||
                            "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent5Projects[3].title}
                          fill
                          className={styles.cardThumbImg}
                          unoptimized
                        />
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <div>
                        <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                          Price
                        </span>
                        <PriceDisplay
                          prices={getProjectPrices(recent5Projects[3])}
                          size="md"
                        />
                      </div>
                      <span className="font-jetbrains text-xs text-[var(--devengine-accent-text)] font-bold hover:underline flex items-center gap-1">
                        Inspect →
                      </span>
                    </div>
                  </Link>
                )}

                {/* ARCHETYPE 5: Panoramic Full 3-Column AI Banner Showcase (Row 3, Full Width) */}
                {recent5Projects[4] && (
                  <Link
                    href={`/projects/${recent5Projects[4].slug || recent5Projects[4].id}`}
                    className={`${styles.bentoCard} ${styles.bentoPanoramicCard}`}
                  >
                    <div className="flex flex-col justify-between h-full">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className={styles.cardCatPill}>
                              {recent5Projects[4].category}
                            </span>
                            <span className="font-jetbrains text-[10px] uppercase font-bold tracking-wider text-[var(--devengine-accent-text)] bg-[var(--devengine-soft)] px-2.5 py-0.5 rounded-full border border-[var(--devengine-border)]">
                              FLAGSHIP ARCHITECTURE
                            </span>
                          </div>
                          <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                            ↗
                          </span>
                        </div>
                        <h3 className={`${styles.cardTitle} text-2xl lg:text-3xl`}>
                          {recent5Projects[4].title}
                        </h3>
                        <p className={`${styles.cardDesc} text-base max-w-xl`}>
                          {recent5Projects[4].subtitle || recent5Projects[4].details}
                        </p>
                      </div>

                      <div className={styles.cardFooter}>
                        <div>
                          <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                            Licensing Price
                          </span>
                          <PriceDisplay
                            prices={getProjectPrices(recent5Projects[4])}
                            size="lg"
                          />
                        </div>
                        <span className="font-jetbrains text-xs sm:text-sm text-[var(--devengine-accent-text)] font-bold hover:underline flex items-center gap-1.5">
                          Inspect Architecture & Docs →
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className={styles.cardThumbFrame}>
                        <Image
                          src={
                            (recent5Projects[4] as any).images?.[0] ||
                            recent5Projects[4].imageUrl ||
                            (recent5Projects[4] as any).image ||
                            config.defaultProjectImages?.[4 % (config.defaultProjectImages?.length || 1)] ||
                            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt=""
                          fill
                          className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                          aria-hidden="true"
                          unoptimized
                        />
                        <Image
                          src={
                            (recent5Projects[4] as any).images?.[0] ||
                            recent5Projects[4].imageUrl ||
                            (recent5Projects[4] as any).image ||
                            config.defaultProjectImages?.[4 % (config.defaultProjectImages?.length || 1)] ||
                            "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                          }
                          alt={recent5Projects[4].title}
                          fill
                          className={styles.cardThumbImg}
                          unoptimized
                        />
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* View All Catalog Grid (When expanded) */}
              {showAllCatalog && filteredProjects.length > 5 && (
                <div className="mt-12 pt-12 border-t border-[var(--devengine-border)] space-y-6">
                  <h3 className="text-xl font-bold flex items-center justify-between">
                    <span>Full Catalog ({filteredProjects.length} Projects)</span>
                    <span className="text-xs font-mono opacity-70">
                      Filtered by: {selectedCategory.toUpperCase()}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.slice(5).map((project, idx) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.slug || project.id}`}
                        className={styles.bentoCard}
                      >
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className={styles.cardCatPill}>
                              {project.category}
                            </span>
                            <span className="opacity-60 text-sm font-jetbrains" aria-hidden="true">
                              ↗
                            </span>
                          </div>
                          <h4 className={styles.cardTitle}>
                            {project.title}
                          </h4>
                          <p className={styles.cardDesc}>
                            {project.subtitle}
                          </p>

                          <div className={styles.cardThumbFrame}>
                            <Image
                              src={
                                (project as any).images?.[0] ||
                                project.imageUrl ||
                                (project as any).image ||
                                config.defaultProjectImages?.[
                                  (idx + 5) % (config.defaultProjectImages?.length || 6)
                                ] ||
                                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                              }
                              alt=""
                              fill
                              className="object-cover blur-2xl opacity-20 scale-110 pointer-events-none"
                              aria-hidden="true"
                              unoptimized
                            />
                            <Image
                              src={
                                (project as any).images?.[0] ||
                                project.imageUrl ||
                                (project as any).image ||
                                config.defaultProjectImages?.[
                                  (idx + 5) % (config.defaultProjectImages?.length || 6)
                                ] ||
                                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop"
                              }
                              alt={project.title}
                              fill
                              className={styles.cardThumbImg}
                              unoptimized
                            />
                          </div>
                        </div>
                        <div className={styles.cardFooter}>
                          <div>
                            <span className="font-jetbrains text-[11px] font-bold text-[var(--devengine-muted)] uppercase tracking-wider block mb-1.5">
                              Price
                            </span>
                            <PriceDisplay
                              prices={getProjectPrices(project)}
                              size="md"
                            />
                          </div>
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
            SECTION 6: IN THE LAB (Classified Development & Live Countdown - Enlarged)
        ========================================================================= */}
        <section
          id="lab-section"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-block bg-[var(--devengine-soft)] px-4 py-1.5 rounded-full border border-[var(--devengine-border)] font-jetbrains text-[11px] text-[var(--devengine-accent-text)] tracking-widest uppercase mb-3 font-semibold shadow-xs">
                {config.lab.badgeText}
              </div>
              <h2 className={styles.sectionTitle}>
                {config.lab.title}
              </h2>
            </div>

            <div className={styles.labCard}>
              {/* Top Row: Project Progress (Left) + Countdown Clock (Right) */}
              <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                {/* Left: Project Progress */}
                <div className="flex-1 text-center lg:text-left space-y-7 w-full">
                  <div>
                    <h3 className={styles.labProjectName}>
                      {config.lab.projectName}
                    </h3>
                    <p className="font-jetbrains text-sm sm:text-base text-[var(--devengine-accent-text)] tracking-widest uppercase font-semibold flex items-center justify-center lg:justify-start gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--devengine-accent)] animate-pulse inline-block" />
                      {config.lab.techDomain}
                    </p>
                  </div>

                  {/* 5-Stage Stepper - Matched to Theme */}
                  <div className="max-w-xl mx-auto lg:mx-0">
                    <div className="flex justify-between font-jetbrains text-xs mb-2.5 font-bold tracking-wider">
                      <span className={styles.labStepActive}>IDEA</span>
                      <span className={styles.labStepActive}>DESIGN</span>
                      <span className={styles.labStepActive}>DEV</span>
                      <span className={styles.labStepInactive}>TEST</span>
                      <span className={styles.labStepInactive}>LAUNCH</span>
                    </div>

                    <div className={styles.labProgressTrack}>
                      <div
                        className={styles.labProgressBar}
                        style={{ width: `${config.lab.progressPercentage}%` }}
                      >
                        <div className={styles.labProgressBarGlow} />
                      </div>
                    </div>

                    <div className="text-right mt-2 font-jetbrains">
                      <span className={styles.labPercentText}>
                        {config.lab.progressPercentage}% COMPLETE
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Massive Real-Time Countdown Clock with SECONDS */}
                <div className="flex-1 flex justify-center w-full">
                  <div className={styles.clockBox}>
                    <div className={styles.clockUnit}>
                      <div className={styles.clockDigit}>
                        {String(timeLeft.days).padStart(2, "0")}
                      </div>
                      <div className={styles.clockLabel}>
                        DAYS
                      </div>
                    </div>
                    <div className={styles.clockDivider} aria-hidden="true">:</div>
                    <div className={styles.clockUnit}>
                      <div className={styles.clockDigit}>
                        {String(timeLeft.hours).padStart(2, "0")}
                      </div>
                      <div className={styles.clockLabel}>
                        HOURS
                      </div>
                    </div>
                    <div className={styles.clockDivider} aria-hidden="true">:</div>
                    <div className={styles.clockUnit}>
                      <div className={styles.clockDigit}>
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </div>
                      <div className={styles.clockLabel}>
                        MINS
                      </div>
                    </div>
                    <div className={styles.clockDivider} aria-hidden="true">:</div>
                    <div className={styles.clockUnit}>
                      <div className={`${styles.clockDigit} ${styles.clockSecs}`}>
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </div>
                      <div className={styles.clockLabel}>
                        SECS
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: EXPECTED DEPLOY, TECH DOMAIN, LAB STATUS (All in ONE LINE with Title and Description) */}
              <div className={styles.labMetaRow}>
                {/* Card 1: Expected Deploy */}
                <div className={styles.labMetaCard}>
                  <span className={styles.labMetaLabel}>
                    EXPECTED DEPLOY
                  </span>
                  <span className={styles.labMetaValue}>
                    {config.lab.expectedDeploy}
                  </span>
                </div>

                {/* Card 2: Tech Domain */}
                <div className={styles.labMetaCard}>
                  <span className={styles.labMetaLabel}>
                    TECH DOMAIN
                  </span>
                  <span className={styles.labMetaValue} title={config.lab.techDomain}>
                    {config.lab.techDomain}
                  </span>
                </div>

                {/* Card 3: Lab Status */}
                <div className={styles.labMetaCard}>
                  <span className={styles.labMetaLabel}>
                    LAB STATUS
                  </span>
                  <span className={`${styles.labMetaValue} text-emerald-500 dark:text-emerald-400 flex items-center gap-2`}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                    ACTIVE SPRINT
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SECTION 7: TECHNOLOGY WALL
        ========================================================================= */}
        <section className={`${styles.sectionBlock} ${styles.scrollSection}`}>
          <div className="max-w-4xl mx-auto text-center mb-10">
            <h2 className={styles.sectionTitle}>
              {config.techWall.title}
            </h2>
            <p className={styles.sectionSubtitle}>
              {config.techWall.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto font-jetbrains text-xs">
            {[
              { name: "Flutter", color: "#2cecf7" },
              { name: "React / Next.js", color: "#61DAFB" },
              { name: "PostgreSQL", color: "#336791" },
              { name: "Firebase", color: "#FFCA28" },
              { name: "Tailwind CSS", color: "#2cecf7" },
              { name: "Gemini API", color: "#9333ea" },
              { name: "Node.js", color: "#68A063" },
              { name: "TypeScript", color: "#3178C6" },
            ].map((tech) => (
              <div
                key={tech.name}
                className={styles.techChip}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tech.color }}
                  aria-hidden="true"
                />
                <span>{tech.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* =========================================================================
            SECTION 8: METRICS & STATISTICS
        ========================================================================= */}
        <section className={`${styles.sectionBlock} ${styles.scrollSection}`}>
          <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-[var(--devengine-border)] pt-12">
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {config.stats.stat1Value}
              </div>
              <div className={styles.metricLabel}>
                {config.stats.stat1Label}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {config.stats.stat2Value}
              </div>
              <div className={styles.metricLabel}>
                {config.stats.stat2Label}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {config.stats.stat3Value}
              </div>
              <div className={styles.metricLabel}>
                {config.stats.stat3Label}
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricValue}>
                {config.stats.stat4Value}
              </div>
              <div className={styles.metricLabel}>
                {config.stats.stat4Label}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Shared Dashboard Footer */}
      <LandingFooter />
    </>
  );
}
