import { createElement, useRef, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Direction = "up" | "down" | "left" | "right" | "none";
type Tag = "div" | "article" | "figure" | "li" | "section";

const TAGS = {
  div: motion.div,
  article: motion.article,
  figure: motion.figure,
  li: motion.li,
  section: motion.section,
} as const;

interface RevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: Tag;
  /** Direction of travel while revealing (e.g. "up" slides the element upwards into place). */
  direction?: Direction;
  delay?: number;
  distance?: number;
  duration?: number;
  /** Starting scale, animates to 1. */
  scale?: number;
  attrs?: Record<string, string | number | boolean | undefined>;
}

/**
 * Scroll-triggered reveal. Once finished, inline transform/filter/opacity are cleared so the
 * element behaves like a normal node afterwards (CSS hover transforms and absolutely positioned
 * children keep working).
 */
export default function Reveal({
  children,
  className,
  style,
  as = "div",
  direction = "up",
  delay = 0,
  distance = 40,
  duration = 0.85,
  scale = 1,
  attrs,
}: RevealProps) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  if (reduceMotion) {
    return createElement(as, { className, style, ...(attrs || {}) }, children);
  }

  const Component = TAGS[as] as typeof motion.div;
  const offsets: Record<Direction, { x?: number; y?: number }> = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <Component
      ref={ref}
      className={className}
      style={style}
      {...(attrs || {})}
      initial={{ opacity: 0, filter: "blur(6px)", scale, ...offsets[direction] }}
      whileInView={{ opacity: 1, filter: "blur(0px)", scale: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -6% 0px" }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        const el = ref.current;
        if (!el) return;
        el.style.transform = "";
        el.style.filter = "";
        el.style.opacity = "";
      }}
    >
      {children}
    </Component>
  );
}
