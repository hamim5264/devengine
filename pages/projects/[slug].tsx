import React, { useEffect, useState, useRef, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import PriceDisplay, { cleanCurrencyValue } from "@/components/projects/PriceDisplay";
import { getProjectPrices } from "@/lib/services/currencyService";
import { getYouTubeEmbedUrl } from "@/lib/utils/youtube";
import {
  ProjectItem,
  DEFAULT_YOUTUBE_URL,
  DEFAULT_SNAPSHOT,
  DEFAULT_WHATS_INCLUDED,
  DEFAULT_NOT_INCLUDED,
  DEFAULT_FAQS,
} from "@/types/project";
import styles from "@/components/projects/ProjectDetail.module.css";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "snapshot", label: "Snapshot" },
  { id: "story", label: "Architecture" },
  { id: "demo", label: "Live Demo" },
  { id: "tech-stack", label: "Tech Stack" },
  { id: "installation", label: "Installation" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  // Interactive states
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [copiedManual, setCopiedManual] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showBuyAlert, setShowBuyAlert] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Detect admin status
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setIsAdmin(!!u && u.email === ADMIN_EMAIL);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Fetch project by slug / doc id
  useEffect(() => {
    if (!slug) return;

    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const slugStr = String(slug).trim();
        const ref = doc(db, "projects", slugStr);
        let snap = await getDoc(ref);

        // If direct doc lookup fails, query by slug field
        if (!snap.exists()) {
          const qSlug = query(
            collection(db, "projects"),
            where("slug", "==", slugStr)
          );
          const slugSnap = await getDocs(qSlug);
          if (!slugSnap.empty) {
            snap = slugSnap.docs[0];
          }
        }

        // If still not found, try case-insensitive / normalized lookup
        if (!snap.exists()) {
          const qLower = query(
            collection(db, "projects"),
            where("slug", "==", slugStr.toLowerCase())
          );
          const lowerSnap = await getDocs(qLower);
          if (!lowerSnap.empty) {
            snap = lowerSnap.docs[0];
          }
        }

        // Broad fallback scan across projects collection
        if (!snap.exists()) {
          const allSnap = await getDocs(collection(db, "projects"));
          const match = allSnap.docs.find((d) => {
            const dData = d.data() as any;
            const s = slugStr.toLowerCase();
            const dSlug = (dData.slug || "").toLowerCase();
            const dTitle = (dData.title || "").toLowerCase();
            return (
              d.id.toLowerCase() === s ||
              dSlug === s ||
              (dSlug && dSlug.replace(/[^a-z0-9]/g, "") === s.replace(/[^a-z0-9]/g, "")) ||
              (dTitle && dTitle.replace(/[^a-z0-9]+/g, "-").includes(s)) ||
              s.includes(d.id.toLowerCase())
            );
          });
          if (match) {
            snap = match;
          }
        }

        if (!snap.exists()) {
          setNotFound(true);
          setProject(null);
        } else {
          const data = snap.data() as any;
          // Only gate access if explicitly set to unpublished
          if (data.isPublic === false && !isAdmin) {
            setNotFound(true);
            setProject(null);
          } else {
            setProject({
              id: snap.id,
              slug: data.slug || snap.id,
              title: data.title || "Untitled System",
              subtitle: data.subtitle || "",
              category: (data.category || "General"),
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing) ? data.pricing : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              tools: Array.isArray(data.tools) ? data.tools : [],
              isPublic: data.isPublic !== false,
              images:
                Array.isArray(data.images) && data.images.length > 0
                  ? data.images
                  : (data.imageUrl || data.image ? [data.imageUrl || data.image] : []),
              imageUrl: data.imageUrl || data.image || "",
              image: data.imageUrl || data.image || "",
              details: data.details || "",
              installation: data.installation || "",
              youtubeUrl: data.youtubeUrl || DEFAULT_YOUTUBE_URL,
              version: data.version || "2.4.0",
              platform: data.platform || "Cross-Platform",
              status: data.status || "Active",
              releaseDate: data.releaseDate || "Q4 2024",
              buildStack: data.buildStack || "",
              availability: data.availability || "iOS, Android, Web",
              snapshot: data.snapshot || DEFAULT_SNAPSHOT,
              story: {
                idea:
                  data.story?.idea ||
                  data.details ||
                  "Engineered to bridge complex production requirements with fluid, modern interfaces.",
                problem:
                  data.story?.problem ||
                  "Building enterprise-ready architectures from scratch requires months of boilerplate engineering and performance tuning.",
                solution:
                  data.story?.solution ||
                  "A pre-architected, modular system with clean separation of concerns, secure data access, and instant cloud deployment.",
                value:
                  data.story?.value ||
                  "Eliminate hundreds of development hours, save substantial engineering costs, and launch within hours.",
              },
              whatsIncluded:
                Array.isArray(data.whatsIncluded) && data.whatsIncluded.length > 0
                  ? data.whatsIncluded
                  : DEFAULT_WHATS_INCLUDED,
              notIncluded:
                Array.isArray(data.notIncluded) && data.notIncluded.length > 0
                  ? data.notIncluded
                  : DEFAULT_NOT_INCLUDED,
              faqs:
                Array.isArray(data.faqs) && data.faqs.length > 0
                  ? data.faqs
                  : DEFAULT_FAQS,
            });
            setNotFound(false);
          }
        }
      } catch (err) {
        console.error("Failed to load project details:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, isAdmin]);

  // Scroll Spy & Sticky Bar Listener
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowStickyBar(scrollY > 600);

      // Scroll Spy for sections
      const offsets = SECTIONS.map((sec) => {
        const el = document.getElementById(sec.id);
        if (!el) return { id: sec.id, top: 0 };
        const rect = el.getBoundingClientRect();
        return { id: sec.id, top: rect.top + scrollY - 140 };
      });

      for (let i = offsets.length - 1; i >= 0; i--) {
        if (scrollY >= offsets[i].top - 100) {
          setActiveSection(offsets[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    if (id === "overview") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -160;
      const y =
        element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleCopyInstallation = () => {
    if (!project?.installation) return;
    navigator.clipboard.writeText(project.installation);
    setCopiedManual(true);
    setTimeout(() => setCopiedManual(false), 2500);
  };

  const handleBuyClick = () => {
    if (project?.slug || project?.id) {
      router.push(`/projects/${project.slug || project.id}/pricing`);
    } else {
      setShowBuyAlert(true);
      scrollToSection("pricing");
      setTimeout(() => setShowBuyAlert(false), 5000);
    }
  };

  const projectPrices = useMemo(() => {
    return project ? getProjectPrices(project) : [];
  }, [project]);

  const projectImages: string[] = useMemo(() => {
    if (!project) return [];
    const valid = Array.isArray(project.images)
      ? project.images.filter(
          (img) =>
            typeof img === "string" &&
            img.trim().length > 0 &&
            !img.includes("undefined")
        )
      : [];
    if (valid.length > 0) return valid;
    if (project.imageUrl && project.imageUrl.trim().length > 0) {
      return [project.imageUrl];
    }
    // High-fidelity fallback showcase views (for starter templates like CraftyBay)
    return [
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop",
    ];
  }, [project]);

  // Full-Screen Scroll Reveal Observer across all sections
  useEffect(() => {
    if (loading || notFound) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.sectionActive);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    const sections = document.querySelectorAll(`.${styles.scrollSection}`);
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [loading, notFound]);

  // Lightbox Keyboard Navigation (Esc, Left, Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev > 0 ? prev - 1 : projectImages.length - 1) : null
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) =>
          prev !== null ? (prev < projectImages.length - 1 ? prev + 1 : 0) : null
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxIndex, projectImages.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--devengine-page)] z-50 flex items-center justify-center">
        <HelixLoader size={80} text="LOADING ARCHITECTURE SPECIFICATION..." />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className={styles.projectDetailRoot}>
        <Head>
          <title>System Not Found // DevEngine Archive</title>
        </Head>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 px-6 flex flex-col items-center justify-center text-center">
          <div className="bg-[var(--devengine-surface)] p-8 sm:p-12 rounded-3xl border border-[var(--devengine-border)] max-w-lg shadow-2xl">
            <span className="material-symbols-outlined text-5xl text-[#2cecf7] mb-4">
              deployed_code_alert
            </span>
            <h1 className="font-bold text-2xl text-[var(--devengine-text)] mb-2">
              System Specification Not Found
            </h1>
            <p className="text-sm text-[var(--devengine-muted)] mb-6 leading-relaxed">
              The requested architecture specification does not exist or requires authenticated credentials to access.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/projects/all"
                className="bg-[#2cecf7] text-[#02040a] font-mono text-xs font-bold px-6 py-3 rounded-full hover:bg-[#53f2fb] transition shadow-[0_0_20px_rgba(44,236,247,0.35)]"
              >
                Browse All Systems
              </Link>
              <Link
                href="/home"
                className="bg-[var(--devengine-soft)] text-[var(--devengine-text)] font-mono text-xs px-6 py-3 rounded-full border border-[var(--devengine-border)] hover:bg-[var(--devengine-surface)] transition"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </main>
        <LandingFooter />
      </div>
    );
  }

  const viewTabLabels = [
    "📱 Overview Mockup",
    "⚡ App Interface",
    "🛠️ Architecture",
    "📊 Data Flow",
  ];

  return (
    <div className={styles.projectDetailRoot}>
      <Head>
        <title>{project.title} — System Specification | DevEngine</title>
        <meta
          name="description"
          content={project.subtitle || project.details?.slice(0, 160)}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Ambient Canvas */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <span className={styles.ambientBlobA} />
        <span className={styles.ambientBlobB} />
      </div>

      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY SUB-NAVIGATION BAR (Safe Clearance Below Landing Nav)
      ═══════════════════════════════════════════════════════════════════ */}
      <nav aria-label="Project Sections" className={styles.subNavBar}>
        <div className={styles.subNavInner}>
          <div className={styles.navLinksWrap}>
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`${styles.navBtn} ${
                    isActive ? styles.navBtnActive : ""
                  }`}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>

          <button onClick={handleBuyClick} className={styles.subNavCta}>
            Buy License
          </button>
        </div>
      </nav>

      <main className={styles.mainContent}>
        {/* ═════════════════════════════════════════════════════════════════
            1. CINEMATIC HERO SECTION (#overview)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="overview"
          className={`${styles.heroSection} ${styles.scrollSection} ${styles.sectionActive}`}
        >
          {/* Breadcrumb Pill */}
          <div className={styles.categoryPill}>
            <span className={styles.pillDot} />
            <span>
              System Specification // {(project.category || "General").toUpperCase()}
            </span>
          </div>

          {/* Hero Title */}
          <h1 className={styles.heroTitle}>{project.title}</h1>

          {/* Subtitle - Increased size & high contrast */}
          <p className={styles.heroSubtitle}>
            {project.subtitle || project.details}
          </p>

          {/* Expanded Metadata Chips */}
          <div className={styles.metaChipsRow}>
            <div className={styles.metaChip}>
              <span className={styles.chipKey}>Type:</span>
              <strong className={styles.chipVal}>
                {(project.category || "General").toUpperCase()}
              </strong>
            </div>

            <div className={styles.metaChip}>
              <span className={styles.chipKey}>Platform:</span>
              <strong className={styles.chipVal}>
                {project.platform || project.snapshot?.platform || "Cross-Platform"}
              </strong>
            </div>

            <div className={styles.metaChip}>
              <span className={styles.chipKey}>Version:</span>
              <strong className={styles.chipVal}>
                {project.version || project.snapshot?.version || "v2.4.0"}
              </strong>
            </div>

            <div className={styles.metaChip}>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className={styles.chipKey}>Status:</span>
              <strong className="text-emerald-500 font-bold text-sm">
                {project.status || project.snapshot?.status || "Production Ready"}
              </strong>
            </div>

            <div className={styles.metaChip}>
              <span className={styles.chipKey}>Release:</span>
              <strong className={styles.chipVal}>
                {project.releaseDate || project.snapshot?.releaseDate || "Q3 2026"}
              </strong>
            </div>
          </div>

          {/* Hero Action Buttons */}
          <div className={styles.heroActions}>
            <button
              onClick={() => {
                if (project.youtubeUrl) {
                  setShowVideoModal(true);
                } else {
                  scrollToSection("demo");
                }
              }}
              className={styles.btnPrimaryDemo}
            >
              <span className="material-symbols-outlined text-2xl">
                play_circle
              </span>
              <span>Watch Live Demo</span>
            </button>

            <button onClick={handleBuyClick} className={styles.btnSecondaryBuy}>
              <span className="material-symbols-outlined text-2xl">
                shopping_cart
              </span>
              <span>Buy System License</span>
            </button>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              STYLISH VIEW SECTION (Interactive Device Showcase Bezel)
          ───────────────────────────────────────────────────────────── */}
          <div className={styles.viewSection}>
            {/* View Switching Tabs */}
            {projectImages.length > 1 && (
              <div className={styles.viewTabsRow}>
                {projectImages.slice(0, 4).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveViewIndex(idx)}
                    className={`${styles.viewTabBtn} ${
                      activeViewIndex === idx ? styles.viewTabBtnActive : ""
                    }`}
                  >
                    {viewTabLabels[idx] || `View #${idx + 1}`}
                  </button>
                ))}
              </div>
            )}

            {/* Main Showcase Device Mockup */}
            <div
              onClick={() => setLightboxIndex(activeViewIndex)}
              className={styles.deviceShowcaseFrame}
              title="Click to view full screen"
            >
              <div className={styles.deviceTopBar}>
                <div className={styles.deviceDots}>
                  <span className={styles.dotRed} />
                  <span className={styles.dotYellow} />
                  <span className={styles.dotGreen} />
                </div>
                <div className={styles.deviceUrlPill}>
                  <span className="material-symbols-outlined text-xs">
                    lock
                  </span>
                  <span>
                    SYS://{project.slug || "devengine"}.app/production
                  </span>
                </div>
                <div className="font-jetbrains text-[10px] text-[#2cecf7] font-bold">
                  {viewTabLabels[activeViewIndex] || `VIEW #${activeViewIndex + 1}`}
                </div>
              </div>

              <div className={styles.deviceDisplayScreen}>
                <Image
                  src={projectImages[activeViewIndex] || projectImages[0]}
                  alt={`${project.title} - View ${activeViewIndex + 1}`}
                  fill
                  className={styles.displayImg}
                  priority
                  unoptimized
                />
                <div className={styles.deviceGlassSheen} aria-hidden="true" />

                <div className={styles.expandBadgeOverlay}>
                  <span className="material-symbols-outlined text-sm">
                    zoom_in
                  </span>
                  <span>Click to expand full screen</span>
                </div>
              </div>
            </div>

            {/* Secondary Thumbnail Strip */}
            {projectImages.length > 1 && (
              <div className={styles.thumbStrip}>
                {projectImages.map((thumb, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActiveViewIndex(idx)}
                    className={`${styles.thumbItem} ${
                      activeViewIndex === idx ? styles.thumbItemActive : ""
                    }`}
                  >
                    <Image
                      src={thumb}
                      alt={`Thumbnail ${idx + 1}`}
                      fill
                      className={styles.thumbImg}
                      unoptimized
                    />
                    <div className={styles.thumbLabel}>
                      {viewTabLabels[idx] || `View #${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            2. PROJECT SNAPSHOT DASHBOARD (#snapshot)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="snapshot"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                02 — Core Specifications
              </span>
            </div>
            <h2 className={styles.sectionHeading}>Project Snapshot</h2>
            <p className={styles.sectionSubheading}>
              Essential engineering parameters and deployment specifications.
            </p>
          </div>

          <div className={styles.snapshotGrid}>
            <div className={styles.snapshotCard}>
              <div className={styles.snapshotHeader}>
                <span className={styles.snapshotLabel}>Source Code</span>
                <div className={styles.snapshotIconWrap} aria-hidden="true">
                  <span className="material-symbols-outlined">code</span>
                </div>
              </div>
              <div className={styles.snapshotValue}>
                {project.snapshot?.sourceCode || "100% Included"}
              </div>
              <p className={styles.snapshotHint}>
                Complete production repository
              </p>
            </div>

            <div className={styles.snapshotCard}>
              <div className={styles.snapshotHeader}>
                <span className={styles.snapshotLabel}>Support</span>
                <div className={styles.snapshotIconWrap} aria-hidden="true">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
              </div>
              <div className={`${styles.snapshotValue} text-[#2cecf7]`}>
                {project.snapshot?.support || "6 Months"}
              </div>
              <p className={styles.snapshotHint}>
                Direct developer onboarding
              </p>
            </div>

            <div className={styles.snapshotCard}>
              <div className={styles.snapshotHeader}>
                <span className={styles.snapshotLabel}>Updates</span>
                <div className={styles.snapshotIconWrap} aria-hidden="true">
                  <span className="material-symbols-outlined">published_with_changes</span>
                </div>
              </div>
              <div className={`${styles.snapshotValue} text-emerald-500`}>
                {project.snapshot?.updates || "Lifetime Free"}
              </div>
              <p className={styles.snapshotHint}>
                Continuous patch releases
              </p>
            </div>

            <div className={styles.snapshotCard}>
              <div className={styles.snapshotHeader}>
                <span className={styles.snapshotLabel}>Documentation</span>
                <div className={styles.snapshotIconWrap} aria-hidden="true">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
              </div>
              <div className={styles.snapshotValue}>
                {project.snapshot?.documentation || "Comprehensive"}
              </div>
              <p className={styles.snapshotHint}>
                Architecture & deployment guide
              </p>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            3. UNDERSTANDING THE ARCHITECTURE (#story)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="story"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                03 — Engineering Rationale
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Understanding The Architecture
            </h2>
            <p className={styles.sectionSubheading}>
              In-depth breakdown of product goals, problems solved, and technical value.
            </p>
          </div>

          <div className={styles.storyGrid}>
            <div className={styles.storyCard}>
              <div className={styles.storyHeader}>
                <span className={styles.storyIndexBadge}>01</span>
                <h3 className={styles.storyTitle}>The Idea</h3>
              </div>
              <p className={styles.storyBody}>
                {project.story?.idea || project.details}
              </p>
            </div>

            <div className={styles.storyCard}>
              <div className={styles.storyHeader}>
                <span className={styles.storyIndexBadge}>02</span>
                <h3 className={styles.storyTitle}>The Problem</h3>
              </div>
              <p className={styles.storyBody}>
                {project.story?.problem}
              </p>
            </div>

            <div className={styles.storyCard}>
              <div className={styles.storyHeader}>
                <span className={styles.storyIndexBadge}>03</span>
                <h3 className={styles.storyTitle}>The Solution</h3>
              </div>
              <p className={styles.storyBody}>
                {project.story?.solution}
              </p>
            </div>

            <div className={styles.storyCard}>
              <div className={styles.storyHeader}>
                <span className={styles.storyIndexBadge}>04</span>
                <h3 className={styles.storyTitle}>The Engineering Value</h3>
              </div>
              <p className={styles.storyBody}>
                {project.story?.value}
              </p>
            </div>
          </div>

          {/* 3-Card Ecosystem Strip */}
          <div className={styles.ecosystemStrip}>
            <div className={styles.ecosystemCard}>
              <div className={styles.ecosystemIcon}>
                <span className="material-symbols-outlined">update</span>
              </div>
              <div>
                <div className={styles.ecosystemKey}>Current Build</div>
                <div className={styles.ecosystemVal}>{project.version}</div>
              </div>
            </div>

            <div className={styles.ecosystemCard}>
              <div className={styles.ecosystemIcon}>
                <span className="material-symbols-outlined">architecture</span>
              </div>
              <div>
                <div className={styles.ecosystemKey}>Core Stack</div>
                <div className={styles.ecosystemVal}>
                  {project.tools && project.tools.length > 0
                    ? project.tools.slice(0, 2).join(" & ")
                    : project.category}
                </div>
              </div>
            </div>

            <div className={styles.ecosystemCard}>
              <div className={styles.ecosystemIcon}>
                <span className="material-symbols-outlined">devices</span>
              </div>
              <div>
                <div className={styles.ecosystemKey}>Target Ecosystem</div>
                <div className={styles.ecosystemVal}>{project.platform}</div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            4. LIVE SYSTEM DEMONSTRATION (#demo)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="demo"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className={styles.sectionTagRow}>
                <span className={styles.sectionTagLine} aria-hidden="true" />
                <span className={styles.sectionTagText}>
                  04 — Cinematic Runtime
                </span>
              </div>
              <h2 className={styles.sectionHeading}>
                Live System Demonstration
              </h2>
              <p className={styles.sectionSubheading}>
                Inspect the system running live with simulated real-world telemetry and workflows.
              </p>
            </div>

            {project.youtubeUrl && (
              <a
                href={project.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 px-5 py-2.5 rounded-full border border-red-500/30 text-xs font-mono font-bold transition self-start md:self-auto"
              >
                <span className="material-symbols-outlined text-base">
                  open_in_new
                </span>
                <span>Open on YouTube ↗</span>
              </a>
            )}
          </div>

          <div className={styles.videoWrapper}>
            <iframe
              src={getYouTubeEmbedUrl(project.youtubeUrl)}
              title={`${project.title} Demonstration`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            5. TECH STACK & ARCHITECTURE (#tech-stack)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="tech-stack"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                05 — Components &amp; Dependencies
              </span>
            </div>
            <h2 className={styles.sectionHeading}>Engineered Tech Stack</h2>
            <p className={styles.sectionSubheading}>
              Production dependencies, frameworks, and architectural building blocks.
            </p>
          </div>

          <div className={styles.techGrid}>
            {(project.tools && project.tools.length > 0
              ? project.tools
              : [
                  project.category,
                  "TypeScript",
                  "Node.js",
                  "Tailwind CSS",
                  "Firebase",
                  "REST API",
                ]
            ).map((tool, idx) => (
              <div key={idx} className={styles.techPill}>
                <span className={styles.techDot} />
                <span>{tool}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            6. INSTALLATION MANUAL (#installation)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="installation"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-[var(--devengine-border)] pb-4">
            <div>
              <div className={styles.sectionTagRow}>
                <span className={styles.sectionTagLine} aria-hidden="true" />
                <span className={styles.sectionTagText}>
                  06 — Developer Onboarding
                </span>
              </div>
              <h2 className={styles.sectionHeading}>
                Installation Manual &amp; Deployment
              </h2>
            </div>

            <button
              onClick={handleCopyInstallation}
              className="bg-[var(--devengine-surface)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-text)] font-mono text-xs px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">
                {copiedManual ? "check" : "content_copy"}
              </span>
              <span>{copiedManual ? "Copied!" : "Copy Manual"}</span>
            </button>
          </div>

          <div className={styles.terminalCard}>
            <div className={styles.terminalHeader}>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
                <span className="ml-2 font-mono text-xs text-gray-400">
                  terminal — bash
                </span>
              </div>
              <span className="font-mono text-xs text-gray-500">
                INSTALL.md
              </span>
            </div>

            <pre className={styles.terminalPre}>
              {project.installation ||
                `# 1. Clone repository\ngit clone https://github.com/devengine/${project.slug}.git\n\n# 2. Install dependencies\nnpm install\n\n# 3. Configure environment variables\ncp .env.example .env.local\n\n# 4. Start development server\nnpm run dev\n\n# 5. Production build\nnpm run build`}
            </pre>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            7. PRICING & INVENTORY (#pricing)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="pricing"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className="text-center mb-12">
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                07 — Commercial Rights &amp; Access
              </span>
            </div>
            <h2 className={styles.sectionHeading}>Pricing &amp; Inventory</h2>
          </div>

          <div className={styles.pricingCard}>
            <div className={styles.pricingBadge}>SPECIAL OFFER</div>

            <div className={styles.pricingTopRow}>
              <div>
                <h3 className={styles.pricingTitle}>
                  Full Commercial License
                </h3>
                <p className={styles.pricingDesc}>
                  Complete production source code with unlimited commercial deployment rights.
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-[11px] font-mono text-[var(--devengine-muted)] uppercase mb-1 font-bold">
                  Available Rates
                </div>
                <PriceDisplay prices={projectPrices} size="lg" align="right" />
              </div>
            </div>

            <div className={styles.includedGrid}>
              <div>
                <h4 className={styles.featureListTitle}>
                  <span className="material-symbols-outlined text-base">
                    check_circle
                  </span>
                  <span>What&apos;s Included</span>
                </h4>
                <ul className={styles.featureList}>
                  {(project.whatsIncluded || DEFAULT_WHATS_INCLUDED).map(
                    (item, i) => (
                      <li key={i} className={styles.featureItem}>
                        <span className={`material-symbols-outlined ${styles.itemIcon}`}>
                          check_circle
                        </span>
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div>
                <h4 className={`${styles.featureListTitle} text-[var(--devengine-muted)]`}>
                  <span className="material-symbols-outlined text-base">
                    cancel
                  </span>
                  <span>Not Included</span>
                </h4>
                <ul className={styles.featureList}>
                  {(project.notIncluded || DEFAULT_NOT_INCLUDED).map(
                    (item, i) => (
                      <li key={i} className={`${styles.featureItem} opacity-75`}>
                        <span className="material-symbols-outlined text-gray-400 text-base mt-0.5">
                          cancel
                        </span>
                        <span>{item}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            </div>

            <button onClick={handleBuyClick} className={styles.btnBuyFull}>
              <span className="material-symbols-outlined text-2xl">
                shopping_cart
              </span>
              <span>Buy System License</span>
            </button>

            {showBuyAlert && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-mono text-xs text-center font-bold">
                ✓ Instant Cloud Access initiated. Contact our enterprise architect or proceed through invoice checkout.
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            8. DYNAMIC FAQ ACCORDION (#faq)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="faq"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className="text-center mb-12">
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                08 — Knowledge Base
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className={styles.faqStack}>
            {(project.faqs || DEFAULT_FAQS).map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className={styles.faqItem}>
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className={styles.faqQuestionBtn}
                  >
                    <span className={styles.faqQuestion}>
                      {faq.question}
                    </span>
                    <span
                      className={`material-symbols-outlined ${styles.faqIcon} ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className={styles.faqAnswer}>{faq.answer}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ═════════════════════════════════════════════════════════════════
          STICKY BOTTOM COMMAND BAR (Reveals smoothly on scroll)
      ═════════════════════════════════════════════════════════════════ */}
      <div
        className={`${styles.stickyBottomBar} ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className={styles.stickyBarInner}>
          <div className="flex items-center gap-3">
            <span className={styles.stickyProjectTitle}>
              {project.title}
            </span>
            <span className={styles.stickyBadge}>
              Ready for Deployment
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block">
              <PriceDisplay prices={projectPrices} size="sm" align="right" />
            </div>
            <button onClick={handleBuyClick} className={styles.subNavCta}>
              Buy License
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          YOUTUBE VIDEO MODAL
      ========================================================================= */}
      {showVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-[#2cecf7]/40 shadow-[0_0_100px_rgba(44,236,247,0.2)]">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white hover:text-[#2cecf7] flex items-center justify-center border border-white/20 transition"
              aria-label="Close video"
            >
              ✕
            </button>
            <iframe
              src={getYouTubeEmbedUrl(project.youtubeUrl, true)}
              title={`${project.title} Demonstration`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          LIGHTBOX FULLSCREEN MODAL VIEWER
      ========================================================================= */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-fadeIn"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="flex items-center justify-between z-10 w-full max-w-7xl mx-auto pb-3 border-b border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-[#2cecf7] bg-[#2cecf7]/10 px-3 py-1 rounded-full border border-[#2cecf7]/30">
                {lightboxIndex + 1} / {projectImages.length}
              </span>
              <h4 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                {project.title}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-block text-[11px] font-mono text-gray-400 mr-2">
                Use Arrow Keys / Esc
              </span>
              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
                title="Close Lightbox (Esc)"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>

          {/* Central Image Viewer */}
          <div
            className="relative flex-1 flex items-center justify-center my-3 max-w-7xl mx-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {projectImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev > 0 ? prev - 1 : projectImages.length - 1) : null
                  )
                }
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-[#2cecf7]/60 flex items-center justify-center transition shadow-2xl cursor-pointer"
                title="Previous Image (Left Arrow)"
              >
                <span className="material-symbols-outlined text-2xl">chevron_left</span>
              </button>
            )}

            <div className="relative w-full h-[60vh] sm:h-[70vh] max-w-5xl rounded-2xl overflow-hidden flex items-center justify-center shadow-2xl">
              <Image
                src={projectImages[lightboxIndex]}
                alt={`${project.title} - View ${lightboxIndex + 1}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>

            {projectImages.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev !== null ? (prev < projectImages.length - 1 ? prev + 1 : 0) : null
                  )
                }
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-[#2cecf7]/60 flex items-center justify-center transition shadow-2xl cursor-pointer"
                title="Next Image (Right Arrow)"
              >
                <span className="material-symbols-outlined text-2xl">chevron_right</span>
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {projectImages.length > 1 && (
            <div
              className="flex items-center justify-center gap-2 sm:gap-3 max-w-3xl mx-auto z-10 overflow-x-auto py-2 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {projectImages.map((thumb, tIdx) => {
                const isActive = tIdx === lightboxIndex;
                return (
                  <button
                    key={tIdx}
                    type="button"
                    onClick={() => setLightboxIndex(tIdx)}
                    className={`relative w-14 h-11 sm:w-18 sm:h-14 rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer ${
                      isActive
                        ? "border-[#2cecf7] scale-105 shadow-[0_0_15px_rgba(44,236,247,0.4)]"
                        : "border-white/20 hover:border-white/60 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={thumb}
                      alt={`Thumbnail ${tIdx + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <LandingFooter />
    </div>
  );
}
