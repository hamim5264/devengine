import type { DefenseConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function DefenseSection({ config }: { config: DefenseConfig }) {
  return <section className={styles.section}><Reveal className={`${styles.card} ${styles.defenseCard} ${motionStyles.glowCard}`} scale={0.95} duration={1}>
    <div className={styles.iconTile} aria-hidden="true"><span className="material-symbols-outlined">account_balance</span></div>
    <h2 className={styles.heading}>{config.title}</h2><p className={styles.body}>{config.description}</p>
  </Reveal></section>;
}
