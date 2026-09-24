import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import devKittyAnimationData from "@/assets/DevKitty.json";

export default function DevKittyFloatingButton() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const animInstanceRef = useRef<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Exclude admin pages from showing DevKitty
  const isAdminRoute = router.pathname.startsWith("/admin");

  // Periodic speech bubble: shows for 3s, hides for 5s, repeats
  useEffect(() => {
    if (isAdminRoute) return;

    let timeoutId: NodeJS.Timeout;
    let isMounted = true;

    const cycle = () => {
      if (!isMounted) return;
      setShowPill(true);

      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setShowPill(false);

        timeoutId = setTimeout(() => {
          if (!isMounted) return;
          cycle();
        }, 5000);
      }, 3000);
    };

    // First appearance after initial 2 seconds
    const initialTimer = setTimeout(() => {
      cycle();
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearTimeout(timeoutId);
    };
  }, [isAdminRoute]);

  // Load Lottie animation safely on client
  useEffect(() => {
    if (isAdminRoute) return;

    let isMounted = true;

    // Dynamically load lottie-web on client
    import("lottie-web").then((lottieModule) => {
      if (!isMounted || !containerRef.current) return;
      const lottie = lottieModule.default || lottieModule;

      try {
        if (animInstanceRef.current) {
          animInstanceRef.current.destroy();
        }

        containerRef.current.innerHTML = "";

        animInstanceRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: devKittyAnimationData,
        });
      } catch (err) {
        console.warn("DevKitty animation initialization warning:", err);
      }
    });

    return () => {
      isMounted = false;
      if (animInstanceRef.current) {
        animInstanceRef.current.destroy();
        animInstanceRef.current = null;
      }
    };
  }, [isAdminRoute]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  if (isAdminRoute) {
    return null;
  }

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end select-none">
      {/* ═════════════════════════════════════════════════════════════════
          DEVKITTY INTERACTIVE SPEECH POPOVER (FORMAL COMING SOON MESSAGE)
      ═════════════════════════════════════════════════════════════════ */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="DevKitty AI Assistant Notice"
          className="mb-3 w-[340px] sm:w-[380px] bg-[#0c1220]/95 backdrop-blur-2xl border border-[#38f2ff]/30 rounded-3xl p-5 sm:p-6 shadow-[0_15px_60px_rgba(0,0,0,0.8),0_0_30px_rgba(56,242,255,0.2)] animate-in fade-in zoom-in-95 duration-200 relative overflow-hidden"
        >
          {/* Ambient Glow Orbs inside Popover */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#38f2ff]/15 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#38f2ff] to-[#6366f1] p-[1.5px] shadow-sm">
                <div className="w-full h-full rounded-full bg-[#080e1a] flex items-center justify-center text-xs">
                  🐱
                </div>
              </div>
              <div>
                <h4 className="font-space font-bold text-sm text-white flex items-center gap-1.5 leading-none">
                  <span>DevKitty AI</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </h4>
                <p className="font-mono text-[10px] text-[#38f2ff] mt-0.5 tracking-wider uppercase">
                  Future DevEngine ChatBot
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close dialog"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body Content */}
          <div className="py-4 space-y-3 relative z-10">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#38f2ff]/10 via-[#6366f1]/10 to-transparent border border-[#38f2ff]/20">
              <p className="font-sans font-semibold text-sm text-white leading-snug">
                &ldquo;Heyyy, kitty I&apos;m coming soon!&rdquo; 🐾✨
              </p>
            </div>

            <p className="font-sans text-xs sm:text-sm text-gray-300 leading-relaxed">
              I am <span className="text-[#38f2ff] font-semibold">DevKitty</span>, the upcoming autonomous AI intelligence engineered for the DevEngine ecosystem. I will soon be your dedicated copilot for:
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-300">
                <span className="text-[#38f2ff]">⚡</span>
                <span className="truncate">Instant Project Scoping</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-300">
                <span className="text-[#38f2ff]">💬</span>
                <span className="truncate">24/7 Tech Advisory</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-300">
                <span className="text-[#38f2ff]">🛠️</span>
                <span className="truncate">Live System Diagnostics</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] border border-white/5 text-gray-300">
                <span className="text-[#38f2ff]">🚀</span>
                <span className="truncate">App Build Tracking</span>
              </div>
            </div>

            {/* Neural Training Progress */}
            <div className="pt-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-1">
                <span>Neural Training Progress</span>
                <span className="text-emerald-400 font-bold">96.8% READY</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-400 via-[#38f2ff] to-indigo-500 rounded-full w-[96.8%]" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3 relative z-10">
            <span className="font-mono text-[10px] text-gray-400">
              Target Release: <strong className="text-white">Q4 2026</strong>
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/services"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-gray-300 hover:text-white transition"
              >
                Services
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#38f2ff] to-indigo-500 hover:opacity-90 text-black font-sans font-bold text-[11px] transition shadow-[0_0_15px_rgba(56,242,255,0.4)] cursor-pointer"
              >
                Got It ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          FLOATING ANIMATED DEVKITTY (FREEDOM / BORDERLESS WITH SHADOW & TEXT)
      ═════════════════════════════════════════════════════════════════ */}
      <div className="relative flex items-center select-none">
        {/* Floating Text Pill with Shadow (Top-Left of Kitty, shows 3s every 5s) */}
        <div
          className={`absolute right-[82px] sm:right-[100px] -top-2 sm:-top-3 transition-all duration-500 ease-out z-20 ${
            showPill && !isOpen
              ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
              : "opacity-0 scale-90 translate-y-2 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={handleToggle}
            className="px-3.5 py-1.5 sm:py-2 rounded-2xl bg-[#080d19]/95 backdrop-blur-xl border border-white/15 text-white font-mono text-xs shadow-[0_10px_25px_rgba(0,0,0,0.85),0_0_20px_rgba(56,242,255,0.2)] flex items-center gap-2 hover:border-[#38f2ff]/50 hover:shadow-[0_10px_30px_rgba(56,242,255,0.35)] cursor-pointer whitespace-nowrap relative group/pill"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="text-[#38f2ff] font-bold">DevKitty</span>
            <span className="text-gray-300">• Tap to Chat!</span>
            {/* Small speech pointer directed at Kitty's ear */}
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#080d19] border-t border-r border-white/15 rotate-45" />
          </button>
        </div>

        {/* Free-Floating DevKitty Character (No circular border/container, pure freedom) */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleToggle();
          }}
          className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 active:scale-95 outline-none filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] drop-shadow-[0_0_20px_rgba(56,242,255,0.35)]"
          aria-expanded={isOpen}
          aria-label="Toggle DevKitty AI Chatbot"
        >
          {/* Lottie Animation Canvas */}
          <div
            ref={containerRef}
            style={{ width: "100%", height: "100%" }}
            className="w-full h-full flex items-center justify-center pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
