import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import UpdateLogBody from "@/components/update-log/UpdateLogBody";
import NetworkTopologyBody from "@/components/network/NetworkTopologyBody";
import HeaderControls from "@/components/HeaderControls";
import { useTheme } from "@/context/ThemeContext";
import styles from "./SplashScreen.module.css";
import SystemShowcase from "@/components/system/SystemShowcase";

interface SplashScreenProps {
  onEnterConsole?: () => void;
}

const TABS = [
  { id: "system_status", label: "System Status" },
  { id: "update_log", label: "Update Log" },
  { id: "network", label: "Network" },
] as const;

export default function SplashScreen({ onEnterConsole }: SplashScreenProps) {
  const { theme } = useTheme();
  const [percent, setPercent] = useState(0);
  const [statusText, setStatusText] = useState("SYSTEM INITIALIZING");
  const [splashState, setSplashState] = useState<"loading" | "exiting" | "ready">("loading");
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("system_status");
  const readyRef = useRef<HTMLDivElement>(null);
  const logoSrc = theme === "light"
    ? "/assets/DevEngine-logo-on-light1.png"
    : "/assets/DevEngine-logo-on-dark2.png";

  useEffect(() => {
    if (splashState !== "loading") return;

    let currentPercent = 0;
    let exitTimer: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      currentPercent = Math.min(100, currentPercent + 100 / 60);
      setPercent(Math.floor(currentPercent));

      if (currentPercent >= 100) {
        clearInterval(interval);
        setStatusText("SYSTEM READY ●");
        exitTimer = setTimeout(() => setSplashState("exiting"), 400);
      } else if (currentPercent >= 70) {
        setStatusText("SYSTEM INITIALIZING");
      } else if (currentPercent >= 35) {
        setStatusText("COMPILING ARCHITECTURE");
      }
    }, 40);

    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, [splashState]);

  useEffect(() => {
    if (splashState !== "exiting") return;
    const timer = setTimeout(() => setSplashState("ready"), 600);
    return () => clearTimeout(timer);
  }, [splashState]);

  return (
    <div className={`${styles.root} relative w-full h-full overflow-hidden select-none font-sans`}>
      {splashState !== "ready" && (
        <div
          id="splash-container"
          className={`${styles.splash} absolute inset-0 flex flex-col items-center justify-center z-[10000] ${
            splashState === "exiting" ? styles.exiting : ""
          }`}
        >
          <div
            className={`${styles.telemetry} ${styles.accent} absolute top-6 sm:top-10 left-5 sm:left-12 font-jetbrains text-[10px] sm:text-sm tracking-wide sm:tracking-wider`}
            style={{ animationDelay: "0.2s" }}
          >
            <span>SYSTEM / 01</span>
            <br />
            <span className={styles.muted}>INITIALIZATION SEQUENCE</span>
          </div>

          <div className={styles.bootControls}><HeaderControls /></div>

          <div
            className={`${styles.telemetry} absolute top-24 sm:top-28 right-5 sm:right-12 text-right font-jetbrains text-[10px] sm:text-sm tracking-wide sm:tracking-wider`}
            style={{ animationDelay: "0.4s" }}
          >
            <span className={styles.accent}>CORE / </span>
            <span className={`${styles.highlight} font-semibold`}>ACTIVE</span>
            <br />
            <span className={styles.muted}>V 4.0.2</span>
          </div>

          <div className="absolute bottom-5 sm:bottom-10 left-5 sm:left-12 right-5 sm:right-12 flex flex-col min-[640px]:flex-row justify-between gap-4 font-jetbrains text-xs sm:text-sm tracking-wide sm:tracking-wider">
            <div className={`${styles.telemetry} ${styles.accent}`} style={{ animationDelay: "0.6s" }}>
              <span>SECURE LINK / </span>
              <span className={`${styles.secondary} font-semibold`}>ESTABLISHED</span>
            </div>
            <div
              className={`${styles.telemetry} ${styles.muted} text-right flex flex-col items-end gap-1.5 self-end`}
              style={{ animationDelay: "0.8s" }}
            >
              <span>BUILD / INITIALIZING</span>
              <button
                type="button"
                onClick={() => setSplashState("exiting")}
                className={`${styles.skip} text-xs sm:text-sm tracking-wide uppercase py-2 cursor-pointer`}
              >
                [ SKIP INITIALIZATION → ]
              </button>
            </div>
          </div>

          <div className={`${styles.brand} ${styles.fadeIn}`}>
            <Image src={logoSrc} alt="DevEngine Logo" width={2400} height={600} priority className="h-full w-auto max-w-none object-contain" />
          </div>

          <div className="absolute bottom-40 sm:bottom-28 w-full max-w-xl px-5 sm:px-6 flex flex-col items-center z-10">
            <div className="w-full flex justify-between items-center gap-3 mb-3 font-jetbrains text-xs sm:text-sm tracking-wide">
              <span role="status" className={`${styles.highlight} font-semibold`}>{statusText}</span>
              <span className={`${styles.secondary} tabular-nums font-semibold`}>{percent}%</span>
            </div>
            <div
              className={`${styles.progressTrack} w-full h-[3px] relative overflow-hidden rounded-full`}
              role="progressbar"
              aria-label="System initialization"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <div className={`${styles.progressFill} absolute inset-y-0 left-0`} style={{ width: `${percent}%` }} />
            </div>
          </div>
        </div>
      )}

      {splashState === "ready" && (
        <div ref={readyRef} className={`${styles.ready} ${styles.fadeIn} absolute inset-0 flex flex-col overflow-y-auto`}>
          <nav aria-label="System navigation" className={styles.nav}>
            <div className={styles.navBrand}>
              <Image src={logoSrc} alt="DevEngine" width={2400} height={600} priority className="h-full w-auto max-w-none object-contain" />
            </div>

            <div className={`${styles.navLinks} font-sans`}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  onClick={() => {
                    setActiveTab(tab.id);
                    readyRef.current?.scrollTo({ top: 0 });
                  }}
                  className={`${styles.navItem} ${activeTab === tab.id ? styles.navItemActive : ""}`}
                >
                  <span className={styles.navIndicator} aria-hidden="true" />
                  {tab.label}
                </button>
              ))}
            </div>
            <div className={styles.themeSwitch}><HeaderControls /></div>
          </nav>

          {activeTab === "system_status" && (
            <SystemShowcase onEnterConsole={onEnterConsole} />
          )}

          {activeTab === "update_log" && <div className={`${styles.fadeIn} flex-1`}><UpdateLogBody embedded /></div>}
          {activeTab === "network" && <div className={`${styles.fadeIn} flex-1`}><NetworkTopologyBody embedded /></div>}

          <footer className={`${styles.footer} pt-6 pb-36 sm:pb-8 px-5 text-center font-jetbrains text-xs tracking-wider uppercase`}>
            DEVENGINE SYSTEM ARCHITECTURE · ALL RIGHTS RESERVED
          </footer>
        </div>
      )}
    </div>
  );
}
