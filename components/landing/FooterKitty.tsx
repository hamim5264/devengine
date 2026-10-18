import { useEffect, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import styles from "./LandingFooter.module.css";

/** The large wordmark remains a separate, unchanged SVG beneath this decorative layer. */
export default function FooterKitty({ load, playing, reduced }: { load: boolean; playing: boolean; reduced: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const animation = useRef<AnimationItem | null>(null);
  const playingRef = useRef(playing);
  const reducedRef = useRef(reduced);
  const [ready, setReady] = useState(false);
  playingRef.current = playing;
  reducedRef.current = reduced;

  useEffect(() => {
    if (!load) return;
    let disposed = false;
    let player: AnimationItem | null = null;
    Promise.all([import("lottie-web"), import("@/assets/DevKitty.json")]).then(([{ default: lottie }, { default: data }]) => {
      if (disposed || !container.current) return;
      player = lottie.loadAnimation({
        container: container.current,
        renderer: "svg",
        loop: true,
        autoplay: false,
        // Lottie prepares animation data in place. Keep the mascot's other instance independent.
        animationData: JSON.parse(JSON.stringify(data)),
        rendererSettings: { preserveAspectRatio: "xMidYMax meet", progressiveLoad: true },
      });
      animation.current = player;
      player.addEventListener("DOMLoaded", () => {
        if (disposed || !player) return;
        setReady(true);
        if (playingRef.current && !reducedRef.current) player.play();
        else player.goToAndStop(Math.min(12, Math.max(0, player.totalFrames - 1)), true);
      });
    }).catch((error) => console.warn("Footer DevKitty could not be loaded:", error));
    return () => { disposed = true; player?.destroy(); animation.current = null; };
  }, [load]);

  useEffect(() => {
    const player = animation.current;
    if (!player || !ready) return;
    if (reduced) player.goToAndStop(Math.min(12, Math.max(0, player.totalFrames - 1)), true);
    else if (playing) player.play();
    else player.pause();
  }, [playing, reduced, ready]);

  return <div className={styles.kittyScene} data-ready={ready} aria-hidden="true">
    <div className={styles.kittyRoute}>
      <div className={styles.kittyTraveler}>
        <span className={styles.kittyShadow} />
        <span className={styles.landingRipple} />
        <span className={styles.landingSpark} />
        <div className={styles.kittyJumper}>
          <div className={styles.kittyFacing}>
            {!ready && <span className={styles.kittyFallback}>🐱</span>}
            <div ref={container} className={styles.kittyLottie} data-ready={ready} />
          </div>
        </div>
      </div>
    </div>
  </div>;
}
