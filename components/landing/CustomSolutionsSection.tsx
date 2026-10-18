import type { CustomSolutionsConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function CustomSolutionsSection({ config }: { config: CustomSolutionsConfig }) {
  const large = config.cards.find((card) => card.isLarge) || config.cards[0];
  const others = config.cards.filter((card) => card !== large);
  return <section id="services" className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <div className={styles.solutionsGrid}>
      {large && <Reveal as="article" className={`${styles.card} ${styles.solutionLarge} ${motionStyles.lift}`} direction="right">
        {large.imageUrl && <img src={large.imageUrl} alt={large.title} className={styles.solutionImage} loading="lazy" decoding="async" />}
        <div className={styles.solutionContent}><div className={styles.iconTile} aria-hidden="true"><span className="material-symbols-outlined">{large.icon || "cloud_sync"}</span></div><h3 className={styles.cardTitle}>{large.title}</h3><p className={styles.cardBody}>{large.description}</p></div>
      </Reveal>}
      {others.map((card, index) => <Reveal as="article" className={`${styles.card} ${styles.smallSolution} ${motionStyles.lift}`} key={index} direction="left" delay={0.1 + index * 0.12}>
        <div className={styles.iconTile} aria-hidden="true"><span className="material-symbols-outlined">{card.icon || "security"}</span></div><h3 className={styles.cardTitle}>{card.title}</h3><p className={styles.cardBody}>{card.description}</p>
      </Reveal>)}
    </div>
  </div></section>;
}
