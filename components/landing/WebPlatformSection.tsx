import type { WebPlatformConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function WebPlatformSection({ config }: { config: WebPlatformConfig }) {
  return <section className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <Reveal className={`${styles.card} ${styles.webFrame} ${motionStyles.lift}`} scale={0.94} duration={1} delay={0.1}>
      <div className={styles.browserBar}><span className={styles.browserDots} aria-hidden="true"><i /><i /><i /></span><span className={styles.browserAddress}>{config.browserUrl}</span></div>
      <div className={styles.webImage}><img src={config.screenImageUrl} alt={config.title || "Enterprise platform preview"} loading="lazy" decoding="async" /></div>
    </Reveal>
  </div></section>;
}
