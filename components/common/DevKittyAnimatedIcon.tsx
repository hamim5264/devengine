import React, { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import styles from "./DevKittyAnimatedIcon.module.css";

interface DevKittyAnimatedIconProps {
  size?: number;
  active?: boolean;
  isLight?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export default function DevKittyAnimatedIcon({
  size = 40,
  active = true,
  isLight = false,
  onClick,
  className = "",
  title = "DevKitty Mascot",
}: DevKittyAnimatedIconProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    let disposed = false;
    let player: AnimationItem | null = null;
    setReady(false);

    Promise.all([import("lottie-web"), import("@/assets/DevKitty.json")])
      .then(([{ default: lottie }, { default: data }]) => {
        if (disposed || !containerRef.current) return;

        player = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: true,
          autoplay: false,
          animationData: JSON.parse(JSON.stringify(data)),
          rendererSettings: {
            preserveAspectRatio: "xMidYMid meet",
            progressiveLoad: true,
          },
        });

        animationRef.current = player;

        player.addEventListener("DOMLoaded", () => {
          if (disposed || !player) return;
          setReady(true);
          if (activeRef.current) {
            player.play();
          } else {
            player.goToAndStop(Math.min(12, Math.max(0, player.totalFrames - 1)), true);
          }
        });
      })
      .catch((err) => {
        console.warn("DevKitty animated icon could not load:", err);
      });

    return () => {
      disposed = true;
      player?.destroy();
      animationRef.current = null;
    };
  }, []);

  useEffect(() => {
    const player = animationRef.current;
    if (!player || !ready) return;

    if (active) {
      player.play();
    } else {
      player.goToAndStop(Math.min(12, Math.max(0, player.totalFrames - 1)), true);
    }
  }, [active, ready]);

  const activeThemeClass = isLight
    ? active
      ? styles.kittyWrapperActiveLight
      : styles.kittyWrapperInactiveLight
    : active
    ? styles.kittyWrapperActiveDark
    : styles.kittyWrapperInactiveDark;

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
      className={`${styles.kittyWrapper} ${activeThemeClass} ${onClick ? "cursor-pointer" : ""} ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
    >
      {!ready && (
        <span className={styles.kittyFallback} aria-hidden="true" style={{ fontSize: `${Math.round(size * 0.5)}px` }}>
          🐱
        </span>
      )}
      <div
        ref={containerRef}
        className={styles.kittyLottieContainer}
        data-ready={ready}
        aria-hidden="true"
      />
    </div>
  );
}
