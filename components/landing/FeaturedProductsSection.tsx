import Link from "next/link";
import type { FeaturedProductsConfig } from "@/types/landing";
import Reveal from "./Reveal";
import styles from "./Landing.module.css";
import motionStyles from "./LandingMotion.module.css";

export default function FeaturedProductsSection({ config }: { config: FeaturedProductsConfig }) {
  return <section id="products" className={styles.section}><div className={styles.inner}>
    <Reveal className={styles.sectionHeading}><p className={styles.eyebrow}>{config.tag}</p><h2 className={styles.heading}>{config.title}</h2></Reveal>
    <div className={styles.productGrid}>{config.products.map((product, index) => <Reveal as="article" key={index} delay={(index % 2) * 0.12} className={`${styles.card} ${styles.productCard} ${motionStyles.lift}`}>
      {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className={styles.productImage} loading="lazy" decoding="async" /> : <div className={styles.productPlaceholder} aria-hidden="true"><span className="material-symbols-outlined">devices</span></div>}
      <div className={styles.productContent}>
        {product.tag && <p className={styles.eyebrow}>{product.tag}</p>}
        <h3 className={styles.cardTitle}>{product.title}</h3><p className={styles.cardBody}>{product.description}</p>
        {product.link && <Link href={product.link} className={styles.productLink}>Explore {product.title}<span aria-hidden="true">↗</span></Link>}
      </div>
    </Reveal>)}</div>
  </div></section>;
}
