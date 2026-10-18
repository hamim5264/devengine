import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ProcessConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";

export default function ProcessSection({ config }: { config: ProcessConfig }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) { setProgress(100); return; }
    let frame = 0;
    const measure = () => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      setProgress(Math.max(0, Math.min(100, (window.innerHeight * 0.7 - rect.top) / Math.max(1, rect.height) * 100)));
    };
    const onScroll = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, [reduceMotion, config.stages.length]);

  return <section id="process" className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <div className={styles.processTrack} ref={trackRef}>
      <div className={styles.trackBase} aria-hidden="true" /><div className={styles.trackProgress} style={{ height: `${progress}%` }} aria-hidden="true" />
      <ol className={styles.stages}>{config.stages.map((stage, index) => <Reveal as="li" key={index} className={styles.stage} direction={index % 2 === 0 ? "right" : "left"} attrs={{ "data-side": index % 2 === 0 ? "left" : "right", "data-active": progress >= index / Math.max(1, config.stages.length - 1) * 100 - 5 }}>
        <span className={styles.stageDot} aria-hidden="true" /><span className={styles.stageNumber}>{stage.stageNumber}</span><h3 className={styles.cardTitle}>{stage.title}</h3><p className={styles.cardBody}>{stage.description}</p>
      </Reveal>)}</ol>
    </div>
  </div></section>;
}
