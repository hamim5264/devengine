import { useEffect, useId, useRef, useState } from "react";
import type { AnimationItem } from "lottie-web";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { useTheme } from "@/context/ThemeContext";
import DevKittyAnimatedIcon from "@/components/common/DevKittyAnimatedIcon";
import styles from "./DevKittyHeaderButton.module.css";

export default function DevKittyHeaderButton() {
  const router = useRouter();
  const dialogId = useId();
  const { theme } = useTheme();
  const isLight = theme === "light";
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
            <DevKittyAnimatedIcon
              size={38}
              active={true}
              isLight={isLight}
              className="!rounded-full border border-[#2cecf7]/60 shadow-[0_0_12px_rgba(44,236,247,0.3)]"
            />
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
          <div className={styles.comingSoonCard}>
            <DevKittyAnimatedIcon
              size={84}
              active={true}
              isLight={isLight}
              className="!rounded-2xl border border-[#2cecf7]/40 shadow-xl shadow-[#2cecf7]/20"
            />
            <div className={styles.speechBubble}>
              <p className={styles.comingSoonText}>
                &ldquo;heyy buddy, im coming soon..&rdquo; 🐾✨
              </p>
            </div>
            <p className={styles.subtext}>
              DevKitty is getting trained as your autonomous AI copilot for the DevEngine ecosystem.
            </p>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.release}>Status: <strong className="text-[#2cecf7]">Under Development</strong></span>
          <div className={styles.actions}>
            <button type="button" onClick={closeDialog} className={styles.primaryButton}>Got It ✨</button>
          </div>
        </div>
    </dialog>}
  </div>;
}
