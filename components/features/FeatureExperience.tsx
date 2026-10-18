import { useEffect, useId, useRef, type ReactNode } from "react";
import { MotionConfig, motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import styles from "./Features.module.css";

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function Icon({ name }: { name: string }) {
  return <span className="material-symbols-outlined" aria-hidden="true">{name}</span>;
}

export function FeaturePage({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.page}>
        <LandingNavbar />
        <main onClick={(event) => {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
          const targetId = anchor?.getAttribute("href")?.slice(1);
          const target = targetId ? document.getElementById(targetId) : null;
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
          window.history.replaceState(null, "", `#${targetId}`);
        }}>{children}</main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.85, ease, delay }}
    >{children}</motion.div>
  );
}

export function AnimatedTitle({ text, accent, id }: { text: string; accent?: string; id?: string }) {
  const reduced = useReducedMotion();
  return (
    <h1 id={id} className={styles.title} aria-label={accent ? `${text} ${accent}` : text}>
      <span className={styles.titleLine} aria-hidden="true">
        {text.split(" ").map((word, index) => (
          <span className={styles.wordMask} key={`${word}-${index}`}>
            <motion.span initial={reduced ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.95, delay: index * 0.055, ease }}>{word}</motion.span>
          </span>
        ))}
      </span>
      {accent && <motion.span aria-hidden="true" className={styles.titleAccent} initial={reduced ? false : { clipPath: "inset(0 100% 0 0)" }} animate={{ clipPath: "inset(0 0% 0 0)" }} transition={{ duration: 1.1, delay: 0.22, ease }}>{accent}</motion.span>}
    </h1>
  );
}

/** Scroll-linked depth stays local to the artwork; native page scrolling remains intact. */
export function DepthStage({ children, className = "", contentClassName = "" }: { children: ReactNode; className?: string; contentClassName?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [4, -4]);
  return (
    <div ref={ref} className={`${styles.depthStage} ${className}`}>
      <motion.div className={`${styles.depthContent} ${contentClassName}`} style={reduced ? undefined : { y, rotateX }}>{children}</motion.div>
    </div>
  );
}

export function Portal({ label = "Ideas into impact" }: { label?: string }) {
  return (
    <div className={styles.portal} aria-hidden="true">
      <div className={styles.portalOrbit} />
      <div className={styles.portalRing}><div /><div /><div /></div>
      <span className={styles.portalCore}><Icon name="asterisk" /></span>
      <span className={styles.portalLabel}>{label}</span>
    </div>
  );
}

export function Marquee({ words }: { words: string[] }) {
  return (
    <div className={styles.marquee} aria-hidden="true">
      <div className={styles.marqueeTrack}>
        {[0, 1].map((copy) => <div className={styles.marqueeGroup} key={copy}>{words.map((word) => <span key={word}>{word}<span className={styles.marqueeStar}>✳</span></span>)}</div>)}
      </div>
    </div>
  );
}

export function FeatureModal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} className={`${styles.modal} ${wide ? styles.modalWide : ""}`} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); closeRef.current(); }} onClick={(event) => { if (event.target === event.currentTarget) closeRef.current(); }}>
      <div className={styles.modalInner}>
        <header className={styles.modalHeader}><h2 id={titleId}>{title}</h2><button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close dialog" autoFocus><Icon name="close" /></button></header>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </dialog>
  );
}

export function PreviewImage({ src, alt, priority = false, className = "" }: { src?: string; alt: string; priority?: boolean; className?: string }) {
  if (!src) return <div className={`${styles.imagePlaceholder} ${className}`}><Icon name="image" /><span>Preview coming soon</span></div>;
  return <img className={`${styles.naturalImage} ${className}`} src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={(event) => { event.currentTarget.hidden = true; event.currentTarget.parentElement?.setAttribute("data-image-unavailable", "true"); }} />;
}
