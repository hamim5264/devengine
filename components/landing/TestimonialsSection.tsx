import type { TestimonialsConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function TestimonialsSection({ config }: { config: TestimonialsConfig }) {
  return <section className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <div className={styles.testimonialGrid}>{config.testimonials.map((item, index) => <Reveal as="figure" className={`${styles.card} ${styles.testimonial} ${motionStyles.lift}`} key={index} delay={(index % 2) * 0.12} scale={0.96}>
      <span className={`material-symbols-outlined ${styles.quoteIcon}`} aria-hidden="true">format_quote</span>
      <blockquote className={styles.quote}>{item.quote}</blockquote><figcaption><p className={styles.author}>{item.name}</p><p className={styles.authorRole}>{item.role}</p></figcaption>
    </Reveal>)}</div>
  </div></section>;
}
