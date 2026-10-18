import type { AILabConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

const SATELLITES = [
  { icon: "neurology", left: "50%", top: "7%" },
  { icon: "hub", left: "91%", top: "68%" },
  { icon: "bolt", left: "12%", top: "70%" },
];

export default function AILabSection({ config }: { config: AILabConfig }) {
  return <section id="lab" className={styles.section}><div className={`${styles.inner} ${styles.split}`}>
    <Reveal className={styles.copy} direction="right"><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2><p className={styles.body}>{config.description}</p></Reveal>
    <Reveal className={motionStyles.aiScene} direction="left" scale={0.9} delay={0.12} attrs={{ "aria-hidden": "true" }}>
      <span className={motionStyles.aiRing} />
      <span className={`${motionStyles.aiRing} ${motionStyles.aiRingInner}`} />
      <span className={motionStyles.aiGlow} />
      <div className={motionStyles.aiOrbit}>{SATELLITES.map((sat) => <div key={sat.icon} className={motionStyles.aiSat} style={{ left: sat.left, top: sat.top }}><span className="material-symbols-outlined">{sat.icon}</span></div>)}</div>
      <div className={motionStyles.aiCore}><span className="material-symbols-outlined">psychology</span></div>
    </Reveal>
  </div></section>;
}
