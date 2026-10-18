import type { TechStackConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

function Row({ items, reverse, duration }: { items: string[]; reverse?: boolean; duration: number }) {
  // Repeat short lists so each half is always wider than a large screen, then duplicate for a seamless loop.
  const repeats = Math.max(1, Math.ceil(10 / Math.max(1, items.length)));
  const half = Array.from({ length: repeats }, () => items).flat();
  return <div className={motionStyles.marquee} aria-hidden="true">
    <div className={`${motionStyles.track} ${reverse ? motionStyles.trackReverse : ""}`} style={{ ["--dur" as string]: `${duration}s` }}>
      {[0, 1].map((copy) => <div className={motionStyles.half} key={copy}>{half.map((tech, index) => <span className={motionStyles.chip} key={`${copy}-${tech}-${index}`}>{tech}</span>)}</div>)}
    </div>
  </div>;
}

export default function TechStackSection({ config }: { config: TechStackConfig }) {
  const list = config.techList;
  const middle = Math.ceil(list.length / 2);
  const rowOne = list.length > 5 ? list.slice(0, middle) : list;
  const rowTwo = list.length > 5 ? list.slice(middle) : [...list].reverse();
  return <section className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <ul className={motionStyles.srOnly} aria-label="Technologies we work with">{list.map((tech, index) => <li key={`${tech}-${index}`}>{tech}</li>)}</ul>
    <Reveal className={motionStyles.marqueeWrap} delay={0.1}>
      <Row items={rowOne} duration={Math.max(28, rowOne.length * 5)} />
      <Row items={rowTwo} reverse duration={Math.max(32, rowTwo.length * 5.5)} />
    </Reveal>
  </div></section>;
}
