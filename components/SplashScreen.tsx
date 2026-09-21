import React, { useEffect, useState } from "react";
import Image from "next/image";
import UpdateLogBody from "@/components/update-log/UpdateLogBody";
import NetworkTopologyBody from "@/components/network/NetworkTopologyBody";

interface SplashScreenProps {
  onEnterConsole?: () => void;
}

export default function SplashScreen({ onEnterConsole }: SplashScreenProps) {
  const [percent, setPercent] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("SYSTEM INITIALIZING");
  const [splashState, setSplashState] = useState<"loading" | "exiting" | "ready">("loading");
  const [activeTab, setActiveTab] = useState<"system_status" | "update_log" | "network">("system_status");

  // Progression Timer (0% to 100% in ~2.4 seconds)
  useEffect(() => {
    let currentPercent = 0;
    const duration = 2400; // ms
    const intervalTime = 40;
    const step = 100 / (duration / intervalTime);

    const interval = setInterval(() => {
      currentPercent += step;

      if (currentPercent >= 35 && currentPercent < 70) {
        setStatusText("COMPILING ARCHITECTURE");
      } else if (currentPercent >= 70 && currentPercent < 100) {
        setStatusText("SYSTEM INITIALIZING");
      }

      if (currentPercent >= 100) {
        currentPercent = 100;
        clearInterval(interval);
        setStatusText("SYSTEM READY ●");

        // Transition smoothly to System Ready screen
        setTimeout(() => {
          setSplashState("exiting");
          setTimeout(() => {
            setSplashState("ready");
          }, 600);
        }, 400);
      }

      setPercent(Math.floor(currentPercent));
    }, intervalTime);

    return () => clearInterval(interval);
  }, []);

  const handleSkip = () => {
    setSplashState("exiting");
    setTimeout(() => {
      setSplashState("ready");
    }, 300);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none text-[#dde2f3] font-sans">
      {/* ============================================================ */}
      {/* PHASE 1: SPLASH SCREEN INITIALIZATION (Pure Black, No Lines) */}
      {/* ============================================================ */}
      {splashState !== "ready" && (
        <div
          id="splash-container"
          className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center z-50 bg-black transition-all duration-700 ${
            splashState === "exiting" ? "splash-exit pointer-events-none" : ""
          }`}
        >
          {/* Corner Telemetry: Top Left */}
          <div
            className="absolute top-6 sm:top-10 left-6 sm:left-12 font-jetbrains text-xs tracking-widest text-[#38f2ff] anim-meta"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="opacity-90">SYSTEM / 01</span>
            <br />
            <span className="text-[#849495] tracking-[0.2em]">
              INITIALIZATION SEQUENCE
            </span>
          </div>

          {/* Corner Telemetry: Top Right */}
          <div
            className="absolute top-6 sm:top-10 right-6 sm:right-12 text-right font-jetbrains text-xs tracking-widest anim-meta"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="text-[#38f2ff] opacity-90">CORE / </span>
            <span className="text-[#78f5ff] font-semibold">ACTIVE</span>
            <br />
            <span className="text-[#849495] tracking-[0.2em]">V 4.0.2</span>
          </div>

          {/* Corner Telemetry: Bottom Left */}
          <div
            className="absolute bottom-6 sm:bottom-10 left-6 sm:left-12 font-jetbrains text-xs tracking-widest text-[#38f2ff] anim-meta"
            style={{ animationDelay: "0.6s" }}
          >
            <span className="opacity-80">SECURE LINK / </span>
            <span className="text-[#9ecaff] font-semibold">ESTABLISHED</span>
          </div>

          {/* Corner Telemetry: Bottom Right & Skip Action */}
          <div
            className="absolute bottom-6 sm:bottom-10 right-6 sm:right-12 text-right font-jetbrains text-xs tracking-widest text-[#849495] anim-meta flex flex-col items-end gap-1.5"
            style={{ animationDelay: "0.8s" }}
          >
            <span>BUILD / INITIALIZING</span>
            <button
              onClick={handleSkip}
              className="text-[10px] tracking-[0.25em] text-[#38f2ff]/70 hover:text-[#78f5ff] transition-colors uppercase pt-1 border-b border-transparent hover:border-[#38f2ff]/50 cursor-pointer"
            >
              [ SKIP_INITIALIZATION → ]
            </button>
          </div>

          {/* Central Brand Identity Area: Only the Logo Centered in the Middle */}
          <div className="flex items-center justify-center z-10 px-6 max-w-3xl w-full select-none">
            <div className="anim-fade flex items-center justify-center w-full translate-x-10 sm:translate-x-16 md:translate-x-20">
              <Image
                src="/assets/DevEngine-logo-on-dark2.png"
                alt="DevEngine Logo"
                width={720}
                height={180}
                priority
                className="w-80 sm:w-[460px] md:w-[560px] lg:w-[620px] h-auto object-contain"
              />
            </div>
          </div>

          {/* Bottom Status & Laser Progress Bar */}
          <div className="absolute bottom-20 sm:bottom-24 w-full max-w-md px-6 flex flex-col items-center justify-center z-10">
            <div className="w-full flex justify-between items-center mb-2.5 font-jetbrains text-xs tracking-wider">
              <span className="font-semibold text-[#78f5ff] transition-colors">
                {statusText}
              </span>
              <span className="text-[#9ecaff] tabular-nums font-semibold">
                {percent}%
              </span>
            </div>

            {/* Laser Cut Progress Line */}
            <div className="w-full h-[2px] bg-[#222]/80 relative overflow-hidden rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#00dbe8]/40 via-[#38f2ff] to-[#e6fdff] transition-all duration-75 ease-out shadow-[0_0_12px_#38f2ff]"
                style={{ width: `${percent}%` }}
              />
              <div
                className="absolute top-0 left-0 h-full bg-[#38f2ff] blur-[4px] opacity-70 transition-all duration-75 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PHASE 2: SYSTEM READY SCREEN (Pure Black Sleek Dashboard) */}
      {/* ============================================================ */}
      {splashState === "ready" && (
        <div className="absolute inset-0 w-full h-full bg-black text-[#dde2f3] flex flex-col justify-between overflow-auto anim-fade">
          {/* Top Navigation Bar */}
          <nav className="fixed top-0 w-full h-16 bg-black/90 backdrop-blur-xl border-b border-[#38f2ff]/20 flex justify-between items-center px-6 sm:px-12 md:px-20 shadow-[0_0_25px_rgba(56,242,255,0.05)] z-40">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/assets/DevEngine-logo-on-dark2.png"
                alt="DevEngine"
                width={160}
                height={40}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>

            {/* Nav Options: System Status, Update Log, Network */}
            <div className="flex items-center gap-6 sm:gap-10 font-jetbrains text-xs tracking-wider">
              <button
                type="button"
                onClick={() => setActiveTab("system_status")}
                className={`transition-all pb-1 cursor-pointer font-medium ${
                  activeTab === "system_status"
                    ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.6)]"
                    : "text-[#849495] hover:text-[#e6fdff]"
                }`}
              >
                System Status
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("update_log")}
                className={`transition-all pb-1 cursor-pointer font-medium ${
                  activeTab === "update_log"
                    ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.6)]"
                    : "text-[#849495] hover:text-[#e6fdff]"
                }`}
              >
                Update Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("network")}
                className={`transition-all pb-1 cursor-pointer font-medium ${
                  activeTab === "network"
                    ? "text-[#38f2ff] border-b-2 border-[#38f2ff] drop-shadow-[0_0_8px_rgba(56,242,255,0.6)]"
                    : "text-[#849495] hover:text-[#e6fdff]"
                }`}
              >
                Network
              </button>
            </div>
          </nav>

          {/* Main Content Area Based on activeTab */}
          {activeTab === "system_status" && (
            <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 max-w-3xl mx-auto anim-fade">
              <h2 className="font-space-grotesk text-4xl sm:text-6xl md:text-7xl font-bold text-[#78f5ff] mb-6 tracking-tight drop-shadow-[0_0_20px_rgba(120,245,255,0.4)]">
                System Ready
              </h2>

              <p className="font-sans text-base sm:text-lg md:text-xl text-[#849495] max-w-2xl mb-12 leading-relaxed font-normal">
                The digital architecture has been successfully initialized. All
                core components are active and awaiting commands.
              </p>

              <button
                onClick={onEnterConsole}
                className="bg-[#78f5ff] text-[#002022] hover:bg-[#38f2ff] px-10 py-3.5 rounded-full font-jetbrains text-xs tracking-widest font-bold uppercase shadow-[0_0_25px_rgba(120,245,255,0.5)] hover:shadow-[0_0_35px_rgba(56,242,255,0.8)] hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
              >
                ENTER CONSOLE
              </button>
            </main>
          )}

          {activeTab === "update_log" && (
            <div className="flex-1 overflow-y-auto anim-fade">
              <UpdateLogBody />
            </div>
          )}

          {activeTab === "network" && (
            <div className="flex-1 overflow-y-auto anim-fade">
              <NetworkTopologyBody />
            </div>
          )}

          {/* Subtle Bottom Technical Footer */}
          <footer className="py-4 text-center font-jetbrains text-[10px] tracking-[0.2em] text-[#849495]/60 uppercase">
            DEVENGINE SYSTEM ARCHITECTURE · ALL RIGHTS RESERVED
          </footer>
        </div>
      )}
    </div>
  );
}
