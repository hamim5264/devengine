import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { IntroConfig } from "@/types/landing";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const word: Variants = {
  hidden: { opacity: 0, y: "0.55em", filter: "blur(10px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

function Words({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\s+/).filter(Boolean);
  return <>{parts.map((part, index) => <span key={`${part}-${index}`}><motion.span variants={word} className={`${motionStyles.introWord} ${className || ""}`}>{part}</motion.span>{index < parts.length - 1 ? " " : ""}</span>)}</>;
}

export default function ImmersiveIntro({ config }: { config: IntroConfig }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) {
    return <section className={styles.section}><div className={styles.intro}>
      <h2 className={styles.heading}>{config.headingPrefix}<br /><span className={styles.highlight}>{config.headingHighlight}</span></h2>
    </div></section>;
  }
  return <section className={styles.section}><div className={styles.intro}>
    <motion.h2 className={styles.heading} variants={container} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }}>
      <Words text={config.headingPrefix} /><br /><Words text={config.headingHighlight} className={motionStyles.glowText} />
    </motion.h2>
  </div></section>;
}
