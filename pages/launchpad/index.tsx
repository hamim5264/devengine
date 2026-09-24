import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";
import {
  LaunchpadConfig,
  LaunchpadFeaturedSlide,
  AppLabItem,
} from "@/types/launchpad";
import {
  getLaunchpadConfig,
  getAppLabApps,
  DEFAULT_LAUNCHPAD_CONFIG,
  getCleanAppThumbnail,
  DUMMY_APP_IMAGES,
} from "@/lib/services/launchpadService";

// Fallback sample apps in case database has no appLab entries yet
const FALLBACK_APPS: AppLabItem[] = [
  {
    id: "dialogix-ai",
    slug: "dialogix-ai",
    name: "Dialogix AI",
    subtitle: "Intelligent conversational AI assistant",
    version: "1.0.0",
    platform: "android",
    category: "AI",
    status: "LIVE",
    description:
      "A smart conversational AI assistant built with Flutter & Gemini. Context retention, voice inputs, and rapid streaming responses.",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "blume",
    slug: "blume",
    name: "Blume",
    subtitle: "Grow gently, every day.",
    version: "1.2.0",
    platform: "android",
    category: "Productivity",
    status: "BETA",
    description:
      "A premium plant tracking application featuring glassmorphism cards and vibrant metrics for mindful, daily botanical care.",
    images: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "snapcaption-ai",
    slug: "snapcaption-ai",
    name: "SnapCaption AI",
    subtitle: "Smart caption generator for creators.",
    version: "1.0.0",
    platform: "android",
    category: "Creative",
    status: "LIVE",
    description:
      "Smart caption generator designed for creators and professionals. Automatic multi-language translation and tone styling.",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "quizcrafter-pro",
    slug: "quizcrafter-pro",
    name: "QuizCrafter Pro",
    subtitle: "Adaptive quiz & testing engine.",
    version: "2.1.0",
    platform: "web",
    category: "Education",
    status: "BETA",
    description:
      "Modern interactive quiz platform with dynamic time trials, question randomization, and comprehensive knowledge analytics.",
    images: [
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
];

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "featured", label: "Featured" },
  { id: "apps", label: "Apps" },
  { id: "download", label: "Download" },
];

export default function LaunchpadPage() {
  const [config, setConfig] = useState<LaunchpadConfig>(() => {
    return getCachedData<LaunchpadConfig>("launchpad_config", DEFAULT_LAUNCHPAD_CONFIG);
  });
  const [appsList, setAppsList] = useState<AppLabItem[]>(() => {
    return getCachedData<AppLabItem[]>("launchpad_apps", []);
  });
  const [loading, setLoading] = useState(() => {
    const cachedConfig = getCachedData<LaunchpadConfig | null>("launchpad_config", null);
    const cachedApps = getCachedData<AppLabItem[] | null>("launchpad_apps", null);
    return !cachedConfig || cachedApps === null;
  });
  const [activeSection, setActiveSection] = useState("overview");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Modal alert state for custom messages
  const [modalData, setModalData] = useState<{
    open: boolean;
    title: string;
    message: string;
    type?: "info" | "success" | "warning";
  }>({
    open: false,
    title: "",
    message: "",
  });

  // App Preview Modal state
  const [previewApp, setPreviewApp] = useState<AppLabItem | null>(null);

  // Load configuration and apps
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [loadedConfig, loadedApps] = await Promise.all([
          getLaunchpadConfig(),
          getAppLabApps(),
        ]);
        if (mounted) {
          if (loadedConfig) {
            setConfig(loadedConfig);
            setCachedData("launchpad_config", loadedConfig);
          }
          setAppsList(loadedApps);
          setCachedData("launchpad_apps", loadedApps);
        }
      } catch (err) {
        console.error("Failed to load launchpad data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
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

  // Carousel handlers
  const slides = config.featuredSlides || [];
  const currentSlide: LaunchpadFeaturedSlide | undefined =
    slides[activeSlideIndex] || slides[0];

  const handlePrevSlide = () => {
    setActiveSlideIndex((prev) => (prev > 0 ? prev - 1 : slides.length - 1));
  };

  const handleNextSlide = () => {
    setActiveSlideIndex((prev) => (prev < slides.length - 1 ? prev + 1 : 0));
  };

  // Filtered Apps
  const filteredApps = useMemo(() => {
    if (selectedCategory === "All") return appsList;
    return appsList.filter(
      (app) =>
        (app.category || "").toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [appsList, selectedCategory]);

  const categories = useMemo(() => {
    const defaultCats = config.categories || [
      "All",
      "AI",
      "Productivity",
      "Education",
      "Creative",
    ];
    return Array.from(new Set(["All", ...defaultCats]));
  }, [config.categories]);

  // Button Action Handlers
  const handleGooglePlayClick = (slide: LaunchpadFeaturedSlide) => {
    if (slide.googlePlayUrl && slide.googlePlayUrl.trim()) {
      window.open(slide.googlePlayUrl, "_blank", "noopener,noreferrer");
    } else {
      setModalData({
        open: true,
        title: "Google Play Store Notice",
        message:
          slide.googlePlayMessage ||
          `${slide.title} is currently under Google Play internal testing. Public release is coming soon!`,
        type: "info",
      });
    }
  };

  const handleAppStoreClick = (slide: LaunchpadFeaturedSlide) => {
    if (slide.appStoreUrl && slide.appStoreUrl.trim()) {
      window.open(slide.appStoreUrl, "_blank", "noopener,noreferrer");
    } else {
      setModalData({
        open: true,
        title: "Apple App Store Notice",
        message:
          slide.appStoreMessage ||
          `${slide.title} iOS build is currently in Apple TestFlight certification. Coming soon to App Store!`,
        type: "info",
      });
    }
  };

  const handleDevEngineGooglePlay = () => {
    setModalData({
      open: true,
      title: "DevEngine Mobile App — Google Play",
      message:
        config.mobileAppSection.googlePlayMessage ||
        "DevEngine Mobile App for Android is currently in private closed alpha. Public launch is scheduled for Q4 2026.",
      type: "info",
    });
  };

  const handleDevEngineAppStore = () => {
    setModalData({
      open: true,
      title: "DevEngine Mobile App — App Store",
      message:
        config.mobileAppSection.appStoreMessage ||
        "DevEngine Mobile App for iOS is undergoing internal TestFlight testing. Official release is scheduled for Q4 2026.",
      type: "info",
    });
  };

  const handleOpenAppPreview = (app: AppLabItem) => {
    setPreviewApp(app);
  };

  const handleDownloadApk = (app: AppLabItem) => {
    if (app.apkUrl && app.apkUrl.trim()) {
      window.open(app.apkUrl, "_blank", "noopener,noreferrer");
    } else {
      setModalData({
        open: true,
        title: "Download APK Notice",
        message: `APK build for ${app.name} is currently compiling on our CI/CD pipeline. Please check back shortly!`,
        type: "info",
      });
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#030712] z-50 flex items-center justify-center">
        <HelixLoader size={56} color="#38f2ff" text="LOADING DEVENGINE LAUNCHPAD..." />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>DevEngine Launchpad | Early Access Experimental Showroom</title>
        <meta
          name="description"
          content={config.overview.subtitle}
        />
      </Head>

      {/* Global Dark Canvas & Cyber Grid Background */}
      <div className="fixed inset-0 bg-[#080e1a] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(14,19,31,0.95)_0%,rgba(3,7,18,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] z-[-8] pointer-events-none opacity-50" />

      {/* Ambient Glow Orbs */}
      <div className="fixed top-0 left-1/4 w-[700px] h-[700px] bg-[#38f2ff]/5 rounded-full blur-[140px] pointer-events-none z-[-7]" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-[#3495ea]/5 rounded-full blur-[140px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      {/* Sticky Secondary Sub-Navigation */}
      <div className="sticky top-[72px] z-40 w-full bg-[#080e1a]/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 py-3.5 flex justify-center gap-8 sm:gap-12 overflow-x-auto scrollbar-hide">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => scrollToSection(sec.id)}
              className={`font-jetbrains text-xs uppercase tracking-wider relative transition-all whitespace-nowrap pb-1 ${
                activeSection === sec.id
                  ? "text-[#38f2ff] font-bold drop-shadow-[0_0_8px_rgba(56,242,255,0.6)]"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {sec.label}
              {activeSection === sec.id && (
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#38f2ff] shadow-[0_0_10px_rgba(56,242,255,0.8)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="relative z-10 w-full text-[#dde2f3] font-sans selection:bg-[#38f2ff] selection:text-[#030712]">
        {/* ═════════════════════════════════════════════════════════════════
            SECTION 1: OVERVIEW & ADVERTISE DEVICE STAGE
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="overview"
          className="pt-28 sm:pt-36 pb-24 mt-4 sm:mt-6 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto flex flex-col items-center text-center scroll-mt-36"
        >
          {/* Top Pill Badge */}
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/25 mb-8 shadow-[0_0_15px_rgba(56,242,255,0.1)]">
            <span className="font-jetbrains text-[11px] text-[#38f2ff] uppercase tracking-widest font-bold">
              {config.overview.badgeText}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl text-white mb-6 leading-tight tracking-tight">
            {config.overview.title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38f2ff] via-[#00dbe8] to-[#3495ea] drop-shadow-[0_0_35px_rgba(56,242,255,0.35)]">
              {config.overview.titleHighlight}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-base sm:text-lg text-[#849495] max-w-2xl mb-14 leading-relaxed">
            {config.overview.subtitle}
          </p>

          {/* 3D Device Stage (Advertise Section) */}
          <div className="relative w-full max-w-5xl h-[520px] sm:h-[600px] bg-[#0e131f]/70 backdrop-blur-2xl rounded-3xl flex items-center justify-center overflow-hidden border border-white/10 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            {/* Background gradient fade */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#080e1a]/95 pointer-events-none" />

            <div className="relative z-10 flex gap-4 sm:gap-8 items-end justify-center w-full px-4 perspective-[1000px]">
              {/* Left Device Mockup */}
              <div className="w-48 sm:w-64 h-[380px] sm:h-[480px] bg-[#161c28] rounded-[28px] border-[5px] border-[#242a36] shadow-2xl relative overflow-hidden transform lg:rotate-y-[12deg] lg:rotate-x-[4deg] transition-all duration-700 hover:rotate-0 group">
                <Image
                  src={
                    config.overview.stage.leftImage ||
                    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                  }
                  alt={config.overview.stage.leftCaption || "Left Mockup"}
                  fill
                  className="object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  unoptimized
                />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />
                {config.overview.stage.leftCaption && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md rounded-lg py-1.5 px-2.5 text-center font-jetbrains text-[10px] text-gray-300">
                    {config.overview.stage.leftCaption}
                  </div>
                )}
              </div>

              {/* Center Device Mockup (Elevated Hero) */}
              <div className="w-56 sm:w-72 h-[430px] sm:h-[540px] bg-[#161c28] rounded-[32px] border-[6px] border-[#38f2ff]/40 shadow-[0_0_50px_rgba(56,242,255,0.25)] relative overflow-hidden z-20 transform scale-105 hover:scale-110 transition-transform duration-500 group">
                <Image
                  src={
                    config.overview.stage.centerImage ||
                    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"
                  }
                  alt={config.overview.stage.centerCaption || "Center Mockup"}
                  fill
                  className="object-cover"
                  unoptimized
                  priority
                />
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30" />
                {config.overview.stage.centerCaption && (
                  <div className="absolute bottom-4 left-4 right-4 bg-[#080e1a]/85 backdrop-blur-md rounded-xl py-2 px-3 text-center font-jetbrains text-[11px] text-[#38f2ff] font-bold border border-[#38f2ff]/30 shadow-lg">
                    {config.overview.stage.centerCaption}
                  </div>
                )}
              </div>

              {/* Right Device Mockup */}
              <div className="w-48 sm:w-64 h-[380px] sm:h-[480px] bg-[#161c28] rounded-[28px] border-[5px] border-[#242a36] shadow-2xl relative overflow-hidden transform lg:-rotate-y-[12deg] lg:rotate-x-[4deg] transition-all duration-700 hover:rotate-0 group">
                <Image
                  src={
                    config.overview.stage.rightImage ||
                    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop"
                  }
                  alt={config.overview.stage.rightCaption || "Right Mockup"}
                  fill
                  className="object-cover opacity-85 group-hover:opacity-100 transition-opacity"
                  unoptimized
                />
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />
                {config.overview.stage.rightCaption && (
                  <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md rounded-lg py-1.5 px-2.5 text-center font-jetbrains text-[10px] text-gray-300">
                    {config.overview.stage.rightCaption}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 2: FEATURED SHOWCASE CAROUSEL (APPSTORE & PLAYSTORE)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="featured"
          className="w-full py-24 border-y border-white/10 bg-gradient-to-b from-[#080e1a] via-[#0e131f] to-[#080e1a] scroll-mt-36 relative overflow-hidden"
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-12 md:px-20 relative z-10">
            {/* Section Header */}
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 mb-3">
                <span className="w-6 h-[2px] bg-[#38f2ff]" />
                <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                  Live Mobile Projects
                </span>
                <span className="w-6 h-[2px] bg-[#38f2ff]" />
              </div>
              <h2 className="font-space font-bold text-3xl sm:text-5xl text-white mb-4 tracking-tight">
                Featured Showcase
              </h2>
              <p className="font-sans text-sm sm:text-base text-[#849495] max-w-2xl mx-auto">
                Explore our spotlighted experimental builds. High-fidelity cinematic experiences available for direct store installation.
              </p>
            </div>

            {/* Cinematic Slide Card */}
            {currentSlide && (
              <div className="relative max-w-5xl mx-auto bg-[#0e131f]/90 backdrop-blur-2xl rounded-3xl border-2 border-[#38f2ff]/30 shadow-[0_0_60px_rgba(56,242,255,0.12)] p-6 sm:p-10 md:p-12 transition-all duration-500 overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Details & Buttons */}
                  <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
                    {/* Badges */}
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 bg-[#38f2ff]/10 border border-[#38f2ff]/30 rounded-full font-jetbrains text-[10px] text-[#38f2ff] uppercase tracking-widest font-bold">
                        {currentSlide.version || "v1.0.0"}
                      </span>
                      <span className="px-3 py-1 bg-[#161c28] border border-white/10 rounded-full font-jetbrains text-[10px] text-white flex items-center gap-1.5 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {currentSlide.status || "LIVE"}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="font-space font-bold text-3xl sm:text-4xl text-white tracking-tight leading-tight mb-2">
                        {currentSlide.title}
                      </h3>
                      <p className="font-sans text-base text-[#38f2ff] font-medium">
                        {currentSlide.subtitle}
                      </p>
                    </div>

                    {/* Description */}
                    <p className="font-sans text-sm sm:text-base text-[#849495] leading-relaxed">
                      {currentSlide.description}
                    </p>

                    {/* Store Action Buttons (Google Play & App Store) */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-2">
                      {/* 1. Google Play Button - White Color */}
                      <button
                        onClick={() => handleGooglePlayClick(currentSlide)}
                        className="bg-white hover:bg-gray-100 text-[#030712] font-sans font-bold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 rounded-xl shadow-[0_0_25px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center gap-3 cursor-pointer group whitespace-nowrap shrink-0"
                      >
                        <img
                          src="/assets/playstore.png"
                          alt="Google Play"
                          className="w-5 h-5 object-contain shrink-0"
                        />
                        <span className="whitespace-nowrap">Get it on Google Play</span>
                      </button>

                      {/* 2. App Store Button */}
                      <button
                        onClick={() => handleAppStoreClick(currentSlide)}
                        className="bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-wider px-7 py-3.5 rounded-xl border border-white/15 hover:border-[#38f2ff]/40 transition-all flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <img
                          src="/assets/appstore.png"
                          alt="Apple App Store"
                          className="w-5 h-5 object-contain shrink-0"
                        />
                        <span className="whitespace-nowrap">Get it on App Store</span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: 3D Phone Mockup */}
                  <div className="lg:col-span-5 flex justify-center items-center">
                    <div className="relative w-[240px] sm:w-[260px] h-[460px] sm:h-[500px] bg-[#161c28] rounded-[36px] border-[6px] border-[#242a36] shadow-2xl overflow-hidden group hover:border-[#38f2ff]/50 transition-all duration-500">
                      {/* Notch */}
                      <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30" />
                      <Image
                        src={
                          currentSlide.phoneImage ||
                          "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                        }
                        alt={currentSlide.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        unoptimized
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Carousel Navigation Controls */}
            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-6 mt-10">
                <button
                  onClick={handlePrevSlide}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-[#38f2ff]/20 text-[#38f2ff] border border-white/10 hover:border-[#38f2ff]/40 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                  aria-label="Previous Slide"
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>

                {/* Dots */}
                <div className="flex items-center gap-2.5">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveSlideIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeSlideIndex === idx
                          ? "w-8 bg-[#38f2ff] shadow-[0_0_10px_rgba(56,242,255,0.7)]"
                          : "w-2 bg-white/20 hover:bg-white/40"
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNextSlide}
                  className="w-12 h-12 rounded-full bg-white/5 hover:bg-[#38f2ff]/20 text-[#38f2ff] border border-white/10 hover:border-[#38f2ff]/40 flex items-center justify-center transition-all cursor-pointer shadow-lg"
                  aria-label="Next Slide"
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 3: APP COLLECTION (OLD APP LAB APPS)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="apps"
          className="py-24 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto scroll-mt-36"
        >
          {/* Header & Filter Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-white/10 pb-6 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-4 h-[2px] bg-[#38f2ff]" />
                <span className="font-jetbrains text-xs text-[#38f2ff] uppercase tracking-widest font-bold">
                  Repository Catalog
                </span>
              </div>
              <h2 className="font-space font-bold text-3xl sm:text-4xl text-white tracking-tight">
                App Collection
              </h2>
              <p className="font-sans text-sm text-[#849495] mt-1">
                Explore early-access applications, test features, and download builds.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full font-jetbrains text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-[#38f2ff] text-[#030712] font-bold shadow-[0_0_15px_rgba(56,242,255,0.4)]"
                      : "bg-[#161c28] text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Apps Content: Cards Grid OR Big Icon with Formal Waiting State */}
          {filteredApps.length === 0 ? (
            <div className="relative max-w-4xl mx-auto rounded-3xl bg-gradient-to-b from-[#0e131f]/95 via-[#0a0f1d]/95 to-[#070b14]/95 border border-white/[0.08] backdrop-blur-2xl p-8 sm:p-14 text-center overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)]">
              {/* Background ambient glow inside card */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#38f2ff]/10 rounded-full blur-[100px] pointer-events-none" />
              <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#3495ea]/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-6">
                {/* Big Futuristic Icon Container with Glow */}
                <div className="relative">
                  {/* Outer pulse ring */}
                  <div className="absolute inset-0 rounded-3xl bg-[#38f2ff]/20 blur-xl animate-pulse" />
                  
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-[#121927] border-2 border-[#38f2ff]/40 flex items-center justify-center shadow-[0_0_40px_rgba(56,242,255,0.25)] group">
                    <svg
                      className="w-12 h-12 sm:w-14 sm:h-14 text-[#38f2ff] drop-shadow-[0_0_12px_rgba(56,242,255,0.8)]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff] font-jetbrains text-[11px] font-bold tracking-widest uppercase">
                  <span className="w-2 h-2 rounded-full bg-[#38f2ff] animate-ping" />
                  <span>Catalog In Staging</span>
                </div>

                {/* Formal Heading */}
                <div className="space-y-2">
                  <h3 className="font-space font-bold text-2xl sm:text-3xl text-white tracking-tight">
                    {selectedCategory === "All"
                      ? "Upcoming Applications in Staging"
                      : `No Applications Under "${selectedCategory}"`}
                  </h3>
                  <p className="font-jetbrains text-xs text-[#38f2ff]/80 uppercase tracking-widest">
                    Pipeline Compilation &amp; Release Review Active
                  </p>
                </div>

                {/* Formal Waiting Message */}
                <p className="font-sans text-sm sm:text-base text-gray-300 leading-relaxed max-w-xl">
                  {selectedCategory === "All"
                    ? "Our engineering and product teams are currently packaging, auditing, and staging the next batch of production builds for this catalog. All applications undergo comprehensive security screening and QA testing before public distribution."
                    : `There are currently no active applications deployed under the ${selectedCategory} category. You can view all experimental applications or check back shortly as new builds are published.`}
                </p>

                {/* Formal Meta Info Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-2 text-left">
                  <div className="bg-[#121927]/80 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] font-jetbrains uppercase text-gray-400">Release Status</div>
                    <div className="text-xs font-mono text-emerald-400 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Auditing In Progress
                    </div>
                  </div>
                  <div className="bg-[#121927]/80 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] font-jetbrains uppercase text-gray-400">Target Platforms</div>
                    <div className="text-xs font-mono text-white font-semibold mt-0.5">
                      Android APK &amp; Web
                    </div>
                  </div>
                  <div className="bg-[#121927]/80 border border-white/5 rounded-xl p-3">
                    <div className="text-[10px] font-jetbrains uppercase text-gray-400">Access Tier</div>
                    <div className="text-xs font-mono text-[#38f2ff] font-semibold mt-0.5">
                      Free Early Access
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                  {selectedCategory !== "All" && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("All")}
                      className="px-5 py-2.5 rounded-xl bg-[#38f2ff] hover:bg-[#00dbe8] text-black font-sans font-bold text-xs uppercase tracking-wider transition shadow-[0_0_20px_rgba(56,242,255,0.3)] cursor-pointer"
                    >
                      Show All Categories
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => scrollToSection("featured")}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-sans font-bold text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2"
                  >
                    <span>View Featured Builds</span>
                    <svg className="w-3.5 h-3.5 text-[#38f2ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredApps.map((app) => (
                <div
                  key={app.id || app.slug}
                  className="bg-[#0e131f]/80 backdrop-blur-xl rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 border border-white/10 hover:border-[#38f2ff]/40 shadow-xl hover:shadow-[0_0_30px_rgba(56,242,255,0.1)] transition-all duration-300 group min-w-0 overflow-hidden"
                >
                  {/* App Preview Image / Thumbnail (With Guaranteed Fallback & No Robot Icon) */}
                  <div className="w-full sm:w-[170px] h-[220px] bg-[#161c28] rounded-xl border border-white/10 overflow-hidden relative shrink-0">
                    <img
                      src={getCleanAppThumbnail(app)}
                      alt={app.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DUMMY_APP_IMAGES.default;
                      }}
                    />
                  </div>

                  {/* App Info & Action Buttons */}
                  <div className="flex flex-col justify-between w-full py-1 min-w-0">
                    <div>
                      {/* Title and Category */}
                      <div className="flex items-start justify-between mb-2">
                        <Link
                          href={`/app-lab/${app.slug}`}
                          className="font-space font-bold text-xl text-white hover:text-[#38f2ff] transition-colors truncate block"
                        >
                          {app.name}
                        </Link>
                      </div>

                      {/* Version & Status Chips */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-[#161c28] border border-white/10 rounded font-jetbrains text-[10px] text-gray-300">
                          v{app.version || "1.0.0"}
                        </span>
                        <span className="px-2 py-0.5 bg-[#38f2ff]/10 border border-[#38f2ff]/30 rounded font-jetbrains text-[10px] text-[#38f2ff] font-bold">
                          {app.status || "LIVE"}
                        </span>
                        {app.category && (
                          <span className="px-2 py-0.5 bg-white/5 border border-white/5 rounded font-jetbrains text-[10px] text-gray-400">
                            {app.category}
                          </span>
                        )}
                      </div>

                      <p className="font-sans text-xs sm:text-sm text-[#849495] line-clamp-3 mb-4 leading-relaxed">
                        {app.subtitle || app.description}
                      </p>
                    </div>

                    {/* 2 Action Buttons: Responsive grid layout so buttons NEVER overflow card */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pt-2 w-full">
                      <button
                        onClick={() => handleOpenAppPreview(app)}
                        className="bg-[#161c28] hover:bg-[#242a36] text-white border border-white/10 hover:border-[#38f2ff]/40 w-full py-2.5 px-2 rounded-xl font-sans text-xs uppercase tracking-wide inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold group/btn min-w-0"
                      >
                        <svg
                          className="w-4 h-4 shrink-0 text-gray-300 group-hover/btn:text-[#38f2ff] transition-colors"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                        <span className="truncate">Open Preview</span>
                      </button>

                      <button
                        onClick={() => handleDownloadApk(app)}
                        className="bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] w-full py-2.5 px-2 rounded-xl font-sans text-xs uppercase tracking-wide inline-flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(56,242,255,0.25)] transition-all cursor-pointer font-bold min-w-0"
                      >
                        <svg
                          className="w-4 h-4 shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        <span className="truncate">Download APK</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 4: DEVENGINE MOBILE APP (NOT LIVE YET — CUSTOM ADMIN MSG)
        ═════════════════════════════════════════════════════════════════ */}
        <section
          id="download"
          className="py-24 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto scroll-mt-36"
        >
          <div className="bg-[#0e131f]/90 backdrop-blur-2xl rounded-3xl p-8 sm:p-12 md:p-16 border border-[#38f2ff]/25 relative overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
              {/* Left Column: Mobile App Narrative */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#38f2ff]/10 border border-[#38f2ff]/30">
                  <span className="font-jetbrains text-[10px] text-[#38f2ff] uppercase tracking-widest font-bold">
                    {config.mobileAppSection.badgeText}
                  </span>
                </div>

                <h2 className="font-space font-bold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
                  {config.mobileAppSection.title} <br />
                  <span className="text-[#38f2ff] drop-shadow-[0_0_25px_rgba(56,242,255,0.4)]">
                    {config.mobileAppSection.titleHighlight}
                  </span>
                </h2>

                <p className="font-sans text-sm sm:text-base text-[#849495] max-w-xl leading-relaxed">
                  {config.mobileAppSection.subtitle}
                </p>

                {/* Download Actions for DevEngine App (Single Line Buttons) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4 flex-wrap">
                  {/* Google Play Button -> White Color & Strict Single Line */}
                  <button
                    onClick={handleDevEngineGooglePlay}
                    className="w-full sm:w-auto bg-white hover:bg-gray-100 text-[#030712] font-sans font-bold text-xs sm:text-sm uppercase tracking-wide px-6 sm:px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <img
                      src="/assets/playstore.png"
                      alt="Google Play"
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                    />
                    <span className="whitespace-nowrap">Download on Google Play</span>
                  </button>

                  {/* App Store Button -> Strict Single Line */}
                  <button
                    onClick={handleDevEngineAppStore}
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/15 text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-wide px-6 sm:px-8 py-4 rounded-2xl border border-white/15 hover:border-[#38f2ff]/40 transition-all flex items-center justify-center gap-3 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <img
                      src="/assets/appstore.png"
                      alt="Apple App Store"
                      className="w-5 h-5 sm:w-6 sm:h-6 object-contain shrink-0"
                    />
                    <span className="whitespace-nowrap">Download on App Store</span>
                  </button>
                </div>

                <p className="font-jetbrains text-[10px] text-gray-400 tracking-wider">
                  {config.mobileAppSection.versionInfo}
                </p>
              </div>

              {/* Right Column: Floating Device Mockup Stack */}
              <div className="lg:col-span-5 h-[420px] sm:h-[480px] relative flex items-center justify-center perspective-[1000px]">
                {/* Back Card Desktop Silhouette */}
                <div className="absolute w-[85%] h-[260px] bg-[#161c28] rounded-2xl border border-white/10 shadow-2xl overflow-hidden transform -translate-y-10 -translate-x-6 opacity-40 blur-[1px]" />

                {/* Main Front Phone */}
                <div className="absolute w-[220px] sm:w-[240px] h-[420px] sm:h-[460px] bg-[#161c28] rounded-[36px] border-[6px] border-[#080e1a] shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden z-20 transform hover:-translate-y-2 transition-transform duration-500">
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-black rounded-full z-30" />
                  <Image
                    src={
                      config.mobileAppSection.mainPhoneImage ||
                      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
                    }
                    alt="DevEngine Mobile Main Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                {/* Secondary Offset Phone */}
                <div className="absolute w-[180px] sm:w-[200px] h-[360px] sm:h-[390px] bg-[#161c28] rounded-[30px] border-[5px] border-[#080e1a] shadow-xl overflow-hidden z-10 transform translate-x-24 sm:translate-x-28 translate-y-6 lg:rotate-y-[12deg] opacity-80">
                  <Image
                    src={
                      config.mobileAppSection.secondaryPhoneImage ||
                      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop"
                    }
                    alt="DevEngine Mobile Secondary Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            SECTION 5: STORE BANNER
        ═════════════════════════════════════════════════════════════════ */}
        <section className="py-12 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-[#0e131f] to-[#161c28] rounded-3xl p-8 sm:p-12 border border-[#38f2ff]/20 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-center lg:text-left">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 flex items-center justify-center shadow-lg shrink-0 p-3">
                  <img
                    src="/assets/playstore.png"
                    alt="Google Play"
                    className="w-12 h-12 object-contain shrink-0"
                  />
                </div>
                <div>
                  <h3 className="font-space font-bold text-2xl text-white mb-2">
                    {config.storeBanner.headline}
                  </h3>
                  <p className="font-sans text-sm text-[#849495] max-w-xl">
                    {config.storeBanner.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  const targetUrl =
                    config.storeBanner.buttonUrl ||
                    "https://play.google.com/store/apps/dev?id=7519161405604508020";
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                className="bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] font-sans font-bold text-sm uppercase tracking-wider px-8 py-4 rounded-xl shadow-[0_0_25px_rgba(56,242,255,0.3)] hover:shadow-[0_0_40px_rgba(56,242,255,0.5)] transition-all shrink-0 cursor-pointer"
              >
                {config.storeBanner.buttonText}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Cyber Notice Modal Dialog */}
      {modalData.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e131f] border-2 border-[#38f2ff]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-[0_0_50px_rgba(56,242,255,0.25)] relative text-center">
            {/* Modal Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#38f2ff]/10 border border-[#38f2ff]/30 text-[#38f2ff] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="material-symbols-outlined text-2xl">info</span>
            </div>

            <h3 className="font-space font-bold text-xl text-white mb-3">
              {modalData.title}
            </h3>

            <p className="font-sans text-sm text-[#849495] leading-relaxed mb-6">
              {modalData.message}
            </p>

            <button
              onClick={() => setModalData({ open: false, title: "", message: "" })}
              className="w-full bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] font-sans font-bold text-sm uppercase tracking-wider py-3.5 rounded-xl shadow-[0_0_20px_rgba(56,242,255,0.3)] transition-all cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </div>
      )}

      {/* Interactive App Preview Modal */}
      {previewApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e131f] border border-[#38f2ff]/30 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-[0_0_60px_rgba(56,242,255,0.25)] relative max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setPreviewApp(null)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* App Image */}
              <div className="w-full md:w-[220px] h-[280px] bg-[#161c28] rounded-2xl overflow-hidden border border-white/10 shrink-0 relative">
                <img
                  src={getCleanAppThumbnail(previewApp)}
                  alt={previewApp.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DUMMY_APP_IMAGES.default;
                  }}
                />
              </div>

              {/* App Details */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-[#38f2ff]/10 border border-[#38f2ff]/30 rounded-full font-jetbrains text-[10px] text-[#38f2ff] font-bold">
                      {previewApp.status || "LIVE"}
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full font-jetbrains text-[10px] text-gray-400">
                      v{previewApp.version || "1.0.0"}
                    </span>
                    {previewApp.category && (
                      <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full font-jetbrains text-[10px] text-gray-400">
                        {previewApp.category}
                      </span>
                    )}
                  </div>

                  <h3 className="font-space font-bold text-2xl sm:text-3xl text-white mb-1">
                    {previewApp.name}
                  </h3>
                  <p className="font-sans text-xs sm:text-sm text-[#38f2ff] mb-4">
                    {previewApp.subtitle}
                  </p>
                  <p className="font-sans text-xs sm:text-sm text-[#849495] leading-relaxed mb-6">
                    {previewApp.description}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
                  <button
                    onClick={() => handleDownloadApk(previewApp)}
                    className="flex-1 bg-[#38f2ff] hover:bg-[#00dbe8] text-[#030712] font-jetbrains text-xs uppercase tracking-wider font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(56,242,255,0.3)] transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download APK Build
                  </button>

                  <Link
                    href={`/app-lab/${previewApp.slug}`}
                    className="px-5 bg-white/10 hover:bg-white/15 text-white font-jetbrains text-xs uppercase tracking-wider font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-white/15 hover:border-[#38f2ff]/40 transition text-center"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LandingFooter />
    </>
  );
}
