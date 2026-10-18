import React, { useEffect, useState, useMemo, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import PriceDisplay from "@/components/projects/PriceDisplay";
import { getProjectPrices } from "@/lib/services/currencyService";
import { CurrencyPricing } from "@/types/currency";
import {
  ArchiveConfig,
  CaseStudyContent,
  CaseStudyFeature,
  CaseStudyResult,
  CaseStudyTimeline,
} from "@/types/archive";
import {
  getArchiveConfig,
  DEFAULT_ARCHIVE_CONFIG,
  DEFAULT_CASE_STUDY_CONTENT,
} from "@/lib/services/archiveService";
import styles from "@/components/projects/CaseStudy.module.css";

// ─── Sub-Navigation Sections ────────────────────────────────────────────────
const SECTIONS = [
  { id: "challenge", label: "Challenge" },
  { id: "approach", label: "Approach" },
  { id: "features", label: "Key Features" },
  { id: "timeline", label: "Timeline" },
  { id: "results", label: "Results" },
  { id: "deep-dive", label: "Deep Dive" },
  { id: "gallery", label: "Gallery" },
];

interface ProjectMeta {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: string | number;
  discount?: string | number;
  pricing?: CurrencyPricing[];
  tags: string[];
  imageUrl?: string;
  details?: string;
}

export default function CaseStudyPage() {
  const [config, setConfig] = useState<ArchiveConfig>(DEFAULT_ARCHIVE_CONFIG);
  const [cs, setCs] = useState<CaseStudyContent>(DEFAULT_CASE_STUDY_CONTENT);
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("challenge");
  const [showStickyNav, setShowStickyNav] = useState(false);

  // ─── Data Loading ───────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const archiveData = await getArchiveConfig();
        if (mounted) {
          setConfig(archiveData);
          setCs(
            archiveData.featuredCaseStudy.caseStudyContent ||
              DEFAULT_CASE_STUDY_CONTENT
          );
        }

        // Load the selected project metadata
        const projectId = archiveData.featuredCaseStudy.projectId;
        if (projectId) {
          const colRef = collection(db, "projects");
          let snap = await getDocs(
            query(colRef, where("slug", "==", projectId))
          );
          if (snap.empty) {
            snap = await getDocs(colRef);
            const match = snap.docs.find(
              (d) =>
                d.id === projectId ||
                (d.data() as any).slug === projectId
            );
            if (match && mounted) {
              const data = match.data() as any;
              setProject({
                id: match.id,
                slug: data.slug || match.id,
                title: data.title || "Featured Project",
                subtitle: data.subtitle || "",
                category: data.category || "General",
                price: data.price ?? "0",
                discount: data.discount,
                pricing: Array.isArray(data.pricing)
                  ? data.pricing
                  : undefined,
                tags: Array.isArray(data.tags) ? data.tags : [],
                imageUrl: data.imageUrl || data.image || "",
                details: data.details || "",
              });
            }
          } else if (mounted) {
            const doc = snap.docs[0];
            const data = doc.data() as any;
            setProject({
              id: doc.id,
              slug: data.slug || doc.id,
              title: data.title || "Featured Project",
              subtitle: data.subtitle || "",
              category: data.category || "General",
              price: data.price ?? "0",
              discount: data.discount,
              pricing: Array.isArray(data.pricing)
                ? data.pricing
                : undefined,
              tags: Array.isArray(data.tags) ? data.tags : [],
              imageUrl: data.imageUrl || data.image || "",
              details: data.details || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load case study:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ─── Scroll Spy & Sticky Nav ────────────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyNav(window.scrollY > 400);

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 200) {
            setActiveSection(SECTIONS[i].id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ─── Smooth Scroll Reveal Observer across all sections ───────────────────
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
  }, [loading]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const offset = 140;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - offset,
        behavior: "smooth",
      });
    }
  };

  const projectTitle =
    project?.title || config.featuredCaseStudy.title || "Featured Project";
  const projectSubtitle =
    project?.subtitle || config.featuredCaseStudy.titleHighlight || "High-Fidelity Engineering System";
  const projectCategory =
    project?.category || "Engineering";
  const heroImageSrc =
    cs.heroImage ||
    project?.imageUrl ||
    config.defaultProjectImages?.[0] ||
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop";

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[var(--devengine-page)] z-50 flex items-center justify-center">
        <HelixLoader size={80} text="LOADING CASE STUDY..." />
      </div>
    );
  }

  return (
    <div className={styles.caseStudyRoot}>
      <Head>
        <title>
          {projectTitle} — Engineering Case Study | DevEngine
        </title>
        <meta
          name="description"
          content={cs.challenge || projectSubtitle}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Subtle Cyber Blueprint & Ambient Lighting */}
      <div className={styles.ambientCanvas} aria-hidden="true">
        <span className={styles.ambientBlobA} />
        <span className={styles.ambientBlobB} />
        <span className={styles.ambientGrid} />
      </div>

      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO: Full-Width Clear Resolution Banner
      ═══════════════════════════════════════════════════════════════════ */}
      <section className={`${styles.heroSection} ${styles.scrollSection} ${styles.sectionActive}`}>
        {/* Background Image Container with Progressive Blur */}
        <div className={styles.heroImageWrap}>
          {/* Base sharp clear image */}
          <Image
            src={heroImageSrc}
            alt={projectTitle}
            fill
            className={styles.heroImg}
            unoptimized
            priority
          />
          {/* Progressive blur overlay: softens towards the bottom, decreases towards top */}
          <div className={styles.progressiveBlurWrap} aria-hidden="true">
            <Image
              src={heroImageSrc}
              alt=""
              fill
              className={styles.heroImgBlur}
              unoptimized
              priority
            />
          </div>
          <div className={styles.heroOverlay} />
        </div>

        {/* Hero Content with Frosted Glass Card */}
        <div className={styles.heroContent}>
          <div className={styles.heroContentCard}>
            <div className={styles.heroBadgeRow}>
              <span className={styles.badgePrimary}>
                Case Study
              </span>
              <span className={styles.badgeSecondary}>
                {projectCategory}
              </span>
              {(project?.tags || []).slice(0, 4).map((t) => (
                <span key={t} className={styles.badgeTag}>
                  #{t}
                </span>
              ))}
            </div>

            <h1 className={styles.heroTitle}>
              {projectTitle}
            </h1>

            {/* Subtitle - Increased size, clear typography, and brand accent */}
            <p className={styles.heroSubtitle}>
              {projectSubtitle}
            </p>

            <div className={styles.heroActions}>
              <button
                type="button"
                onClick={() => scrollToSection("challenge")}
                className={styles.ctaPrimary}
              >
                Read Case Study ↓
              </button>
              <Link
                href={`/projects/${project?.slug || config.featuredCaseStudy.projectId || "craftybay"}`}
                className={styles.ctaSecondary}
              >
                View Specifications <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY SUB-NAVIGATION (Safe clearance & theme-matched)
      ═══════════════════════════════════════════════════════════════════ */}
      <nav
        className={`${styles.subNavBar} ${
          showStickyNav ? "shadow-md" : ""
        }`}
        aria-label="Case Study Section Navigation"
      >
        <div className={styles.subNavContainer}>
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`${styles.subNavItem} ${
                activeSection === sec.id ? styles.subNavItemActive : ""
              }`}
              aria-current={activeSection === sec.id ? "true" : undefined}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="w-full relative z-10 selection:bg-[var(--devengine-accent)] selection:text-[var(--devengine-button-text)]">
        {/* ═════════════════════════════════════════════════════════════════
            SECTION 1: The Challenge
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="challenge"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                01 — The Challenge
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              What Problem Were We Solving?
            </h2>
          </div>

          <div className={styles.cardSurface}>
            <div className="flex gap-4 sm:gap-6 items-start">
              <span
                className="w-1.5 self-stretch rounded-full bg-[var(--devengine-accent)] flex-shrink-0"
                aria-hidden="true"
              />
              <p className={styles.cardText}>
                {cs.challenge}
              </p>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 2: The Approach
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="approach"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                02 — The Approach
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Architecture & Design Philosophy
            </h2>
          </div>

          <div className={styles.architectureGrid}>
            <div className={styles.cardSurface}>
              <p className={styles.cardText}>
                {cs.approach}
              </p>
            </div>

            {cs.architectureDiagram && (
              <div className={styles.diagramFrame}>
                {/* Background blurred ambient underlay */}
                <Image
                  src={cs.architectureDiagram}
                  alt=""
                  fill
                  className="object-cover blur-2xl opacity-25 scale-110 pointer-events-none"
                  aria-hidden="true"
                  unoptimized
                />
                {/* Crisp diagram image - adaptive contain */}
                <Image
                  src={cs.architectureDiagram}
                  alt="System Architecture Diagram"
                  fill
                  className={styles.diagramImg}
                  unoptimized
                />
                <div className="absolute bottom-4 left-4 font-jetbrains text-[10px] text-[var(--devengine-muted)] uppercase tracking-widest bg-[var(--devengine-surface)]/95 px-3 py-1 rounded-full border border-[var(--devengine-border)] backdrop-blur-md z-10 font-bold">
                  System Architecture
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 3: Key Features Showcase (Engineering Highlights)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="features"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                03 — Key Features
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Engineering Highlights
            </h2>
          </div>

          <div className="space-y-12">
            {cs.keyFeatures.map((feature, idx) => (
              <div
                key={idx}
                className={`${styles.featureRow} ${
                  idx % 2 === 1 ? styles.featureRowReverse : ""
                }`}
              >
                {/* Feature Media Mockup - Polished Adaptive Frame */}
                {feature.image && (
                  <div className={styles.featureMedia}>
                    <Image
                      src={feature.image}
                      alt={feature.title}
                      fill
                      className={styles.featureImg}
                      unoptimized
                    />
                  </div>
                )}

                {/* Feature Description Card */}
                <div className={styles.featureContent}>
                  <div className={styles.cardSurface}>
                    <div className="flex items-center gap-3.5 mb-4">
                      <span className={styles.featureIndexPill}>
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className={styles.featureTitle}>
                        {feature.title}
                      </h3>
                    </div>
                    <p className={styles.cardText}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 4: Development Timeline
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="timeline"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                04 — Development Timeline
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              From Concept to Production
            </h2>
          </div>

          {/* Vertical Stepper Timeline with Precision Center Alignment */}
          <div className={styles.timelineTrack}>
            {cs.timeline.map((phase, idx) => (
              <div key={idx} className={styles.timelineItem}>
                {/* Dedicated Stepper Indicator Column */}
                <div className={styles.stepperCol}>
                  <div className={styles.timelineNode} aria-hidden="true">
                    <span className={styles.nodeCore} />
                    <span className={styles.nodePulse} />
                  </div>
                  {idx < cs.timeline.length - 1 && (
                    <div className={styles.stepperLine} aria-hidden="true" />
                  )}
                </div>

                {/* Timeline Content Card */}
                <div className={styles.timelineCard}>
                  <div className={styles.cardSurface}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className={styles.phaseBadge}>
                        {phase.phase}
                      </span>
                    </div>
                    <h3 className={styles.timelineTitle}>
                      {phase.title}
                    </h3>
                    <p className={styles.timelineDesc}>
                      {phase.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 5: Results & Impact (Measurable Outcomes)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="results"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                05 — Results & Impact
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Measurable Outcomes
            </h2>
          </div>

          <div className={styles.resultsGrid}>
            {cs.results.map((result, idx) => (
              <div key={idx} className={styles.metricCard}>
                <div className={styles.metricVal}>
                  {result.value}
                </div>
                <div className={styles.metricLabel}>
                  {result.metric}
                </div>
                <p className={styles.metricDesc}>
                  {result.description}
                </p>
              </div>
            ))}
          </div>

          {/* Client Testimonial / Quote Card */}
          {cs.testimonial && cs.testimonial.quote && (
            <div className={`mt-14 ${styles.quoteCard}`}>
              <div className={styles.quoteMark} aria-hidden="true">&ldquo;</div>
              <blockquote className="relative z-10">
                <p className={styles.quoteText}>
                  &ldquo;{cs.testimonial.quote}&rdquo;
                </p>
                <footer className="flex items-center gap-4">
                  <div className={styles.quoteAvatar}>
                    {cs.testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div className={styles.quoteAuthor}>
                      {cs.testimonial.author}
                    </div>
                    <div className={styles.quoteRole}>
                      {cs.testimonial.role}
                    </div>
                  </div>
                </footer>
              </blockquote>
            </div>
          )}
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 6: Technical Deep-Dive
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="deep-dive"
          className={`${styles.sectionBlock} ${styles.scrollSection}`}
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTagRow}>
              <span className={styles.sectionTagLine} aria-hidden="true" />
              <span className={styles.sectionTagText}>
                06 — Technical Deep-Dive
              </span>
            </div>
            <h2 className={styles.sectionHeading}>
              Under the Hood
            </h2>
          </div>

          <div className={styles.cardSurface}>
            <p className={`${styles.cardText} whitespace-pre-line`}>
              {cs.technicalDeepDive}
            </p>
          </div>

          {/* Tech Tags */}
          {project && project.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2.5">
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-[var(--devengine-surface)] text-[var(--devengine-text)] px-3.5 py-1.5 rounded-full font-jetbrains text-xs uppercase tracking-wider border border-[var(--devengine-border)] shadow-xs"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 7: Gallery (Visual Showcase - Asymmetric Bento Grid)
        ═════════════════════════════════════════════════════════════════ */}
        {cs.gallery && cs.gallery.length > 0 && (
          <section
            id="gallery"
            className={`${styles.sectionBlock} ${styles.scrollSection}`}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTagRow}>
                <span className={styles.sectionTagLine} aria-hidden="true" />
                <span className={styles.sectionTagText}>
                  07 — Gallery
                </span>
              </div>
              <h2 className={styles.sectionHeading}>
                Visual Showcase
              </h2>
            </div>

            <div className={styles.galleryGrid}>
              {cs.gallery.map((img, idx) => (
                <div key={idx} className={styles.galleryItem}>
                  <Image
                    src={img}
                    alt={`Showcase visual ${idx + 1}`}
                    fill
                    className={styles.galleryImg}
                    unoptimized
                  />
                  <div className={styles.galleryFrameGlass} aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 8: Call to Action
        ═════════════════════════════════════════════════════════════════ */}
        <section className={`${styles.sectionBlock} ${styles.scrollSection}`}>
          <div className={styles.ctaBanner}>
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className={styles.ctaHeading}>
                {cs.ctaTitle}
              </h2>
              <p className={styles.ctaSubtitle}>
                {cs.ctaDescription}
              </p>

              {/* Pricing Preview */}
              {project && (
                <div className="mb-8 inline-flex items-center gap-4 bg-[var(--devengine-raised)] px-6 py-3 rounded-2xl border border-[var(--devengine-border)] shadow-xs">
                  <span className="font-jetbrains text-xs text-[var(--devengine-muted)] uppercase tracking-wider font-bold">
                    Starting From
                  </span>
                  <PriceDisplay
                    prices={getProjectPrices(project)}
                    size="md"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Link
                  href={`/projects/${project?.slug || config.featuredCaseStudy.projectId || "craftybay"}`}
                  className={styles.ctaPrimary}
                >
                  View Full Specifications →
                </Link>
                <Link
                  href="/projects/all"
                  className={styles.ctaSecondary}
                >
                  Explore All Projects
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
