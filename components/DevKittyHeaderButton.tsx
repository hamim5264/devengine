import { useEffect, useId, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import styles from "./DevKittyHeaderButton.module.css";

const FEATURES = [
  { icon: "⚡", label: "Instant Project Scoping" },
  { icon: "💬", label: "24/7 Tech Advisory" },
  { icon: "🛠️", label: "Live System Diagnostics" },
  { icon: "🚀", label: "App Build Tracking" },
];

export default function DevKittyHeaderButton() {
  const router = useRouter();
  const dialogId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHiddenByUser, setIsHiddenByUser] = useState(false);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);
  const [motionAllowed, setMotionAllowed] = useState(false);
  const playing = useRef(false);
  playing.current = inView && motionAllowed;
  const shouldRender = !isHiddenByUser;

  useEffect(() => {
    const checkHidden = () => {
      try {
        const uid = auth.currentUser?.uid;
        const staffUid = localStorage.getItem("devengine_staff_uid");
        setIsHiddenByUser(
          !!(uid && localStorage.getItem(`devkitty_hidden_${uid}`) === "true") ||
          !!(staffUid && localStorage.getItem(`devkitty_hidden_${staffUid}`) === "true")
        );
      } catch { setIsHiddenByUser(false); }
    };
    checkHidden();
    window.addEventListener("devkitty_visibility_change", checkHidden);
    const unsubscribe = auth.onAuthStateChanged(checkHidden);
    return () => { window.removeEventListener("devkitty_visibility_change", checkHidden); unsubscribe(); };
  }, []);

  useEffect(() => { setIsOpen(false); }, [router.asPath, isHiddenByUser]);

  useEffect(() => {
    if (!shouldRender || !rootRef.current) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!media.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(rootRef.current);
    update();
    media.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, [shouldRender]);

  useEffect(() => {
    if (!shouldRender) return;
    let disposed = false;
    let player: AnimationItem | null = null;
    setReady(false);
    Promise.all([import("lottie-web"), import("@/assets/DevKitty.json")]).then(([{ default: lottie }, { default: data }]) => {
      if (disposed || !containerRef.current) return;
      player = lottie.loadAnimation({ container: containerRef.current, renderer: "svg", loop: true, autoplay: false, animationData: JSON.parse(JSON.stringify(data)), rendererSettings: { preserveAspectRatio: "xMidYMid meet" } });
      animationRef.current = player;
      player.addEventListener("DOMLoaded", () => {
        if (disposed || !player) return;
        setReady(true);
        if (playing.current) player.play();
        else player.goToAndStop(Math.min(12, Math.max(0, player.totalFrames - 1)), true);
      });
    }).catch((error) => console.warn("Header DevKitty could not load:", error));
    return () => { disposed = true; player?.destroy(); animationRef.current = null; };
  }, [shouldRender]);

  useEffect(() => {
    if (!ready || !animationRef.current) return;
    if (inView && motionAllowed) animationRef.current.play();
    else animationRef.current.pause();
  }, [inView, motionAllowed, ready]);

  useEffect(() => {
    if (!isOpen || !shouldRender || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      launcherRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen, shouldRender]);

  const closeDialog = () => setIsOpen(false);
  if (!shouldRender) return null;
  return <div ref={rootRef} className={styles.root}>
    <button ref={launcherRef} type="button" onClick={() => setIsOpen((value) => !value)} className={styles.launcher} aria-expanded={isOpen} aria-haspopup="dialog" aria-controls={isOpen ? dialogId : undefined} aria-label="Open DevKitty assistant">
      {!ready && <span className={styles.fallback} aria-hidden="true">🐱</span>}
      <span ref={containerRef} className={styles.animation} data-ready={ready} aria-hidden="true" />
    </button>
    {isOpen && <dialog ref={dialogRef} id={dialogId} className={styles.dialog} aria-labelledby={`${dialogId}-title`} onCancel={(event) => { event.preventDefault(); closeDialog(); }} onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
        <div className={styles.dialogHeader}>
          <div className={styles.brand}>
            <span className={styles.brandIcon} aria-hidden="true">🐱</span>
            <div>
              <h2 className={styles.title} id={`${dialogId}-title`}>DevKitty AI <span className={styles.brandDot} aria-hidden="true" /></h2>
              <p className={styles.subtitle}>Future DevEngine ChatBot</p>
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={closeDialog} className={styles.close} aria-label="Close DevKitty">
            <svg aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className={styles.body}>
          <p className={styles.welcome}>&ldquo;Heyyy, kitty I&apos;m coming soon!&rdquo; 🐾✨</p>
          <p className={styles.description}>I am <strong>DevKitty</strong>, the upcoming autonomous AI intelligence engineered for the DevEngine ecosystem. I will soon be your dedicated copilot for:</p>
          <div className={styles.features}>
            {FEATURES.map((feature) => <div key={feature.label} className={styles.feature}><span className={styles.featureIcon} aria-hidden="true">{feature.icon}</span><span>{feature.label}</span></div>)}
          </div>
          <div>
            <div className={styles.progressLabel}><span>Neural Training Progress</span><strong>96.8% READY</strong></div>
            <div className={styles.progressTrack} role="progressbar" aria-label="Neural training progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={96.8}><span /></div>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.release}>Target Release: <strong>Q4 2026</strong></span>
          <div className={styles.actions}>
            <Link href="/services" onClick={() => setIsOpen(false)} className={styles.secondaryButton}>Services</Link>
            <button type="button" onClick={closeDialog} className={styles.primaryButton}>Got It ✨</button>
          </div>
        </div>
    </dialog>}
  </div>;
}
