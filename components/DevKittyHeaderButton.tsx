import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useDevKitty } from "@/components/devkitty/DevKittyProvider";
import DevKittyAnimatedIcon from "@/components/common/DevKittyAnimatedIcon";
import styles from "./DevKittyHeaderButton.module.css";

export default function DevKittyHeaderButton() {
  const kitty = useDevKitty(), { theme } = useTheme();
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false), [motion, setMotion] = useState(false);
  useEffect(() => {
    if (!root.current || kitty.hidden) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!media.matches && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current); update();
    media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update); };
  }, [kitty.hidden]);
  if (kitty.hidden) return null;
  return <div ref={root} className={styles.root}><button type="button" className={styles.launcher} onClick={kitty.isOpen ? kitty.close : kitty.open} aria-expanded={kitty.isOpen} aria-haspopup="dialog" aria-label="Open DevKitty assistant"><DevKittyAnimatedIcon size={40} active={visible && motion} isLight={theme === "light"} /></button></div>;
}
