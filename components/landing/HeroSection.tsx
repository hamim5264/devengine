import { useEffect, useMemo, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import type { HeroConfig, LandingConfig } from "@/types/landing";
import styles from "./LandingMotion.module.css";

export interface ShowcaseCard {
  src: string;
  alt: string;
  label: string;
  href?: string;
  /** Portrait (phone) artwork renders narrower. */
  tall?: boolean;
}

/** Collects every visual already managed in the admin landing config into the orbiting ring. */
export function buildHeroShowcase(config: LandingConfig): ShowcaseCard[] {
  const cards: ShowcaseCard[] = [];
  const seen = new Set<string>();
  const add = (card: ShowcaseCard) => {
    if (!card.src || seen.has(card.src)) return;
    seen.add(card.src);
    cards.push(card);
  };
  add({ src: config.hero.desktopImageUrl, alt: "DevEngine desktop experience", label: "Web Platforms" });
  config.featuredProducts.products.forEach((product) => add({ src: product.imageUrl, alt: product.title, label: product.title, href: product.link }));
  add({ src: config.hero.mobileImageUrl, alt: "DevEngine mobile experience", label: "Mobile Apps", tall: true });
  add({ src: config.webPlatform.screenImageUrl, alt: config.webPlatform.title || "Enterprise platform", label: config.webPlatform.title || "Enterprise" });
  add({ src: config.hero.tabletImageUrl, alt: "DevEngine tablet experience", label: "Tablet Experiences" });
  add({ src: config.mobile.phone1ImageUrl, alt: "Mobile application preview", label: "Native Apps", tall: true });
  config.customSolutions.cards.forEach((card) => add({ src: card.imageUrl || "", alt: card.title, label: card.title }));
  add({ src: config.mobile.phone2ImageUrl, alt: "Second mobile application preview", label: "Cross-platform", tall: true });
  return cards.slice(0, 9);
}

const TAU = Math.PI * 2;
const TILTS = [-5, 3, -2, 4, -4, 2, -3, 5, -1];
const easeOut = (value: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, value)), 3);

/** Counts the first number inside a stat (e.g. "99.9%" → 0 … 99.9%) once, after the hero intro. */
function CountUp({ value, reduce }: { value: string; reduce: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = /^(\D*?)(\d+(?:\.\d+)?)(.*)$/.exec(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || !match || reduce) return;
    const [, prefix, numeric, suffix] = match;
    const target = parseFloat(numeric);
    const decimals = numeric.includes(".") ? numeric.split(".")[1].length : 0;
    let frame = 0;
    const startTime = performance.now() + 900;
    const render = (now: number) => {
      const k = easeOut((now - startTime) / 1700);
      el.textContent = `${prefix}${(target * k).toFixed(decimals)}${suffix}`;
      if (k < 1) frame = requestAnimationFrame(render);
    };
    el.textContent = `${prefix}${(0).toFixed(decimals)}${suffix}`;
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return <span ref={ref}>{value}</span>;
}

export default function HeroSection({ config, showcase = [] }: { config: HeroConfig; showcase?: ShowcaseCard[] }) {
  const reduceMotion = !!useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const cards = useMemo(() => showcase.filter((card) => card.src), [showcase]);
  const titleWords = config.title.split(/\s+/).filter(Boolean);
  const highlightWords = config.titleHighlight.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const hero = heroRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!hero || !stage || !canvas) return;
    const ctx = canvas.getContext("2d");
    const nodes = Array.from(stage.querySelectorAll<HTMLElement>("[data-orbit-card]"));

    let stageW = 0, stageH = 0, heroW = 0, heroH = 0, dpr = 1;
    let sizes: { w: number; h: number }[] = [];
    let limit = nodes.length;
    let phase = Math.PI * 0.5;
    let speed = 1;
    let hovering = false;
    let visible = true;
    let frame = 0;
    let last = performance.now();
    const born = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const trail: { x: number; y: number; t: number }[] = [];
    let inked = false;

    const measure = () => {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
      heroW = hero.clientWidth;
      heroH = hero.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(heroW * dpr);
      canvas.height = Math.round(heroH * dpr);
      limit = heroW < 780 ? Math.min(6, nodes.length) : nodes.length;
      sizes = nodes.map((node) => ({ w: node.offsetWidth, h: node.offsetHeight }));
    };

    const layout = (now: number) => {
      const scrollK = Math.min(1, Math.max(0, window.scrollY / Math.max(1, heroH)));
      const shown = nodes.slice(0, limit);
      const avgW = shown.reduce((sum, _, i) => sum + sizes[i].w, 0) / Math.max(1, shown.length);
      const avgH = shown.reduce((sum, _, i) => sum + sizes[i].h, 0) / Math.max(1, shown.length);
      const rx = Math.max(60, stageW / 2 - avgW * 0.34);
      const ry = Math.max(50, stageH / 2 - avgH * 0.34);
      nodes.forEach((node, i) => {
        if (i >= limit) { node.style.opacity = "0"; node.style.pointerEvents = "none"; return; }
        const intro = reduceMotion ? 1 : easeOut((now - born - 250 - i * 130) / 1100);
        const a = phase + (i * TAU) / limit;
        const depth = (Math.sin(a) + 1) / 2;
        const radius = (0.18 + 0.82 * intro) * (1 + scrollK * 0.12);
        const x = stageW / 2 + pointer.x * 22 * (0.4 + depth) + Math.cos(a) * rx * radius;
        const y = stageH / 2 + pointer.y * 14 * (0.4 + depth) + Math.sin(a) * ry * radius;
        const scale = (0.72 + 0.38 * depth) * (0.55 + 0.45 * intro);
        const { w, h } = sizes[i];
        node.style.transform = `translate3d(${(x - w / 2).toFixed(1)}px, ${(y - h / 2).toFixed(1)}px, 0) rotate(${TILTS[i % TILTS.length]}deg) scale(${scale.toFixed(3)})`;
        node.style.opacity = ((0.5 + 0.5 * depth) * intro * (1 - scrollK * 0.85)).toFixed(3);
        node.style.zIndex = String(Math.round(depth * 10));
        node.style.pointerEvents = intro > 0.6 ? "auto" : "none";
      });
    };

    const drawInk = (now: number) => {
      if (!ctx) return;
      while (trail.length && now - trail[0].t > 650) trail.shift();
      if (!trail.length) {
        if (inked) { ctx.clearRect(0, 0, canvas.width, canvas.height); inked = false; }
        return;
      }
      inked = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(44, 236, 247, 0.9)";
      ctx.shadowBlur = 14 * dpr;
      for (let i = 1; i < trail.length; i++) {
        const age = 1 - (now - trail[i].t) / 650;
        if (age <= 0) continue;
        ctx.strokeStyle = `rgba(44, 236, 247, ${(age * 0.85).toFixed(3)})`;
        ctx.lineWidth = (1 + 5.5 * age) * dpr;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x * dpr, trail[i - 1].y * dpr);
        ctx.lineTo(trail[i].x * dpr, trail[i].y * dpr);
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      speed += ((hovering ? 0 : 1) - speed) * (1 - Math.exp(-dt * 0.006));
      phase += dt * 0.000085 * speed;
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 0.005));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 0.005));
      layout(now);
      drawInk(now);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reduceMotion || frame || !visible || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => { cancelAnimationFrame(frame); frame = 0; };

    const onMove = (event: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      hero.style.setProperty("--mx", `${x}px`);
      hero.style.setProperty("--my", `${y}px`);
      pointer.tx = (x / rect.width - 0.5) * 2;
      pointer.ty = (y / rect.height - 0.5) * 2;
      if (reduceMotion) return;
      trail.push({ x, y, t: performance.now() });
      if (trail.length > 48) trail.shift();
    };
    const onLeave = () => { pointer.tx = 0; pointer.ty = 0; };
    const onOver = (event: PointerEvent) => { if ((event.target as Element).closest("[data-orbit-card]")) hovering = true; };
    const onOut = () => { hovering = false; };
    const onVisibility = () => { if (document.hidden) stop(); else start(); };

    measure();
    layout(performance.now());
    const resizeObserver = new ResizeObserver(() => { measure(); layout(performance.now()); });
    resizeObserver.observe(hero);
    nodes.forEach((node) => resizeObserver.observe(node));
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(hero);

    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    stage.addEventListener("pointerover", onOver);
    stage.addEventListener("pointerout", onOut);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      io.disconnect();
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerover", onOver);
      stage.removeEventListener("pointerout", onOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [cards.length, reduceMotion]);

  const scrollToContact = (event: MouseEvent<HTMLAnchorElement>) => {
    const contact = document.getElementById("contact");
    if (!contact) return;
    event.preventDefault();
    contact.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    window.history.replaceState(null, "", "#contact");
  };
  const scrollToWork = (event: MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById("products");
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <section id="studio" ref={heroRef} className={styles.hero} aria-labelledby="orbital-hero-title">
      <div className={styles.heroBg} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} />
        <span className={`${styles.blob} ${styles.blobB}`} />
        <span className={styles.gridPattern} />
        <span className={styles.spotlight} />
      </div>
      <canvas ref={canvasRef} className={styles.ink} aria-hidden="true" />

      <div ref={stageRef} className={styles.orbitStage}>
        {cards.map((card, index) => {
          const media = (
            <>
              <img src={card.src} alt={card.alt} className={styles.orbitMedia} draggable={false} decoding="async" fetchPriority={index < 3 ? "high" : "auto"} />
              <span className={styles.orbitCaption} aria-hidden="true"><span>{card.label}</span><span>↗</span></span>
            </>
          );
          return (
            <div key={`${card.src}-${index}`} className={styles.orbitCard} data-orbit-card data-tall={card.tall ? "1" : undefined}>
              {card.href
                ? <Link href={card.href} className={styles.orbitInner} aria-label={`Explore ${card.label}`}>{media}</Link>
                : <div className={styles.orbitInner}>{media}</div>}
            </div>
          );
        })}
      </div>

      <div className={styles.copy}>
        <div className={styles.badge}><span className={styles.badgeDot} aria-hidden="true" />{config.badgeText}</div>
        <h1 id="orbital-hero-title" className={styles.title}>
          {titleWords.map((word, i) => <span key={`t-${i}`} className={styles.word} style={{ ["--i" as string]: i }}>{word}{"\u00A0"}</span>)}
          {highlightWords.map((word, i) => <span key={`h-${i}`} className={`${styles.word} ${styles.shimmer}`} style={{ ["--i" as string]: titleWords.length + i }}>{word}{i < highlightWords.length - 1 ? "\u00A0" : ""}</span>)}
        </h1>
        <p className={styles.subtitle}>{config.subtitle}</p>
        <div className={styles.actions}>
          <a href="#contact" onClick={scrollToContact} className={styles.ctaPrimary}>Build Together <span aria-hidden="true">↗</span></a>
          <a href="#products" onClick={scrollToWork} className={styles.ctaGhost}>Explore Our Work</a>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}><strong className={styles.statValue}><CountUp value={config.stat1Value} reduce={reduceMotion} /></strong><span className={styles.statLabel}>{config.stat1Label}</span></div>
          <div className={styles.stat}><strong className={styles.statValue}><CountUp value={config.stat2Value} reduce={reduceMotion} /></strong><span className={styles.statLabel}>{config.stat2Label}</span></div>
        </div>
      </div>

      <div className={styles.scrollCue} aria-hidden="true"><span className={styles.mouse} />Scroll</div>
    </section>
  );
}
