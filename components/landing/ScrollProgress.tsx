import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import styles from "./LandingMotion.module.css";

export default function ScrollProgress() {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.3 });
  if (reduceMotion) return null;
  return <motion.div className={styles.progress} style={{ scaleX }} aria-hidden="true" />;
}
