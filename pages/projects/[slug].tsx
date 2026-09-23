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
      const yOffset = -140;
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
    if (Array.isArray(project.images) && project.images.length > 0) {
      return project.images.filter(Boolean);
    }
    if (project.imageUrl) return [project.imageUrl];
    return [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1400&auto=format&fit=crop",
    ];
  }, [project]);

  const displayImage =
    projectImages[0] ||
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1400&auto=format&fit=crop";

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
      <>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center text-white bg-[#030712]">
          <HelixLoader size={54} color="#38f2ff" />
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-gray-400">
            Decoding Architecture Blueprint…
          </p>
        </main>
        <LandingFooter />
      </>
    );
  }

  if (notFound || !project) {
    return (
      <>
        <Head>
          <title>System Not Found // DevEngine Archive</title>
        </Head>
        <LandingNavbar />
        <main className="min-h-screen pt-44 pb-32 px-6 flex flex-col items-center justify-center text-center text-white bg-[#030712]">
          <div className="bg-[#080e1a] p-8 sm:p-12 rounded-3xl border border-white/10 max-w-lg shadow-2xl">
            <span className="material-symbols-outlined text-5xl text-[#38f2ff] mb-4">
              deployed_code_alert
            </span>
            <h1 className="font-space font-bold text-2xl text-white mb-2">
              System Archive Not Found
            </h1>
            <p className="font-sans text-sm text-gray-400 mb-6 leading-relaxed">
              The requested architecture specification does not exist or requires authenticated credentials to access.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/projects/all"
                className="bg-[#38f2ff] text-black font-mono text-xs font-bold px-6 py-3 rounded-full hover:bg-[#00dbe8] transition"
              >
                Browse All Systems
              </Link>
              <Link
                href="/home"
                className="bg-white/10 text-white font-mono text-xs px-6 py-3 rounded-full hover:bg-white/20 transition"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </main>
        <LandingFooter />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{project.title} — Cinematic Engineering // DevEngine</title>
        <meta
          name="description"
          content={project.subtitle || project.details?.slice(0, 160)}
        />
      </Head>

      <LandingNavbar />

      {/* =========================================================================
          STICKY SUB-NAVIGATION BAR WITH SCROLL SPY & COLORED UNDERLINE
      ========================================================================= */}
      <nav
        aria-label="Project Sections"
        className="sticky top-[80px] w-full z-40 bg-[#080e1a]/95 backdrop-blur-xl border-b border-white/10 py-3.5 shadow-2xl"
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth font-mono text-xs sm:text-[13px] uppercase tracking-wide py-1">
            {SECTIONS.map((sec) => {
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={`transition-all whitespace-nowrap py-1 px-1 relative font-medium ${
                    isActive
                      ? "text-[#38f2ff] font-bold border-b-2 border-[#38f2ff] drop-shadow-[0_0_10px_rgba(56,242,255,0.45)]"
                      : "text-gray-300 hover:text-white hover:border-b-2 hover:border-white/30"
                  }`}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>

          {/* Quick Action in Header */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={handleBuyClick}
              className="bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-sans font-bold text-xs sm:text-sm px-5 py-2 rounded-full transition shadow-[0_0_20px_rgba(56,242,255,0.35)] hover:scale-105"
            >
              Buy License
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full relative text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712] overflow-x-hidden pt-12 sm:pt-16 pb-32">
        {/* =========================================================================
            1. CINEMATIC HERO SECTION (#overview)
        ========================================================================= */}
        <section
          id="overview"
          className="flex flex-col items-center justify-start px-6 sm:px-12 md:px-20 text-center relative pt-4 sm:pt-8 pb-20 scroll-mt-48"
        >
          <div className="max-w-4xl mx-auto z-10 flex flex-col items-center gap-6">
            {/* Breadcrumb / Category Badge */}
            <div className="inline-flex items-center gap-2.5 font-mono text-xs sm:text-[13px] text-[#38f2ff] tracking-[0.16em] uppercase bg-[#38f2ff]/10 px-5 py-2.5 rounded-full border border-[#38f2ff]/35 font-semibold shadow-[0_0_15px_rgba(56,242,255,0.2)]">
              <span className="w-2 h-2 rounded-full bg-[#38f2ff] shadow-[0_0_8px_#38f2ff] animate-ping" />
              <span>System Specification // {(project.category || "General").toUpperCase()}</span>
            </div>

            {/* Cinematic Hero Title */}
            <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl text-transparent bg-clip-text bg-gradient-to-r from-white via-[#dde2f3] to-gray-400 tracking-tight leading-tight">
              {project.title}
            </h1>

            {/* Subtitle */}
            <p className="font-sans text-base sm:text-xl text-[#849495] max-w-2xl mx-auto leading-relaxed">
              {project.subtitle || project.details}
            </p>

            {/* Expanded Metadata Chips - High Clarity & Enhanced Sizing */}
            <div className="flex flex-wrap justify-center gap-3 mt-3 text-xs sm:text-sm">
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0e1626]/90 backdrop-blur-md rounded-xl border border-white/20 text-gray-200 shadow-md flex items-center gap-2 hover:border-[#38f2ff]/40 transition-colors">
                <span className="font-mono text-gray-400 text-xs sm:text-[13px] uppercase tracking-wider">Type:</span>
                <strong className="text-white font-semibold text-xs sm:text-[14px]">{(project.category || "General").toUpperCase()}</strong>
              </span>
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0e1626]/90 backdrop-blur-md rounded-xl border border-white/20 text-gray-200 shadow-md flex items-center gap-2 hover:border-[#38f2ff]/40 transition-colors">
                <span className="font-mono text-gray-400 text-xs sm:text-[13px] uppercase tracking-wider">Platform:</span>
                <strong className="text-white font-semibold text-xs sm:text-[14px]">{project.platform || project.snapshot?.platform || "Cross-Platform"}</strong>
              </span>
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0e1626]/90 backdrop-blur-md rounded-xl border border-white/20 text-gray-200 shadow-md flex items-center gap-2 hover:border-[#38f2ff]/40 transition-colors">
                <span className="font-mono text-gray-400 text-xs sm:text-[13px] uppercase tracking-wider">Version:</span>
                <strong className="text-white font-semibold text-xs sm:text-[14px]">{project.version || project.snapshot?.version || "v2.4.0"}</strong>
              </span>
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0e1626]/90 backdrop-blur-md rounded-xl border border-white/20 text-gray-200 shadow-md flex items-center gap-2 hover:border-[#38f2ff]/40 transition-colors">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <span className="font-mono text-gray-400 text-xs sm:text-[13px] uppercase tracking-wider">Status:</span>
                <strong className="text-emerald-400 font-semibold text-xs sm:text-[14px]">{project.status || project.snapshot?.status || "Production Ready"}</strong>
              </span>
              <span className="px-4 py-2 sm:px-5 sm:py-2.5 bg-[#0e1626]/90 backdrop-blur-md rounded-xl border border-white/20 text-gray-200 shadow-md flex items-center gap-2 hover:border-[#38f2ff]/40 transition-colors">
                <span className="font-mono text-gray-400 text-xs sm:text-[13px] uppercase tracking-wider">Release:</span>
                <strong className="text-white font-semibold text-xs sm:text-[14px]">{project.releaseDate || project.snapshot?.releaseDate || "Q3 2026"}</strong>
              </span>
            </div>

            {/* Hero Action Buttons - Clean Modern Typography */}
            <div className="flex flex-col sm:flex-row gap-4 mt-6 w-full sm:w-auto">
              <button
                onClick={() => {
                  if (project.youtubeUrl) {
                    setShowVideoModal(true);
                  } else {
                    scrollToSection("demo");
                  }
                }}
                className="bg-[#38f2ff] hover:bg-[#00e1f0] text-[#030712] font-sans font-bold text-sm sm:text-base px-8 py-4 sm:px-9 sm:py-4.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_0_35px_rgba(56,242,255,0.4)] hover:shadow-[0_0_45px_rgba(56,242,255,0.6)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-2xl">play_circle</span>
                <span>Watch Live Demo</span>
              </button>

              <button
                onClick={handleBuyClick}
                className="bg-white/10 hover:bg-white/15 text-white font-sans font-semibold text-sm sm:text-base px-8 py-4 sm:px-9 sm:py-4.5 rounded-xl sm:rounded-2xl flex items-center justify-center gap-3 border border-white/20 hover:border-white/35 transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-md shadow-lg"
              >
                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                <span>Buy System License</span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              ADAPTIVE MULTI-IMAGE GALLERY (1 to 5 Images with Dynamic Grid)
          ========================================================================= */}
          {projectImages.length === 1 && (
            /* 1 Image: Massive Cinematic Device Mockup Banner */
            <div
              onClick={() => setLightboxIndex(0)}
              className="mt-16 relative w-full max-w-6xl mx-auto h-[420px] sm:h-[600px] md:h-[700px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/40 bg-[#080e1a]/80 backdrop-blur-2xl shadow-[0_0_100px_rgba(56,242,255,0.15)] flex items-center justify-center group cursor-pointer transition-all duration-500"
            >
              <Image
                src={projectImages[0]}
                alt={project.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                priority
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#080e1a]/60 via-transparent to-transparent pointer-events-none" />

              {/* Hover Expand Overlay */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl scale-95 group-hover:scale-100 transition-transform">
                  <span className="material-symbols-outlined text-[#38f2ff] text-base">zoom_in</span>
                  <span>Click to expand full screen</span>
                </div>
              </div>

              {/* Telemetry Badge Overlay */}
              <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 pointer-events-none">
                <div className="bg-[#080e1a]/90 backdrop-blur-xl px-4 sm:px-5 py-2 rounded-full border border-[#38f2ff]/40 font-mono text-[11px] sm:text-xs text-[#38f2ff] flex items-center gap-2 shadow-2xl">
                  <span className="material-symbols-outlined text-sm">memory</span>
                  <span>Active Production Architecture // Ready for Deployment</span>
                </div>
              </div>
            </div>
          )}

          {projectImages.length === 2 && (
            /* 2 Images: Symmetrical 2-Column Showcase */
            <div className="mt-16 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {projectImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className="relative h-[320px] sm:h-[450px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-xl flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.01]"
                >
                  <Image
                    src={img}
                    alt={`${project.title} - View ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    priority={idx === 0}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-4 left-4 bg-[#080e1a]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono text-[10px] text-[#38f2ff]">
                    {idx === 0 ? "PRIMARY // COVER" : `VIEW ${idx + 1}`}
                  </div>
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl">
                      <span className="material-symbols-outlined text-[#38f2ff] text-base">zoom_in</span>
                      <span>Expand view</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {projectImages.length === 3 && (
            /* 3 Images: Bento Grid (Primary Hero on Left, 2 Stacked on Right) */
            <div className="mt-16 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
              {/* Large Primary Card */}
              <div
                onClick={() => setLightboxIndex(0)}
                className="md:col-span-7 relative h-[360px] md:h-[540px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-xl flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.01]"
              >
                <Image
                  src={projectImages[0]}
                  alt={`${project.title} - Primary View`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 bg-[#080e1a]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono text-[10px] text-[#38f2ff]">
                  PRIMARY ARCHITECTURE
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl">
                    <span className="material-symbols-outlined text-[#38f2ff] text-base">zoom_in</span>
                    <span>Expand Primary View</span>
                  </div>
                </div>
              </div>

              {/* 2 Stacked Cards on Right */}
              <div className="md:col-span-5 grid grid-cols-1 gap-5 sm:gap-6">
                {projectImages.slice(1, 3).map((img, i) => {
                  const actualIdx = i + 1;
                  return (
                    <div
                      key={actualIdx}
                      onClick={() => setLightboxIndex(actualIdx)}
                      className="relative h-[220px] md:h-[258px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-xl flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.01]"
                    >
                      <Image
                        src={img}
                        alt={`${project.title} - View ${actualIdx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
                      <div className="absolute top-3 left-3 bg-[#080e1a]/85 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 font-mono text-[10px] text-gray-300">
                        VIEW #{actualIdx + 1}
                      </div>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-[11px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xl">
                          <span className="material-symbols-outlined text-[#38f2ff] text-sm">zoom_in</span>
                          <span>Expand</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {projectImages.length === 4 && (
            /* 4 Images: 2x2 Grid Showcase */
            <div className="mt-16 w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
              {projectImages.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setLightboxIndex(idx)}
                  className="relative h-[260px] sm:h-[340px] md:h-[380px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-xl flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.01]"
                >
                  <Image
                    src={img}
                    alt={`${project.title} - View ${idx + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    priority={idx === 0}
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-4 left-4 bg-[#080e1a]/85 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 font-mono text-[10px] text-[#38f2ff]">
                    {idx === 0 ? "PRIMARY // COVER" : `VIEW ${idx + 1}`}
                  </div>
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xl">
                      <span className="material-symbols-outlined text-[#38f2ff] text-base">zoom_in</span>
                      <span>Expand view</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {projectImages.length >= 5 && (
            /* 5 Images: Featured Large Header + 4-Column Showcase */
            <div className="mt-16 w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
              {/* Large Primary Banner */}
              <div
                onClick={() => setLightboxIndex(0)}
                className="relative w-full h-[340px] sm:h-[460px] md:h-[540px] rounded-3xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-xl flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.005]"
              >
                <Image
                  src={projectImages[0]}
                  alt={`${project.title} - Primary Architecture`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                  priority
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-4 left-4 bg-[#080e1a]/85 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 font-mono text-[10px] text-[#38f2ff]">
                  PRIMARY ARCHITECTURE // 5 VIEWS
                </div>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="bg-[#080e1a]/90 backdrop-blur-xl border border-[#38f2ff]/50 text-white font-mono text-xs px-4 py-2 rounded-xl flex items-center gap-2 shadow-2xl">
                    <span className="material-symbols-outlined text-[#38f2ff] text-base">zoom_in</span>
                    <span>Expand Primary View</span>
                  </div>
                </div>
              </div>

              {/* 4 Bottom Thumbnails */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {projectImages.slice(1, 5).map((img, i) => {
                  const actualIdx = i + 1;
                  return (
                    <div
                      key={actualIdx}
                      onClick={() => setLightboxIndex(actualIdx)}
                      className="relative h-[130px] sm:h-[180px] md:h-[200px] rounded-2xl overflow-hidden border border-white/10 hover:border-[#38f2ff]/50 bg-[#080e1a]/80 backdrop-blur-2xl shadow-lg flex items-center justify-center group cursor-pointer transition-all duration-500 hover:scale-[1.02]"
                    >
                      <Image
                        src={img}
                        alt={`${project.title} - View ${actualIdx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030712]/90 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-2 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded font-mono text-[10px] text-gray-300">
                        VIEW #{actualIdx + 1}
                      </div>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#38f2ff] text-xl">zoom_in</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* =========================================================================
            2. PROJECT SNAPSHOT DASHBOARD (#snapshot)
        ========================================================================= */}
        <section id="snapshot" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                  CORE SPECIFICATIONS
                </span>
                <h2 className="font-space font-bold text-3xl text-white">
                  Project Snapshot
                </h2>
              </div>
              <span className="font-mono text-xs text-gray-500">
                SYS_{(project.id || "").slice(0, 8).toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#080e1a]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 border-l-4 border-l-[#38f2ff] shadow-xl">
                <div className="text-gray-400 font-mono text-xs uppercase mb-1">
                  Source Code
                </div>
                <div className="text-white font-space font-bold text-xl sm:text-2xl">
                  {project.snapshot?.sourceCode || "100% Included"}
                </div>
              </div>

              <div className="bg-[#080e1a]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 border-l-4 border-l-[#38f2ff] shadow-xl">
                <div className="text-gray-400 font-mono text-xs uppercase mb-1">
                  Support
                </div>
                <div className="text-[#38f2ff] font-space font-bold text-xl sm:text-2xl">
                  {project.snapshot?.support || "6 Months"}
                </div>
              </div>

              <div className="bg-[#080e1a]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 border-l-4 border-l-[#38f2ff] shadow-xl">
                <div className="text-gray-400 font-mono text-xs uppercase mb-1">
                  Updates
                </div>
                <div className="text-emerald-400 font-space font-bold text-xl sm:text-2xl">
                  {project.snapshot?.updates || "Lifetime Free"}
                </div>
              </div>

              <div className="bg-[#080e1a]/90 backdrop-blur-xl p-6 rounded-2xl border border-white/10 border-l-4 border-l-[#38f2ff] shadow-xl">
                <div className="text-gray-400 font-mono text-xs uppercase mb-1">
                  Documentation
                </div>
                <div className="text-white font-space font-bold text-xl sm:text-2xl">
                  {project.snapshot?.documentation || "Comprehensive"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. UNDERSTANDING THE PRODUCT & STORY (#story)
        ========================================================================= */}
        <section id="story" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-6xl mx-auto">
            <div className="mb-10">
              <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                ENGINEERING RATIONALE
              </span>
              <h2 className="font-space font-bold text-3xl sm:text-4xl text-white">
                Understanding The Architecture
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Idea & Problem */}
              <div className="space-y-6">
                <div className="bg-[#080e1a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-lg bg-[#38f2ff]/10 text-[#38f2ff] flex items-center justify-center font-bold text-sm">
                      01
                    </span>
                    <h3 className="font-space text-2xl font-bold text-white">
                      The Idea
                    </h3>
                  </div>
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line">
                    {project.story?.idea || project.details}
                  </p>
                </div>

                <div className="bg-[#080e1a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-lg bg-red-400/10 text-red-400 flex items-center justify-center font-bold text-sm">
                      02
                    </span>
                    <h3 className="font-space text-2xl font-bold text-white">
                      The Problem
                    </h3>
                  </div>
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line">
                    {project.story?.problem}
                  </p>
                </div>
              </div>

              {/* Right Column: Solution & Value */}
              <div className="space-y-6">
                <div className="bg-[#080e1a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-lg bg-emerald-400/10 text-emerald-400 flex items-center justify-center font-bold text-sm">
                      03
                    </span>
                    <h3 className="font-space text-2xl font-bold text-white">
                      The Solution
                    </h3>
                  </div>
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line">
                    {project.story?.solution}
                  </p>
                </div>

                <div className="bg-[#080e1a]/80 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-lg bg-purple-400/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                      04
                    </span>
                    <h3 className="font-space text-2xl font-bold text-white">
                      The Engineering Value
                    </h3>
                  </div>
                  <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed whitespace-pre-line">
                    {project.story?.value}
                  </p>
                </div>
              </div>
            </div>

            {/* Product at a Glance 3-Card Strip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="bg-[#080e1a]/70 p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#38f2ff]/10 text-[#38f2ff] flex items-center justify-center text-xl flex-shrink-0">
                  <span className="material-symbols-outlined">update</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Current Build</div>
                  <div className="font-space text-lg font-bold text-white">{project.version}</div>
                </div>
              </div>

              <div className="bg-[#080e1a]/70 p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-xl flex-shrink-0">
                  <span className="material-symbols-outlined">architecture</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Core Stack</div>
                  <div className="font-space text-lg font-bold text-white">
                    {project.tools && project.tools.length > 0
                      ? project.tools.slice(0, 2).join(" & ")
                      : project.category}
                  </div>
                </div>
              </div>

              <div className="bg-[#080e1a]/70 p-6 rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center text-xl flex-shrink-0">
                  <span className="material-symbols-outlined">devices</span>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Target Ecosystem</div>
                  <div className="font-space text-lg font-bold text-white">{project.platform}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. LIVE YOUTUBE DEMO PLAYER SECTION (#demo)
        ========================================================================= */}
        <section id="demo" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
              <div>
                <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                  CINEMATIC RUNTIME
                </span>
                <h2 className="font-space font-bold text-3xl sm:text-4xl text-white">
                  Live System Demonstration
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Inspect the system running live with simulated real-world telemetry and workflows.
                </p>
              </div>

              {project.youtubeUrl && (
                <a
                  href={project.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 px-4 py-2 rounded-full border border-red-500/30 text-xs font-mono transition"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open on YouTube ↗
                </a>
              )}
            </div>

            {/* Embedded 16:9 YouTube Video Frame */}
            <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-[#38f2ff]/30 shadow-[0_0_80px_rgba(56,242,255,0.15)] bg-black">
              <iframe
                src={getYouTubeEmbedUrl(project.youtubeUrl)}
                title={`${project.title} Demonstration`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. TECH STACK & ARCHITECTURE (#tech-stack)
        ========================================================================= */}
        <section id="tech-stack" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 border-b border-white/10 pb-4">
              <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                COMPONENTS &amp; DEPENDENCIES
              </span>
              <h2 className="font-space font-bold text-3xl text-white">
                Engineered Tech Stack
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {(project.tools && project.tools.length > 0
                ? project.tools
                : [project.category, "TypeScript", "Node.js", "Tailwind CSS", "Firebase", "REST API"]
              ).map((tool, idx) => (
                <div
                  key={idx}
                  className="bg-[#080e1a]/90 backdrop-blur-xl px-5 py-3 rounded-xl border border-white/10 text-sm font-mono text-gray-200 flex items-center gap-2.5 hover:border-[#38f2ff]/50 transition-colors shadow-lg"
                >
                  <span className="w-2 h-2 rounded-full bg-[#38f2ff]" />
                  <span>{tool}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* =========================================================================
            6. INSTALLATION MANUAL (#installation)
        ========================================================================= */}
        <section id="installation" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                  DEVELOPER ONBOARDING
                </span>
                <h2 className="font-space font-bold text-3xl text-white">
                  Installation Manual &amp; Deployment
                </h2>
              </div>
              <button
                onClick={handleCopyInstallation}
                className="bg-white/10 hover:bg-white/20 text-white font-mono text-xs px-4 py-2 rounded-lg border border-white/10 transition flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  {copiedManual ? "check" : "content_copy"}
                </span>
                <span>{copiedManual ? "Copied!" : "Copy Manual"}</span>
              </button>
            </div>

            <div className="bg-[#050811] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="bg-[#0b101d] px-4 py-2.5 border-b border-white/5 flex items-center justify-between font-mono text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 text-gray-500">terminal — bash</span>
                </div>
                <span>INSTALL.md</span>
              </div>

              <pre className="p-6 font-mono text-xs sm:text-sm text-gray-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                {project.installation ||
                  `# 1. Clone repository\ngit clone https://github.com/devengine/${project.slug}.git\n\n# 2. Install dependencies\nnpm install\n\n# 3. Configure environment variables\ncp .env.example .env.local\n\n# 4. Start development server\nnpm run dev\n\n# 5. Production build\nnpm run build`}
              </pre>
            </div>
          </div>
        </section>

        {/* =========================================================================
            7. PRICING & INVENTORY (#pricing)
        ========================================================================= */}
        <section id="pricing" className="px-6 sm:px-12 md:px-20 py-20 scroll-mt-36">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-xs font-mono text-[#38f2ff] uppercase tracking-widest block mb-2">
                COMMERCIAL RIGHTS &amp; ACCESS
              </span>
              <h2 className="font-space font-bold text-4xl sm:text-5xl text-white">
                Pricing &amp; Inventory
              </h2>
            </div>

            <div className="bg-[#080e1a]/95 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 border border-[#38f2ff]/30 shadow-[0_0_60px_rgba(56,242,255,0.1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#38f2ff] text-black font-mono text-xs px-6 py-2 rounded-bl-xl font-bold uppercase tracking-wider">
                SPECIAL OFFER
              </div>

              {/* Top Row: Title + Multi-Currency Rate */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 border-b border-white/10 pb-8 mb-8">
                <div>
                  <h3 className="font-space font-bold text-2xl sm:text-3xl text-white">
                    Full Commercial License
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Complete production source code with unlimited distribution rights.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">
                    Available Rates
                  </div>
                  <PriceDisplay prices={projectPrices} size="lg" align="right" />
                </div>
              </div>

              {/* Included vs Not Included 2-Col Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#38f2ff] mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    What&apos;s Included
                  </h4>
                  <ul className="space-y-3 font-sans text-sm text-gray-300">
                    {(project.whatsIncluded || DEFAULT_WHATS_INCLUDED).map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-[#38f2ff] text-base flex-shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-gray-400 mb-4 border-b border-white/10 pb-2 flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    Not Included
                  </h4>
                  <ul className="space-y-3 font-sans text-sm text-gray-400/80">
                    {(project.notIncluded || DEFAULT_NOT_INCLUDED).map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-gray-500 text-base flex-shrink-0 mt-0.5">
                          cancel
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Purchase License CTA */}
              <button
                onClick={handleBuyClick}
                className="w-full bg-[#38f2ff] hover:bg-[#00e1f0] text-[#040812] font-sans font-bold text-base sm:text-lg py-4 rounded-xl sm:rounded-2xl transition shadow-[0_0_30px_rgba(56,242,255,0.4)] hover:scale-[1.01] flex items-center justify-center gap-2.5"
              >
                <span className="material-symbols-outlined text-2xl">shopping_cart</span>
                <span>Buy System License</span>
              </button>

              {showBuyAlert && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500 text-emerald-300 font-mono text-xs text-center animate-pulse">
                  ✓ Instant Cloud Access initiated. Contact our enterprise architect or proceed through invoice checkout.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* =========================================================================
            8. DYNAMIC FAQ ACCORDION (#faq)
        ========================================================================= */}
        <section id="faq" className="px-6 sm:px-12 md:px-20 py-16 scroll-mt-36">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <span className="text-[10px] font-mono text-[#38f2ff] uppercase tracking-widest block mb-1">
                KNOWLEDGE BASE
              </span>
              <h2 className="font-space font-bold text-3xl sm:text-4xl text-white">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-4">
              {(project.faqs || DEFAULT_FAQS).map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="bg-[#080e1a]/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transition shadow-lg"
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-6 text-left flex justify-between items-center gap-4 hover:text-[#38f2ff] transition-colors"
                    >
                      <span className="font-space font-bold text-base sm:text-lg text-white">
                        {faq.question}
                      </span>
                      <span className="material-symbols-outlined text-[#38f2ff] transition-transform duration-300">
                        {isOpen ? "expand_less" : "expand_more"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-6 text-sm text-gray-300 leading-relaxed font-sans border-t border-white/5 pt-4">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          STICKY BOTTOM COMMAND BAR (Appears on scroll)
      ========================================================================= */}
      <div
        className={`fixed bottom-0 w-full z-40 bg-[#080e1a]/95 backdrop-blur-2xl border-t border-[#38f2ff]/20 py-4 px-6 sm:px-12 md:px-20 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] transition-transform duration-500 ease-out ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-space text-lg font-bold text-white">
              {project.title}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase border border-emerald-500/30 font-bold">
              Ready for Deployment
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden sm:block">
              <PriceDisplay prices={projectPrices} size="sm" align="right" />
            </div>
            <button
              onClick={handleBuyClick}
              className="bg-[#38f2ff] hover:bg-[#00e1f0] text-[#040812] font-sans font-bold text-xs sm:text-sm px-6 py-2.5 rounded-full transition shadow-[0_0_20px_rgba(56,242,255,0.35)] hover:scale-105"
            >
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
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden border border-[#38f2ff]/40 shadow-[0_0_100px_rgba(56,242,255,0.2)]">
            <button
              onClick={() => setShowVideoModal(false)}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/70 text-white hover:text-[#38f2ff] flex items-center justify-center border border-white/20 transition"
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
              <span className="font-mono text-xs text-[#38f2ff] bg-[#38f2ff]/10 px-3 py-1 rounded-full border border-[#38f2ff]/30">
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
                className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-[#38f2ff]/60 flex items-center justify-center transition shadow-2xl cursor-pointer"
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
                className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 hover:border-[#38f2ff]/60 flex items-center justify-center transition shadow-2xl cursor-pointer"
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
                        ? "border-[#38f2ff] scale-105 shadow-[0_0_15px_rgba(56,242,255,0.4)]"
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
    </>
  );
}
