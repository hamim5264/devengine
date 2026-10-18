import type { MobileConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function MobileSection({ config }: { config: MobileConfig }) {
  return <section className={styles.section}><div className={`${styles.inner} ${styles.split}`}>
    <Reveal className={styles.phoneScene} direction="right" scale={0.92}>
      <div className={`${styles.frontPhone} ${motionStyles.floatA}`}><img src={config.phone1ImageUrl} alt="Primary mobile application preview" loading="lazy" decoding="async" /></div>
      <div className={`${styles.backPhone} ${motionStyles.floatB}`}><img src={config.phone2ImageUrl} alt="Second mobile application preview" loading="lazy" decoding="async" /></div>
    </Reveal>
    <Reveal className={`${styles.copy} ${styles.mobileCopy}`} direction="left" delay={0.1}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2><p className={styles.body}>{config.description}</p></Reveal>
  </div></section>;
}
