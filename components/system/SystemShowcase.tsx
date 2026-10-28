import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getPublicApprovedReviews } from "@/lib/services/reviewsService";
import type { ReviewRecord } from "@/types/review";
import styles from "./SystemShowcase.module.css";

export interface System3DIconItem {
  id: string;
  name: string;
  file: string;
  category: "mobile" | "frontend" | "backend" | "devops" | "database" | "ecosystem";
  categoryLabel: string;
  tag: string;
  status: "ONLINE" | "ACTIVE" | "SYNCHRONIZED";
  latency: string;
  ring: 1 | 2;
}

export const SYSTEM_3D_ICONS: System3DIconItem[] = [
  // Ring 1 (Inner Core Orbit - 10 primary language & platform foundations)
  {
    id: "react",
    name: "React",
    file: "react.png",
    category: "frontend",
    categoryLabel: "Frontend Architecture",
    tag: "Next.js / Virtual DOM / Islands Architecture",
    status: "ONLINE",
    latency: "3ms",
    ring: 1,
  },
  {
    id: "python",
    name: "Python",
    file: "python.png",
    category: "backend",
    categoryLabel: "AI & Neural Pipeline",
    tag: "FastAPI / PyTorch / Distributed Workers",
    status: "ONLINE",
    latency: "5ms",
    ring: 1,
  },
  {
    id: "flutter",
    name: "Flutter",
    file: "flutter.png",
    category: "mobile",
    categoryLabel: "Multi-Platform App Engine",
    tag: "iOS & Android Cross-Platform Runtime",
    status: "ONLINE",
    latency: "6ms",
    ring: 1,
  },
  {
    id: "go",
    name: "Go Language",
    file: "go-language-logo.png",
    category: "backend",
    categoryLabel: "High-Throughput Microservices",
    tag: "Concurrent Distributed Systems Engine",
    status: "ONLINE",
    latency: "2ms",
    ring: 1,
  },
  {
    id: "javascript",
    name: "JavaScript",
    file: "javascript-logo.png",
    category: "frontend",
    categoryLabel: "Web Platform Runtime",
    tag: "ESNext / TypeScript / Node.js Engine",
    status: "ONLINE",
    latency: "1ms",
    ring: 1,
  },
  {
    id: "kotlin",
    name: "Kotlin",
    file: "kotlin.png",
    category: "mobile",
    categoryLabel: "Modern Android Native",
    tag: "Jetpack Compose / Asynchronous Coroutines",
    status: "ONLINE",
    latency: "4ms",
    ring: 1,
  },
  {
    id: "c-sharp",
    name: "C#",
    file: "c-sharp.png",
    category: "backend",
    categoryLabel: ".NET Enterprise Ecosystem",
    tag: "ASP.NET Core / Enterprise Services",
    status: "ONLINE",
    latency: "7ms",
    ring: 1,
  },
  {
    id: "java",
    name: "Java",
    file: "java.png",
    category: "backend",
    categoryLabel: "Enterprise JVM Engine",
    tag: "Spring Boot / High Reliability Cluster",
    status: "ONLINE",
    latency: "6ms",
    ring: 1,
  },
  {
    id: "android",
    name: "Android",
    file: "android.png",
    category: "mobile",
    categoryLabel: "Android Platform Ecosystem",
    tag: "Native Architecture & Hardware SDK",
    status: "ONLINE",
    latency: "4ms",
    ring: 1,
  },
  {
    id: "app-store",
    name: "iOS App Store",
    file: "app-store-in-ios.png",
    category: "mobile",
    categoryLabel: "Apple Ecosystem Distribution",
    tag: "iOS / iPadOS / App Store Connect",
    status: "ONLINE",
    latency: "5ms",
    ring: 1,
  },

  // Ring 2 (Outer Orbit - 14 database, devops, tools & delivery platforms)
  {
    id: "docker",
    name: "Docker",
    file: "docker.png",
    category: "devops",
    categoryLabel: "Container Orchestration",
    tag: "Containers / Microservices / K8s Pods",
    status: "ONLINE",
    latency: "9ms",
    ring: 2,
  },
  {
    id: "github",
    name: "GitHub",
    file: "github.png",
    category: "devops",
    categoryLabel: "DevOps & CI/CD Pipelines",
    tag: "GitHub Actions / Automated Code Security",
    status: "ONLINE",
    latency: "12ms",
    ring: 2,
  },
  {
    id: "git",
    name: "Git",
    file: "git.png",
    category: "devops",
    categoryLabel: "Version Control Engine",
    tag: "Distributed Revision Architecture",
    status: "ONLINE",
    latency: "1ms",
    ring: 2,
  },
  {
    id: "mongo-db",
    name: "MongoDB",
    file: "mongo-db.png",
    category: "database",
    categoryLabel: "Document Database Cluster",
    tag: "Scalable Distributed NoSQL Datastore",
    status: "ONLINE",
    latency: "8ms",
    ring: 2,
  },
  {
    id: "mysql",
    name: "MySQL",
    file: "mysql.png",
    category: "database",
    categoryLabel: "Relational SQL Cluster",
    tag: "ACID Compliant Enterprise DB",
    status: "ONLINE",
    latency: "6ms",
    ring: 2,
  },
  {
    id: "tailwind",
    name: "Tailwind CSS",
    file: "tailwind.png",
    category: "frontend",
    categoryLabel: "Design System Utility",
    tag: "Modern Responsive Utility Architecture",
    status: "ONLINE",
    latency: "1ms",
    ring: 2,
  },
  {
    id: "figma",
    name: "Figma",
    file: "figma-logo.png",
    category: "ecosystem",
    categoryLabel: "Design System Engineering",
    tag: "Design Tokens & Vector Wireframes",
    status: "ONLINE",
    latency: "14ms",
    ring: 2,
  },
  {
    id: "laravel",
    name: "Laravel",
    file: "laravel-framework-logo.png",
    category: "backend",
    categoryLabel: "Modern Web Framework",
    tag: "Robust API & MVC Architecture",
    status: "ONLINE",
    latency: "8ms",
    ring: 2,
  },
  {
    id: "php",
    name: "PHP",
    file: "php.png",
    category: "backend",
    categoryLabel: "Server Execution Engine",
    tag: "PHP 8.3 / JIT High Performance Runtime",
    status: "ONLINE",
    latency: "10ms",
    ring: 2,
  },
  {
    id: "flutter-engine",
    name: "Flutter Engine",
    file: "flutter-logo.png",
    category: "mobile",
    categoryLabel: "Impeller Graphics Pipeline",
    tag: "120fps Hardware Accelerated GPU",
    status: "ONLINE",
    latency: "4ms",
    ring: 2,
  },
  {
    id: "play-store",
    name: "Google Play",
    file: "play-store.png",
    category: "ecosystem",
    categoryLabel: "Android Global Release",
    tag: "Play Console / App Bundles / Deployment",
    status: "ONLINE",
    latency: "7ms",
    ring: 2,
  },
  {
    id: "facebook",
    name: "Meta Ecosystem",
    file: "facebook-logo.png",
    category: "ecosystem",
    categoryLabel: "Social Graph & Auth APIs",
    tag: "Meta Graph / OAuth Secure Connect",
    status: "ONLINE",
    latency: "18ms",
    ring: 2,
  },
  {
    id: "linkedin",
    name: "LinkedIn API",
    file: "linkedin.png",
    category: "ecosystem",
    categoryLabel: "Enterprise Identity & Network",
    tag: "B2B Enterprise Auth & Social Cloud",
    status: "ONLINE",
    latency: "20ms",
    ring: 2,
  },
  {
    id: "youtube",
    name: "YouTube Media",
    file: "youtube.png",
    category: "ecosystem",
    categoryLabel: "Video Streaming Architecture",
    tag: "High-Fidelity Media CDN Pipeline",
    status: "ONLINE",
    latency: "15ms",
    ring: 2,
  },
];

const TAU = Math.PI * 2;
const CATEGORIES = [
  { id: "all", label: "All Nodes (24)" },
  { id: "mobile", label: "Mobile" },
  { id: "backend", label: "Backend" },
  { id: "frontend", label: "Frontend" },
  { id: "devops", label: "DevOps" },
  { id: "database", label: "Databases" },
  { id: "ecosystem", label: "Ecosystem" },
] as const;

const VERIFIED_REVIEWS: ReviewRecord[] = [
  {
    id: "rev-1",
    reviewerName: "Shirajom Monira",
    reviewerRole: "Student Project Purchaser",
    company: "DevEngine Archive",
    reviewText:
      "Great quality and easy to understand! I purchased a student project from DevEngine and was amazed by how clean and professional everything looked. Highly recommend!",
    rating: 5,
    status: "APPROVED",
    featured: true,
    createdAt: new Date().toISOString(),
    orderId: "ORD-001",
    serviceName: "DevEngine Studio",
  },
  {
    id: "rev-2",
    reviewerName: "Alex Rivera",
    reviewerRole: "Lead Developer",
    company: "TechFlow Systems",
    reviewText:
      "The attention to detail is unparalleled. DevEngine provided an architectural foundation that accelerated our time-to-market by months. Simply exceptional engineering.",
    rating: 5,
    status: "APPROVED",
    featured: true,
    createdAt: new Date().toISOString(),
    orderId: "ORD-002",
    serviceName: "Enterprise Stack",
  },
  {
    id: "rev-3",
    reviewerName: "Elena Lin",
    reviewerRole: "Creative Director",
    company: "Apex Studio",
    reviewText:
      "A game-changer for our studio. The clean architecture and premium design components let us focus on what really matters. 10/10 craftsmanship.",
    rating: 5,
    status: "APPROVED",
    featured: true,
    createdAt: new Date().toISOString(),
    orderId: "ORD-003",
    serviceName: "UI/UX Engineering",
  },
  {
    id: "rev-4",
    reviewerName: "Marcus Vance",
    reviewerRole: "CTO",
    company: "QuantumPulse Labs",
    reviewText:
      "DevEngine transformed our cloud infrastructure into an ultra-low latency ecosystem. Outstanding performance, rock-solid security, and cinematic execution.",
    rating: 5,
    status: "APPROVED",
    featured: true,
    createdAt: new Date().toISOString(),
    orderId: "ORD-004",
    serviceName: "Cloud Systems",
  },
];

interface SystemShowcaseProps {
  onEnterConsole?: () => void;
}

export default function SystemShowcase({ onEnterConsole }: SystemShowcaseProps) {
  const reduceMotion = !!useReducedMotion();
  const heroRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTab, setActiveTab] = useState<"orbit" | "matrix" | "reviews">("orbit");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<System3DIconItem | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Review carousel states
  const [reviews, setReviews] = useState<ReviewRecord[]>(VERIFIED_REVIEWS);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isReviewPaused, setIsReviewPaused] = useState(false);

  // Load reviews from service if available
  useEffect(() => {
    let active = true;
    getPublicApprovedReviews()
      .then((items) => {
        if (!active) return;
        const eligible = items.filter(
          (item) => item.status === "APPROVED" && item.reviewText?.trim()
        );
        if (eligible.length > 0) {
          setReviews(eligible);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Auto-advance reviews carousel one by one
  useEffect(() => {
    if (activeTab !== "reviews" || isReviewPaused || reduceMotion) return;
    const timer = setInterval(() => {
      setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [activeTab, isReviewPaused, reduceMotion, reviews.length]);

  // Tab switcher with immediate guaranteed scroll-to-top
  const handleSwitchTab = useCallback((tab: "orbit" | "matrix" | "reviews") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const scrollParent =
        heroRef.current?.closest("[class*='ready']") ||
        heroRef.current?.parentElement ||
        (document.querySelector("[class*='ready']") as HTMLElement | null);

      if (scrollParent) {
        scrollParent.scrollTop = 0;
        try {
          scrollParent.scrollTo({ top: 0, behavior: "auto" });
        } catch (_) {}
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, []);

  // Guarantee scroll-to-top whenever activeTab changes from any interaction
  useEffect(() => {
    if (typeof window !== "undefined") {
      const scrollParent =
        heroRef.current?.closest("[class*='ready']") ||
        heroRef.current?.parentElement ||
        (document.querySelector("[class*='ready']") as HTMLElement | null);

      if (scrollParent) {
        scrollParent.scrollTop = 0;
      }
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [activeTab]);

  const handleNextReview = () => {
    setCurrentReviewIndex((prev) => (prev + 1) % reviews.length);
  };

  const handlePrevReview = () => {
    setCurrentReviewIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  // Fullscreen 3D Orbital Physics Loop
  useEffect(() => {
    if (activeTab !== "orbit") return;
    const hero = heroRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!hero || !stage || !canvas) return;

    const ctx = canvas.getContext("2d");
    const ring1Nodes = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-ring='1']")
    );
    const ring2Nodes = Array.from(
      stage.querySelectorAll<HTMLElement>("[data-ring='2']")
    );

    let heroW = 0;
    let heroH = 0;
    let dpr = 1;
    let phase1 = 0;
    let phase2 = Math.PI * 0.45;
    let speed = 1;
    let frame = 0;
    let last = performance.now();
    const born = performance.now();
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const trail: { x: number; y: number; t: number }[] = [];
    let inked = false;
    let isInteracting = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragPhaseStart1 = 0;
    let dragPhaseStart2 = 0;

    const measure = () => {
      heroW = hero.clientWidth;
      heroH = hero.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(heroW * dpr);
      canvas.height = Math.round(heroH * dpr);
    };

    const layout = (now: number) => {
      if (!heroW || !heroH) return;
      const centerX = heroW / 2;
      const centerY = heroH / 2;

      const isNarrow = heroW < 768;
      const isShort = heroH < 780;
      const cardHalf = isNarrow ? 24 : isShort ? 32 : 44;

      // Adaptive full-screen orbit radii for desktop, laptop and mobile portrait
      const rx1 = isNarrow
        ? Math.min(heroW * 0.42, 160)
        : Math.min(heroW * 0.34, Math.max(280, heroW * 0.3));
      const ry1 = isNarrow
        ? Math.min(heroH * 0.33, 220)
        : isShort
        ? Math.min(heroH * 0.22, 140)
        : Math.min(heroH * 0.28, Math.max(160, heroH * 0.24));
      const rx2 = isNarrow
        ? Math.min(heroW * 0.48, 185)
        : Math.min(heroW * 0.47, Math.max(440, heroW * 0.43));
      const ry2 = isNarrow
        ? Math.min(heroH * 0.43, 290)
        : isShort
        ? Math.min(heroH * 0.32, 210)
        : Math.min(heroH * 0.4, Math.max(250, heroH * 0.35));

      const tilt1 = isNarrow ? -0.1 : -0.18;
      const tilt2 = isNarrow ? 0.12 : 0.22;

      // Layout Ring 1 (10 Core Items)
      ring1Nodes.forEach((node, i) => {
        const total = ring1Nodes.length;
        const a = phase1 + (i * TAU) / total;
        const intro = reduceMotion
          ? 1
          : Math.min(1, Math.max(0, (now - born - 180 - i * 50) / 900));

        const rawX = Math.cos(a) * rx1;
        const rawZ = Math.sin(a);
        const rawY = Math.sin(a) * ry1 + rawX * Math.sin(tilt1);

        const depth = (rawZ + 1) / 2;
        const scale = (isNarrow ? 0.72 + 0.34 * depth : 0.74 + 0.44 * depth) * intro;
        const opacity = (isNarrow ? 0.6 + 0.4 * depth : 0.5 + 0.5 * depth) * intro;

        const posX = centerX + rawX + pointer.x * (isNarrow ? 12 : 24) * (0.4 + depth);
        const posY = centerY + rawY + pointer.y * (isNarrow ? 10 : 18) * (0.4 + depth);

        node.style.transform = `translate3d(${(posX - cardHalf).toFixed(1)}px, ${(
          posY - cardHalf
        ).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        node.style.opacity = opacity.toFixed(3);
        node.style.zIndex = String(Math.round(depth * (isNarrow ? 15 : 25)));
      });

      // Layout Ring 2 (14 Outer Ecosystem Items - Counter-Orbiting)
      ring2Nodes.forEach((node, i) => {
        const total = ring2Nodes.length;
        const a = phase2 + (i * TAU) / total;
        const intro = reduceMotion
          ? 1
          : Math.min(1, Math.max(0, (now - born - 250 - i * 40) / 950));

        const rawX = Math.cos(a) * rx2;
        const rawZ = Math.sin(a);
        const rawY = Math.sin(a) * ry2 + rawX * Math.sin(tilt2);

        const depth = (rawZ + 1) / 2;
        const scale = (isNarrow ? 0.68 + 0.38 * depth : 0.7 + 0.46 * depth) * intro;
        const opacity = (isNarrow ? 0.55 + 0.45 * depth : 0.45 + 0.55 * depth) * intro;

        const posX = centerX + rawX + pointer.x * (isNarrow ? 16 : 32) * (0.4 + depth);
        const posY = centerY + rawY + pointer.y * (isNarrow ? 12 : 22) * (0.4 + depth);

        node.style.transform = `translate3d(${(posX - cardHalf).toFixed(1)}px, ${(
          posY - cardHalf
        ).toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
        node.style.opacity = opacity.toFixed(3);
        node.style.zIndex = String(Math.round(depth * (isNarrow ? 18 : 30)));
      });
    };

    // Fullscreen glowing cyan neon ink trail
    const drawInk = (now: number) => {
      if (!ctx) return;
      while (trail.length && now - trail[0].t > 650) trail.shift();
      if (!trail.length) {
        if (inked) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          inked = false;
        }
        return;
      }
      inked = true;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = "rgba(44, 236, 247, 0.9)";
      ctx.shadowBlur = 16 * dpr;

      for (let i = 1; i < trail.length; i++) {
        const age = 1 - (now - trail[i].t) / 650;
        if (age <= 0) continue;
        ctx.strokeStyle = `rgba(44, 236, 247, ${(age * 0.85).toFixed(3)})`;
        ctx.lineWidth = (1.5 + 6 * age) * dpr;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x * dpr, trail[i - 1].y * dpr);
        ctx.lineTo(trail[i].x * dpr, trail[i].y * dpr);
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      if (!isDragging) {
        const targetSpeed = isPaused || isInteracting ? 0.08 : 1;
        speed += (targetSpeed - speed) * (1 - Math.exp(-dt * 0.006));
        phase1 += dt * 0.00011 * speed;
        phase2 -= dt * 0.000085 * speed;
      }

      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 0.005));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 0.005));

      layout(now);
      drawInk(now);
      frame = requestAnimationFrame(tick);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      hero.style.setProperty("--mx", `${x}px`);
      hero.style.setProperty("--my", `${y}px`);

      pointer.tx = (x / rect.width - 0.5) * 2;
      pointer.ty = (y / rect.height - 0.5) * 2;

      if (isDragging) {
        const delta = (e.clientX - dragStartX) * 0.006;
        phase1 = dragPhaseStart1 + delta;
        phase2 = dragPhaseStart2 - delta * 0.85;
      }

      if (!reduceMotion) {
        trail.push({ x, y, t: performance.now() });
        if (trail.length > 45) trail.shift();
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      isDragging = true;
      dragStartX = e.clientX;
      dragPhaseStart1 = phase1;
      dragPhaseStart2 = phase2;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerLeave = () => {
      pointer.tx = 0;
      pointer.ty = 0;
      isDragging = false;
      isInteracting = false;
    };

    const onPointerOver = (e: PointerEvent) => {
      if ((e.target as Element).closest("[data-node-id]")) {
        isInteracting = true;
      }
    };

    const onPointerOut = () => {
      isInteracting = false;
    };

    measure();
    layout(performance.now());

    const ro = new ResizeObserver(() => {
      measure();
      layout(performance.now());
    });
    ro.observe(hero);

    hero.addEventListener("pointermove", onPointerMove, { passive: true });
    hero.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);
    hero.addEventListener("pointerleave", onPointerLeave);
    stage.addEventListener("pointerover", onPointerOver);
    stage.addEventListener("pointerout", onPointerOut);

    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      hero.removeEventListener("pointermove", onPointerMove);
      hero.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      hero.removeEventListener("pointerleave", onPointerLeave);
      stage.removeEventListener("pointerover", onPointerOver);
      stage.removeEventListener("pointerout", onPointerOut);
    };
  }, [activeTab, isPaused, reduceMotion]);

  const handleNodeClick = useCallback((node: System3DIconItem) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const currentReview = reviews[currentReviewIndex] || reviews[0];

  return (
    <section
      ref={heroRef}
      className={styles.fullscreenHero}
      aria-label="DevEngine System Architecture and 3D Ecosystem"
    >
      {/* Ambient Cyber Lighting & Background Canvas */}
      <div className={styles.stageBg} aria-hidden="true">
        <span className={`${styles.blob} ${styles.blobA}`} />
        <span className={`${styles.blob} ${styles.blobB}`} />
        <span className={styles.gridPattern} />
        <span className={styles.spotlight} />
      </div>
      <canvas ref={canvasRef} className={styles.ink} aria-hidden="true" />

      {/* Top Floating Control Bar */}
      <div className={styles.topControls}>
        <div className={styles.topPills}>
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} aria-hidden="true" />
            <span>24 / 24 Ecosystem Nodes Active</span>
          </div>

          {activeTab === "orbit" && (
            <div className={styles.categoryChips} role="tablist">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`${styles.catChip} ${
                    selectedCategory === cat.id ? styles.catChipActive : ""
                  }`}
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.viewGroup}>
          <div className={styles.viewTabs}>
            <button
              type="button"
              className={`${styles.viewTab} ${
                activeTab === "orbit" ? styles.viewTabActive : ""
              }`}
              onClick={() => handleSwitchTab("orbit")}
            >
              3D Orbit
            </button>
            <button
              type="button"
              className={`${styles.viewTab} ${
                activeTab === "matrix" ? styles.viewTabActive : ""
              }`}
              onClick={() => handleSwitchTab("matrix")}
            >
              All 24 Nodes
            </button>
            <button
              type="button"
              className={`${styles.viewTab} ${
                activeTab === "reviews" ? styles.viewTabActive : ""
              }`}
              onClick={() => handleSwitchTab("reviews")}
            >
              Reviews
            </button>
          </div>

          {activeTab === "orbit" && (
            <button
              type="button"
              className={styles.pauseBtn}
              onClick={() => setIsPaused((prev) => !prev)}
              aria-label={isPaused ? "Resume 3D rotation" : "Pause 3D rotation"}
              title={isPaused ? "Resume Orbit" : "Pause Orbit"}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                {isPaused ? "play_arrow" : "pause"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: EXPANSIVE FULLSCREEN 3D ORBIT */}
      {activeTab === "orbit" && (
        <div className={styles.fullscreenOrbitArea}>
          {/* Central Cosmic Holographic Rings */}
          <div className={styles.cosmicHalo} aria-hidden="true">
            <span className={styles.haloRingA} />
            <span className={styles.haloRingB} />
            <span className={styles.haloGlow} />
          </div>

          {/* Central Integrated Hero Copy */}
          <div className={styles.centerCopy}>
            <div className={styles.centerBadge}>
              <span className={styles.liveDot} aria-hidden="true" />
              All 24 Ecosystem Nodes Ready
            </div>
            <h1 className={`${styles.heading} font-space-grotesk`}>
              System <span className={styles.shimmer}>Ready</span>
            </h1>
            <p className={styles.heroDescription}>
              The digital architecture has been successfully initialized. All 24 core engineering
              modules and cloud subsystems are active and awaiting commands.
            </p>

            <div className={styles.heroActions}>
              <button
                type="button"
                onClick={onEnterConsole}
                className={styles.enterButton}
              >
                Enter Console <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                onClick={() => handleSwitchTab("matrix")}
                className={styles.matrixBtn}
              >
                Explore All 24 Nodes
              </button>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <strong className={styles.statValue}>24 / 24</strong>
                <span className={styles.statLabel}>Nodes Online</span>
              </div>
              <div className={styles.stat}>
                <strong className={styles.statValue}>99.98%</strong>
                <span className={styles.statLabel}>System Health</span>
              </div>
              <div className={styles.stat}>
                <strong className={styles.statValue}>1.4ms</strong>
                <span className={styles.statLabel}>Core Telemetry</span>
              </div>
            </div>
          </div>

          {/* Fullscreen 3D Orbital Nodes (Revolving across entire viewport) */}
          <div ref={stageRef} className={styles.orbitStage}>
            {SYSTEM_3D_ICONS.map((node) => {
              const isFilteredOut =
                selectedCategory !== "all" && node.category !== selectedCategory;
              const isSelected = selectedNode?.id === node.id;
              const isHovered = hoveredNodeId === node.id;

              return (
                <div
                  key={node.id}
                  className={`${styles.orbitNode} ${
                    isFilteredOut ? styles.nodeDimmed : ""
                  } ${isSelected ? styles.nodeSelected : ""}`}
                  data-node-id={node.id}
                  data-ring={node.ring}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={() => handleNodeClick(node)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.name} (${node.categoryLabel}) - ${node.status}`}
                >
                  <div className={styles.nodeCard}>
                    <img
                      src={`/assets/3D_Icons/${node.file}`}
                      alt={node.name}
                      className={styles.nodeImage}
                      draggable={false}
                      loading="eager"
                    />
                    <span className={styles.nodePing} aria-hidden="true" />
                  </div>

                  {/* Hover Tooltip Pill */}
                  {(isHovered || isSelected) && (
                    <div className={styles.nodeTooltip}>
                      <strong>{node.name}</strong>
                      <span>{node.latency}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected Node Floating HUD */}
          <AnimatePresence>
            {selectedNode && (
              <motion.div
                className={styles.nodeDetailHud}
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className={styles.hudHeader}>
                  <img
                    src={`/assets/3D_Icons/${selectedNode.file}`}
                    alt={selectedNode.name}
                    className={styles.hudThumb}
                  />
                  <div>
                    <h3 className={styles.hudTitle}>{selectedNode.name}</h3>
                    <p className={styles.hudSub}>{selectedNode.categoryLabel}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.hudClose}
                    onClick={() => setSelectedNode(null)}
                    aria-label="Close node details"
                  >
                    ×
                  </button>
                </div>
                <div className={styles.hudMetrics}>
                  <div className={styles.hudMetric}>
                    <span>STATUS</span>
                    <strong className={styles.accentText}>
                      ● {selectedNode.status}
                    </strong>
                  </div>
                  <div className={styles.hudMetric}>
                    <span>LATENCY</span>
                    <strong>{selectedNode.latency}</strong>
                  </div>
                  <div className={styles.hudMetric}>
                    <span>ORBIT</span>
                    <strong>RING 0{selectedNode.ring}</strong>
                  </div>
                </div>
                <p className={styles.hudTag}>{selectedNode.tag}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* VIEW 2: FULLSCREEN BENTO MATRIX (ALL 24 NODES FULLY VISIBLE & SCROLLABLE) */}
      {activeTab === "matrix" && (
        <div className={styles.matrixView}>
          <div className={styles.matrixHeader}>
            <p className={styles.matrixEyebrow}>DevEngine Active Stack</p>
            <h2 className={styles.matrixTitle}>
              24 Enterprise <span>Ecosystem Nodes</span>
            </h2>
            <p className={styles.matrixSubtitle}>
              Every library, database, mobile runtime, and cloud delivery system powering our
              digital infrastructure.
            </p>
          </div>

          <div className={styles.bentoGrid}>
            {SYSTEM_3D_ICONS.map((item) => (
              <div
                key={item.id}
                className={styles.bentoCard}
                onClick={() => {
                  setSelectedNode(item);
                  handleSwitchTab("orbit");
                }}
                role="button"
                tabIndex={0}
              >
                <div className={styles.bentoThumbWrap}>
                  <img
                    src={`/assets/3D_Icons/${item.file}`}
                    alt={item.name}
                    className={styles.bentoThumb}
                  />
                </div>
                <div className={styles.bentoInfo}>
                  <div className={styles.bentoTop}>
                    <h3 className={styles.bentoName}>{item.name}</h3>
                    <span className={styles.bentoLatency}>{item.latency}</span>
                  </div>
                  <p className={styles.bentoCat}>{item.categoryLabel}</p>
                  <p className={styles.bentoTag}>{item.tag}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: FULLSCREEN AUTO-ANIMATED REVIEWS CAROUSEL (ONE BY ONE) */}
      {activeTab === "reviews" && (
        <div className={styles.reviewsView}>
          <div className={styles.matrixHeader}>
            <p className={styles.matrixEyebrow}>Client Verification</p>
            <h2 className={styles.matrixTitle}>
              Engineered with <span>Excellence</span>
            </h2>
            <p className={styles.matrixSubtitle}>
              Direct feedback from visionary leaders deploying DevEngine architectures.
            </p>
          </div>

          <div
            className={styles.carouselStage}
            onMouseEnter={() => setIsReviewPaused(true)}
            onMouseLeave={() => setIsReviewPaused(false)}
          >
            <AnimatePresence mode="wait">
              {currentReview && (
                <motion.article
                  key={currentReview.id}
                  className={styles.reviewCardSolo}
                  initial={
                    reduceMotion
                      ? { opacity: 1 }
                      : { opacity: 0, x: 35, filter: "blur(6px)" }
                  }
                  animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : { opacity: 0, x: -35, filter: "blur(6px)" }
                  }
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className={styles.starsRow}>
                    <div className={styles.stars} aria-hidden="true">
                      {Array.from({ length: 5 }, (_, star) => (
                        <span
                          key={star}
                          data-filled={
                            star <
                            Math.max(1, Math.min(5, Math.round(currentReview.rating)))
                          }
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className={styles.quoteGlyph} aria-hidden="true">
                      “
                    </span>
                  </div>

                  <blockquote className={styles.reviewQuoteSolo}>
                    "{currentReview.reviewText}"
                  </blockquote>

                  <div className={styles.reviewerRow}>
                    <span
                      className={`${styles.avatar} ${
                        currentReview.avatarUrl ? styles.avatarWithImage : ""
                      }`}
                    >
                      {currentReview.avatarUrl ? (
                        <img
                          src={currentReview.avatarUrl}
                          alt={currentReview.reviewerName}
                          className={styles.avatarImg}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        currentReview.reviewerName?.trim().slice(0, 1).toUpperCase() || "D"
                      )}
                    </span>
                    <div>
                      <p className={styles.revName}>{currentReview.reviewerName}</p>
                      <p className={styles.revRole}>
                        {[currentReview.reviewerRole, currentReview.company]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                </motion.article>
              )}
            </AnimatePresence>

            {/* Carousel Controls */}
            <div className={styles.carouselControls}>
              <button
                type="button"
                className={styles.carouselNavBtn}
                onClick={handlePrevReview}
                aria-label="Previous review"
                title="Previous"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_left
                </span>
              </button>

              <div className={styles.dotsList} aria-label="Review pagination">
                {reviews.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`${styles.dotItem} ${
                      currentReviewIndex === idx ? styles.dotItemActive : ""
                    }`}
                    onClick={() => setCurrentReviewIndex(idx)}
                    aria-label={`Go to review ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                className={styles.carouselNavBtn}
                onClick={handleNextReview}
                aria-label="Next review"
                title="Next"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  chevron_right
                </span>
              </button>

              <button
                type="button"
                className={styles.carouselNavBtn}
                onClick={() => setIsReviewPaused((prev) => !prev)}
                aria-label={isReviewPaused ? "Play auto rotation" : "Pause auto rotation"}
                title={isReviewPaused ? "Resume auto play" : "Pause auto play"}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {isReviewPaused ? "play_arrow" : "pause"}
                </span>
              </button>

              <span className={styles.counterPill}>
                {String(currentReviewIndex + 1).padStart(2, "0")} /{" "}
                {String(reviews.length).padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full-bleed Continuous Marquee of All 24 Nodes */}
      <div className={styles.marqueeWrap}>
        <div className={styles.marqueeTrack}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.marqueeHalf} aria-hidden={copy === 1}>
              {SYSTEM_3D_ICONS.map((item) => (
                <button
                  key={`${copy}-${item.id}`}
                  type="button"
                  className={`${styles.tickerChip} ${
                    selectedNode?.id === item.id ? styles.tickerChipActive : ""
                  }`}
                  onClick={() => {
                    setSelectedNode(item);
                    if (activeTab !== "orbit") handleSwitchTab("orbit");
                  }}
                >
                  <img
                    src={`/assets/3D_Icons/${item.file}`}
                    alt=""
                    className={styles.tickerThumb}
                    aria-hidden="true"
                  />
                  <span>{item.name}</span>
                  <span className={styles.tickerDot} />
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
