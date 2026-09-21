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
      setShowStickyNav(window.scrollY > 600);

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 180) {
            setActiveSection(SECTIONS[i].id);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
  const projectCategory =
    project?.category || "Engineering";

  if (loading) {
    return (
      <>
        <LandingNavbar />
        <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center">
          <HelixLoader size={56} color="#38f2ff" />
          <p className="mt-6 font-jetbrains text-xs text-gray-400 tracking-widest uppercase">
            Loading Case Study…
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>
          {projectTitle} — Case Study | DevEngine
        </title>
        <meta
          name="description"
          content={cs.challenge || "An in-depth engineering case study."}
        />
      </Head>

      {/* Global Dark Canvas */}
      <div className="fixed inset-0 bg-[#030712] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(14,19,31,0.9)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-60" />

      <LandingNavbar />

      {/* ═══════════════════════════════════════════════════════════════════
          HERO: Full-Width Banner
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="relative w-full h-[70vh] min-h-[520px] max-h-[800px] overflow-hidden">
        <Image
          src={cs.heroImage || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop"}
          alt="Case Study Hero"
          fill
          className="object-cover"
          unoptimized
          priority
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#030712]/80 to-transparent" />

        {/* Hero Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 md:p-20 max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-[#38f2ff]/15 text-[#38f2ff] px-3 py-1 rounded font-jetbrains text-[10px] uppercase tracking-widest border border-[#38f2ff]/30 font-bold">
              Case Study
            </span>
            <span className="bg-white/5 text-gray-300 px-3 py-1 rounded font-jetbrains text-[10px] uppercase tracking-widest border border-white/10">
              {projectCategory}
            </span>
            {(project?.tags || []).slice(0, 3).map((t) => (
              <span
                key={t}
                className="bg-white/5 text-gray-400 px-2.5 py-1 rounded font-mono text-[10px] border border-white/5"
              >
                #{t}
              </span>
            ))}
          </div>

          <h1 className="font-space font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white tracking-tight leading-tight mb-4">
            {projectTitle}
          </h1>
          <p className="font-sans text-base sm:text-lg text-[#849495] max-w-3xl leading-relaxed mb-6">
            {project?.subtitle || config.featuredCaseStudy.titleHighlight}
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={() => scrollToSection("challenge")}
              className="bg-[#38f2ff] text-[#030712] font-sans text-sm font-bold uppercase tracking-wider px-8 py-4 rounded-full shadow-[0_0_30px_rgba(56,242,255,0.3)] hover:shadow-[0_0_50px_rgba(56,242,255,0.5)] hover:scale-105 active:scale-95 transition-all"
            >
              Read Case Study
            </button>
            <Link
              href={`/projects/${project?.slug || config.featuredCaseStudy.projectId}`}
              className="bg-white/5 backdrop-blur-xl text-white font-sans text-sm font-bold uppercase tracking-wider px-8 py-4 rounded-full border border-white/10 hover:border-[#38f2ff]/40 hover:bg-white/10 transition-all flex items-center gap-2"
            >
              View Specifications <span className="text-base">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          STICKY SUB-NAVIGATION
      ═══════════════════════════════════════════════════════════════════ */}
      <nav
        className={`sticky top-[72px] z-40 transition-all duration-300 ${
          showStickyNav
            ? "bg-[#080e1a]/95 backdrop-blur-2xl border-b border-white/10 shadow-xl"
            : "bg-[#080e1a]/60 backdrop-blur-md border-b border-white/5"
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-12 md:px-20 flex items-center gap-1 overflow-x-auto scrollbar-hide py-3">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wide transition-all ${
                activeSection === sec.id
                  ? "text-[#38f2ff] bg-[#38f2ff]/10 font-bold border-b-2 border-[#38f2ff]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="w-full relative text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712]">
        {/* ═════════════════════════════════════════════════════════════════
            SECTION: The Challenge
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="challenge"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                01 — The Challenge
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-8 leading-tight tracking-tight">
              What Problem Were We Solving?
            </h2>
            <div className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-8 sm:p-12 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#38f2ff] via-[#3495ea] to-transparent rounded-full" />
              <p className="font-sans text-base sm:text-lg text-[#c0c8d8] leading-relaxed pl-6">
                {cs.challenge}
              </p>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: The Approach
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="approach"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                02 — The Approach
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-8 leading-tight tracking-tight">
              Architecture & Design Philosophy
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
                <p className="font-sans text-base text-[#c0c8d8] leading-relaxed">
                  {cs.approach}
                </p>
              </div>

              {cs.architectureDiagram && (
                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[320px] group">
                  <Image
                    src={cs.architectureDiagram}
                    alt="System Architecture Diagram"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/80 to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 left-4 font-jetbrains text-[10px] text-gray-400 uppercase tracking-widest bg-black/60 px-3 py-1 rounded backdrop-blur-md">
                    System Architecture
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Key Features Showcase
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="features"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-6xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                03 — Key Features
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-12 leading-tight tracking-tight">
              Engineering Highlights
            </h2>

            <div className="space-y-12">
              {cs.keyFeatures.map((feature, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"
                  } gap-8 items-center`}
                >
                  {/* Feature Image */}
                  {feature.image && (
                    <div className="flex-1 w-full relative h-[280px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/70 to-transparent pointer-events-none" />
                    </div>
                  )}

                  {/* Feature Text */}
                  <div className="flex-1 w-full">
                    <div className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-8 border border-white/10 hover:border-[#38f2ff]/30 transition-all h-full">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center font-space text-[#38f2ff] text-sm font-bold">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h3 className="font-space text-xl sm:text-2xl font-bold text-white">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="font-sans text-sm sm:text-base text-[#849495] leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Development Timeline
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="timeline"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                04 — Development Timeline
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-12 leading-tight tracking-tight">
              From Concept to Production
            </h2>

            {/* Vertical Timeline */}
            <div className="relative pl-8 border-l-2 border-[#38f2ff]/20 space-y-10">
              {cs.timeline.map((phase, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[2.6rem] top-1 w-5 h-5 rounded-full bg-[#080e1a] border-2 border-[#38f2ff]/60 group-hover:border-[#38f2ff] group-hover:shadow-[0_0_12px_rgba(56,242,255,0.4)] transition-all flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#38f2ff]" />
                  </div>

                  <div className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-[#38f2ff]/30 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="bg-[#38f2ff]/10 text-[#38f2ff] px-2.5 py-0.5 rounded font-jetbrains text-[10px] uppercase tracking-widest font-bold border border-[#38f2ff]/30">
                        {phase.phase}
                      </span>
                    </div>
                    <h3 className="font-space text-lg sm:text-xl font-bold text-white mb-2">
                      {phase.title}
                    </h3>
                    <p className="font-sans text-sm text-[#849495] leading-relaxed">
                      {phase.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Results & Impact
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="results"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                05 — Results & Impact
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-12 leading-tight tracking-tight">
              Measurable Outcomes
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {cs.results.map((result, idx) => (
                <div
                  key={idx}
                  className="bg-[#080e1a]/85 backdrop-blur-xl rounded-2xl p-6 border border-white/10 hover:border-[#38f2ff]/30 hover:shadow-[0_0_25px_rgba(56,242,255,0.1)] transition-all text-center group"
                >
                  <div className="font-space text-3xl sm:text-4xl font-bold text-[#38f2ff] mb-3 group-hover:drop-shadow-[0_0_12px_rgba(56,242,255,0.4)] transition-all">
                    {result.value}
                  </div>
                  <div className="font-jetbrains text-xs text-white uppercase tracking-widest font-bold mb-2">
                    {result.metric}
                  </div>
                  <p className="font-sans text-xs text-[#849495] leading-relaxed">
                    {result.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            {cs.testimonial && cs.testimonial.quote && (
              <div className="mt-16 bg-[#080e1a]/80 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-[#38f2ff]/20 relative overflow-hidden">
                <div className="absolute top-6 left-8 font-space text-6xl text-[#38f2ff]/10 leading-none select-none">
                  &ldquo;
                </div>
                <blockquote className="relative z-10 pl-4">
                  <p className="font-sans text-base sm:text-lg text-[#c0c8d8] leading-relaxed italic mb-6">
                    &ldquo;{cs.testimonial.quote}&rdquo;
                  </p>
                  <footer className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center font-space text-[#38f2ff] text-sm font-bold">
                      {cs.testimonial.author.charAt(0)}
                    </div>
                    <div>
                      <div className="font-space text-sm font-bold text-white">
                        {cs.testimonial.author}
                      </div>
                      <div className="font-mono text-[11px] text-gray-400">
                        {cs.testimonial.role}
                      </div>
                    </div>
                  </footer>
                </blockquote>
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Technical Deep-Dive
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="deep-dive"
          className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
        >
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="w-8 h-[2px] bg-[#38f2ff]" />
              <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                06 — Technical Deep-Dive
              </span>
            </div>
            <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-8 leading-tight tracking-tight">
              Under the Hood
            </h2>

            <div className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl p-8 sm:p-12 border border-white/10">
              <p className="font-sans text-base text-[#c0c8d8] leading-relaxed whitespace-pre-line">
                {cs.technicalDeepDive}
              </p>
            </div>

            {/* Tech Tags from Project */}
            {project && project.tags.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#161c28] text-gray-300 px-3 py-1.5 rounded-lg font-jetbrains text-[10px] uppercase tracking-wider border border-white/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Gallery
        ═════════════════════════════════════════════════════════════════ */}
        {cs.gallery && cs.gallery.length > 0 && (
          <section
            id="gallery"
            className="py-20 px-6 sm:px-12 md:px-20 scroll-mt-36"
          >
            <div className="max-w-6xl mx-auto">
              <div className="inline-flex items-center gap-2 mb-8">
                <span className="w-8 h-[2px] bg-[#38f2ff]" />
                <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                  07 — Gallery
                </span>
              </div>
              <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-12 leading-tight tracking-tight">
                Visual Showcase
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cs.gallery.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-2xl overflow-hidden border border-white/10 shadow-xl group hover:border-[#38f2ff]/40 transition-all ${
                      idx === 0 ? "sm:col-span-2 sm:row-span-2 h-[400px]" : "h-[200px]"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Gallery image ${idx + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-700"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#080e1a]/50 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            SECTION: Call to Action
        ═════════════════════════════════════════════════════════════════ */}
        <section className="py-20 px-6 sm:px-12 md:px-20">
          <div className="max-w-4xl mx-auto bg-[#080e1a]/80 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 md:p-16 border border-[#38f2ff]/20 text-center relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#38f2ff]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              <h2 className="font-space font-bold text-3xl sm:text-4xl md:text-5xl text-white mb-6 tracking-tight">
                {cs.ctaTitle}
              </h2>
              <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl mx-auto mb-10 leading-relaxed">
                {cs.ctaDescription}
              </p>

              {/* Pricing Preview */}
              {project && (
                <div className="mb-8 inline-flex items-center gap-4 bg-[#161c28] px-6 py-3 rounded-xl border border-white/10">
                  <span className="font-jetbrains text-[10px] text-gray-400 uppercase tracking-widest">
                    Starting From
                  </span>
                  <PriceDisplay
                    prices={getProjectPrices(project)}
                    size="md"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href={`/projects/${project?.slug || config.featuredCaseStudy.projectId}`}
                  className="bg-[#38f2ff] text-[#030712] font-sans text-sm font-bold uppercase tracking-wider px-10 py-5 rounded-full shadow-[0_0_30px_rgba(56,242,255,0.4)] hover:shadow-[0_0_50px_rgba(56,242,255,0.6)] hover:scale-105 active:scale-95 transition-all"
                >
                  View Full Specifications
                </Link>
                <Link
                  href="/projects/all"
                  className="bg-white/5 backdrop-blur-xl text-white font-sans text-sm font-bold uppercase tracking-wider px-10 py-5 rounded-full border border-white/10 hover:border-[#38f2ff]/40 hover:bg-white/10 transition-all"
                >
                  Explore All Projects
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </>
  );
}
