import React, { useEffect, useState } from "react";

// Left Side Designs (Dark/Tech/Web3/AI showcases)
const LEFT_SLIDES = [
  {
    id: "nexus",
    brand: "NEXUS",
    badge: "Web3 Trading Platform",
    titleLine1: "Build, Launch and",
    titleLine2: "Grow Your Product",
    gradientText: "from-cyan-400 via-sky-300 to-indigo-300",
    themeBg: "bg-[#0c1020]",
    border: "border-cyan-400/40",
    accent: "#2cecf7",
    metricsBadge: "+128% Growth",
    metricsIcon: "trending_up",
    glowColor: "from-cyan-500 via-indigo-600 to-fuchsia-500",
  },
  {
    id: "flowstack",
    brand: "FLOWSTACK",
    badge: "AI Analytics Engine",
    titleLine1: "Realtime Data &",
    titleLine2: "Predictive Models",
    gradientText: "from-emerald-400 via-teal-300 to-cyan-300",
    themeBg: "bg-[#080e1a]",
    border: "border-emerald-400/40",
    accent: "#34d399",
    metricsBadge: "99.98% Accuracy",
    metricsIcon: "auto_awesome",
    glowColor: "from-emerald-500 via-teal-600 to-cyan-500",
  },
  {
    id: "vortex",
    brand: "VORTEX",
    badge: "Cloud Infrastructure",
    titleLine1: "Deploy Globally in",
    titleLine2: "Sub-Millisecond Speed",
    gradientText: "from-purple-400 via-pink-300 to-indigo-300",
    themeBg: "bg-[#0a0c18]",
    border: "border-purple-400/40",
    accent: "#c084fc",
    metricsBadge: "12ms Global Latency",
    metricsIcon: "bolt",
    glowColor: "from-purple-500 via-pink-600 to-indigo-500",
  },
];

// Right Side Designs (Light/Clean/Modern SaaS & Fintech showcases)
const RIGHT_SLIDES = [
  {
    id: "teamly",
    brand: "Teamly",
    badge: "Collaborative Workspace",
    titleLine1: "SaaS Platform for",
    titleLine2: "Modern Teams",
    gradientText: "from-blue-600 via-sky-500 to-cyan-500",
    themeBg: "bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950",
    border: "border-slate-200/90 dark:border-slate-800",
    metricTitle: "Monthly MRR",
    metricValue: "+34.2%",
    metricSubtext: "2,400+ teams onboarded this week",
    statBadge: "24.8k Active",
    statIcon: "groups",
    chartColor: "text-sky-500",
  },
  {
    id: "finflow",
    brand: "FinFlow",
    badge: "Corporate Treasury",
    titleLine1: "Global Payments &",
    titleLine2: "Instant Liquidity",
    gradientText: "from-emerald-600 via-teal-500 to-cyan-600",
    themeBg: "bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950",
    border: "border-slate-200/90 dark:border-slate-800",
    metricTitle: "Treasury Volume",
    metricValue: "৳14.8M",
    metricSubtext: "Zero foreign exchange spread fees",
    statBadge: "Instant Settlement",
    statIcon: "account_balance_wallet",
    chartColor: "text-emerald-500",
  },
  {
    id: "northstar",
    brand: "Northstar",
    badge: "Creative Studio",
    titleLine1: "Award-Winning",
    titleLine2: "Brand Experience",
    gradientText: "from-slate-900 via-indigo-900 to-slate-800 dark:from-white dark:via-cyan-300 dark:to-slate-200",
    themeBg: "bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950",
    border: "border-slate-200/90 dark:border-slate-800",
    metricTitle: "Conversion Rate",
    metricValue: "8.4%",
    metricSubtext: "Rated Site of the Year 2026",
    statBadge: "Top Agency",
    statIcon: "military_tech",
    chartColor: "text-indigo-500",
  },
];

// Helper to render Left Card Content
function LeftCardFace({ slide }: { slide: typeof LEFT_SLIDES[0] }) {
  return (
    <div
      className={`w-full h-full rounded-[22px] ${slide.themeBg} ${slide.border} shadow-[0_30px_70px_-15px_rgba(2,12,30,0.55)] overflow-hidden flex flex-col p-4 backface-hidden`}
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(44,236,247,0.8)]"
            style={{ backgroundColor: slide.accent }}
          />
          <span className="font-extrabold text-[11px] text-white tracking-wider">{slide.brand}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>Features</span>
          <span>Pricing</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-bold border"
          style={{
            backgroundColor: `${slide.accent}20`,
            color: slide.accent,
            borderColor: `${slide.accent}40`,
          }}
        >
          Get Started
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center text-center py-2 relative">
        <span
          className="text-[9px] uppercase font-bold tracking-widest mb-0.5"
          style={{ color: slide.accent }}
        >
          {slide.badge}
        </span>
        <h4 className="text-xs xl:text-sm font-extrabold text-white leading-tight max-w-[210px]">
          {slide.titleLine1} <br />
          <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradientText}`}>
            {slide.titleLine2}
          </span>
        </h4>

        {/* Glowing Graphic */}
        <div className="relative my-2 w-24 h-10 flex items-center justify-center">
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${slide.glowColor} opacity-50 blur-md`} />
          <div className="relative w-14 h-9 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-600 to-purple-600 shadow-inner flex items-center justify-center border border-white/30">
            <span className="material-symbols-outlined text-white text-xs">{slide.metricsIcon}</span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-white text-[#02040a] text-[9px] font-bold shadow-md">
            Start Free
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 text-[9px] border border-slate-700">
            Watch Demo
          </span>
        </div>
      </div>

      {/* Floating Metrics Badge in corner */}
      <div className="absolute bottom-2.5 right-2.5 bg-slate-900/90 border border-slate-700 rounded-xl px-2 py-0.5 shadow-lg flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[9px] font-mono font-bold text-cyan-300">{slide.metricsBadge}</span>
      </div>
    </div>
  );
}

// Helper to render Right Card Content
function RightCardFace({ slide }: { slide: typeof RIGHT_SLIDES[0] }) {
  return (
    <div
      className={`w-full h-full rounded-[22px] ${slide.themeBg} ${slide.border} shadow-[0_30px_70px_-15px_rgba(15,35,80,0.2)] overflow-hidden flex flex-col p-4 backface-hidden`}
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]" />
          <span className="font-extrabold text-[11px] text-slate-900 dark:text-white tracking-wider">
            {slide.brand}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span>Dashboard</span>
          <span>Analytics</span>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[9px] font-bold border border-blue-200 dark:border-blue-800">
          Sign In
        </span>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col justify-center items-center text-center py-2 relative">
        <span className="text-[9px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400 mb-0.5">
          {slide.badge}
        </span>
        <h4 className="text-xs xl:text-sm font-extrabold text-slate-900 dark:text-white leading-tight max-w-[210px]">
          {slide.titleLine1} <br />
          <span className={`text-transparent bg-clip-text bg-gradient-to-r ${slide.gradientText}`}>
            {slide.titleLine2}
          </span>
        </h4>

        {/* Clean Dashboard Chart Mockup */}
        <div className="w-full max-w-[210px] bg-slate-50 dark:bg-slate-800/60 rounded-xl p-2 my-1.5 border border-slate-200/70 dark:border-slate-700/60 shadow-inner">
          <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
            <span>{slide.metricTitle}</span>
            <span className="font-bold text-emerald-600">{slide.metricValue}</span>
          </div>
          {/* SVG Wave Line */}
          <svg className={`w-full h-6 ${slide.chartColor}`} viewBox="0 0 100 28" fill="none">
            <path
              d="M0 22 C20 26, 30 8, 50 14 C70 20, 80 4, 100 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M0 22 C20 26, 30 8, 50 14 C70 20, 80 4, 100 6 L100 28 L0 28 Z"
              fill="currentColor"
              fillOpacity="0.1"
            />
          </svg>
        </div>

        {/* Mini Activity Tag */}
        <div className="text-[9px] text-slate-500 truncate max-w-[200px]">
          {slide.metricSubtext}
        </div>
      </div>

      {/* Floating Active Users Pill */}
      <div className="absolute bottom-2.5 left-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-0.5 shadow-md flex items-center gap-1.5">
        <span className="material-symbols-outlined text-xs text-blue-500">{slide.statIcon}</span>
        <span className="text-[9px] font-bold text-slate-700 dark:text-slate-200">{slide.statBadge}</span>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Left Mockup Fan: Book Page Swipe / Turn from the right spine
// ------------------------------------------------------------------
export function LeftHeroMockupFan() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [turningIdx, setTurningIdx] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      // Begin book page turn
      setTurningIdx(currentIdx);
      setTimeout(() => {
        setCurrentIdx((prev) => (prev + 1) % LEFT_SLIDES.length);
        setTurningIdx(null);
      }, 900);
    }, 4500);

    return () => clearInterval(timer);
  }, [currentIdx]);

  const nextIdx = (currentIdx + 1) % LEFT_SLIDES.length;

  return (
    <div className="relative w-[320px] xl:w-[380px] 2xl:w-[410px] h-[250px] xl:h-[285px] pointer-events-none select-none [perspective:1400px]">
      <style jsx>{`
        @keyframes bookPageTurnLeft {
          0% {
            transform: rotateY(0deg) rotateX(0deg) scale(1);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          }
          35% {
            transform: rotateY(45deg) rotateX(-4deg) scale(0.97) translateZ(30px);
            box-shadow: -15px 25px 50px rgba(0, 0, 0, 0.4);
          }
          70% {
            transform: rotateY(85deg) rotateX(-6deg) scale(0.93) translateZ(50px);
            opacity: 0.8;
          }
          100% {
            transform: rotateY(120deg) rotateX(-8deg) scale(0.88) translateZ(20px);
            opacity: 0;
          }
        }

        .book-page-flipping-left {
          transform-origin: right center;
          animation: bookPageTurnLeft 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes subtleFloatLeft {
          0%, 100% {
            transform: rotateY(16deg) rotateX(4deg) rotateZ(-4deg) translateY(0px);
          }
          50% {
            transform: rotateY(18deg) rotateX(5deg) rotateZ(-3.5deg) translateY(-8px);
          }
        }

        .book-wrapper-left {
          animation: subtleFloatLeft 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* Fan Background Layer 1 (Deepest) */}
      <div
        className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-white/10 to-white/5 dark:from-slate-800/30 dark:to-slate-900/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl"
        style={{
          transform: "rotateY(22deg) rotateX(6deg) rotateZ(-8deg) translateZ(-60px) translateX(-40px)",
          opacity: 0.35,
        }}
      />

      {/* Fan Background Layer 2 (Middle) */}
      <div
        className="absolute inset-0 rounded-[22px] bg-gradient-to-br from-white/20 to-white/10 dark:from-slate-800/40 dark:to-slate-900/60 backdrop-blur-md border border-white/50 dark:border-white/15 shadow-2xl"
        style={{
          transform: "rotateY(19deg) rotateX(5deg) rotateZ(-6deg) translateZ(-30px) translateX(-20px)",
          opacity: 0.6,
        }}
      />

      {/* Main Book Leaf Area */}
      <div className="book-wrapper-left absolute inset-0">
        {/* The Page Underneath (Next Page being revealed as top page swipes) */}
        <div className="absolute inset-0">
          <LeftCardFace slide={LEFT_SLIDES[turningIdx !== null ? nextIdx : currentIdx]} />
        </div>

        {/* The Turning Page (Swiping like a book page) */}
        {turningIdx !== null && (
          <div className="book-page-flipping-left absolute inset-0 z-20">
            <LeftCardFace slide={LEFT_SLIDES[turningIdx]} />
          </div>
        )}
      </div>

      {/* Book indicator dots */}
      <div className="absolute bottom-2.5 left-4 z-30 flex items-center gap-1">
        {LEFT_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIdx ? "w-3 bg-[#2cecf7]" : "w-1 bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Right Mockup Fan: Book Page Swipe / Turn from the left spine
// ------------------------------------------------------------------
export function RightHeroMockupFan() {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [turningIdx, setTurningIdx] = useState<number | null>(null);

  useEffect(() => {
    // Delay initial flip by 2.25s so left and right pages swipe at alternating times
    const initialDelay = setTimeout(() => {
      const timer = setInterval(() => {
        setTurningIdx(currentIdx);
        setTimeout(() => {
          setCurrentIdx((prev) => (prev + 1) % RIGHT_SLIDES.length);
          setTurningIdx(null);
        }, 900);
      }, 4500);

      return () => clearInterval(timer);
    }, 2250);

    return () => clearTimeout(initialDelay);
  }, [currentIdx]);

  const nextIdx = (currentIdx + 1) % RIGHT_SLIDES.length;

  return (
    <div className="relative w-[320px] xl:w-[380px] 2xl:w-[410px] h-[250px] xl:h-[285px] pointer-events-none select-none [perspective:1400px]">
      <style jsx>{`
        @keyframes bookPageTurnRight {
          0% {
            transform: rotateY(0deg) rotateX(0deg) scale(1);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          }
          35% {
            transform: rotateY(-45deg) rotateX(-4deg) scale(0.97) translateZ(30px);
            box-shadow: 15px 25px 50px rgba(0, 0, 0, 0.3);
          }
          70% {
            transform: rotateY(-85deg) rotateX(-6deg) scale(0.93) translateZ(50px);
            opacity: 0.8;
          }
          100% {
            transform: rotateY(-120deg) rotateX(-8deg) scale(0.88) translateZ(20px);
            opacity: 0;
          }
        }

        .book-page-flipping-right {
          transform-origin: left center;
          animation: bookPageTurnRight 0.9s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }

        @keyframes subtleFloatRight {
          0%, 100% {
            transform: rotateY(-16deg) rotateX(4deg) rotateZ(4deg) translateY(0px);
          }
          50% {
            transform: rotateY(-18deg) rotateX(5deg) rotateZ(3.5deg) translateY(-8px);
          }
        }

        .book-wrapper-right {
          animation: subtleFloatRight 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }
      `}</style>

      {/* Fan Background Layer 1 (Deepest) */}
      <div
        className="absolute inset-0 rounded-[22px] bg-gradient-to-bl from-white/20 to-white/5 dark:from-slate-800/30 dark:to-slate-900/40 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-xl"
        style={{
          transform: "rotateY(-22deg) rotateX(6deg) rotateZ(8deg) translateZ(-60px) translateX(40px)",
          opacity: 0.35,
        }}
      />

      {/* Fan Background Layer 2 (Middle) */}
      <div
        className="absolute inset-0 rounded-[22px] bg-gradient-to-bl from-white/30 to-white/10 dark:from-slate-800/40 dark:to-slate-900/60 backdrop-blur-md border border-white/50 dark:border-white/15 shadow-2xl"
        style={{
          transform: "rotateY(-19deg) rotateX(5deg) rotateZ(6deg) translateZ(-30px) translateX(20px)",
          opacity: 0.6,
        }}
      />

      {/* Main Book Leaf Area */}
      <div className="book-wrapper-right absolute inset-0">
        {/* The Page Underneath (Next Page being revealed as top page swipes) */}
        <div className="absolute inset-0">
          <RightCardFace slide={RIGHT_SLIDES[turningIdx !== null ? nextIdx : currentIdx]} />
        </div>

        {/* The Turning Page (Swiping like a book page) */}
        {turningIdx !== null && (
          <div className="book-page-flipping-right absolute inset-0 z-20">
            <RightCardFace slide={RIGHT_SLIDES[turningIdx]} />
          </div>
        )}
      </div>

      {/* Book indicator dots */}
      <div className="absolute bottom-2.5 right-4 z-30 flex items-center gap-1">
        {RIGHT_SLIDES.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === currentIdx ? "w-3 bg-blue-500" : "w-1 bg-slate-300 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
