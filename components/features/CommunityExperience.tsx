import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { BlogAuthor, BlogPost } from "@/types/blog";
import { BLOG_CATEGORY_CONFIG, getBlogCategoryDetails } from "@/types/blog";
import { Icon } from "./FeatureExperience";
import styles from "./Community.module.css";

/** These reading-focused screens use opacity only, without parallax or moving text. */
export function SoftReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, amount: 0.08 }} transition={{ duration: reduced ? 0 : 0.4, ease: "easeOut" }}>{children}</motion.div>;
}

export function CommunityImage({ src, alt, priority = false }: { src?: string; alt: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (!src || failed) return <div className={styles.coverFallback}><Icon name="auto_stories" /><span>DevEngine Chronicles</span></div>;
  return <img className={styles.coverImage} src={src} alt={alt} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" onError={() => setFailed(true)} />;
}

export function Person({ name, role, avatarUrl }: { name: string; role?: string; avatarUrl?: string }) {
  const initials = name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "DE";
  return <div className={styles.person}><span className={styles.avatar} aria-hidden="true">{initials}{avatarUrl && <img key={avatarUrl} src={avatarUrl} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none"; }} />}</span><span className={styles.personText}><strong>{name}</strong>{role && <span>{role}</span>}</span></div>;
}

export function Author({ author }: { author: BlogAuthor }) {
  return <Person name={author.name} role={author.role} avatarUrl={author.avatarUrl} />;
}

export function SearchField({ value, onChange, label, placeholder, id }: { value: string; onChange: (value: string) => void; label: string; placeholder: string; id: string }) {
  return <div className={styles.search}><label className={styles.srOnly} htmlFor={id}>{label}</label><Icon name="search" /><input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" />{value && <button type="button" onClick={() => onChange("")} aria-label={`Clear ${label.toLowerCase()}`}><Icon name="close" /></button>}</div>;
}

export function Stars({ rating }: { rating: number }) {
  const value = Math.min(5, Math.max(0, rating));
  return <span className={styles.stars} role="img" aria-label={`${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map((star) => <span key={star} className={`${styles.star} ${star <= value ? styles.starFilled : ""}`} aria-hidden="true">★</span>)}</span>;
}

export function BlogCard({ post, compact = false, headingLevel = "h2" }: { post: BlogPost; compact?: boolean; headingLevel?: "h2" | "h3" }) {
  const category = getBlogCategoryDetails(post.category);
  const featured = !compact && (post.featured || post.gridSpan === "hero");
  const Heading = headingLevel;

  let layoutClass = "";
  if (compact) {
    layoutClass = styles.blogCompact;
  } else if (featured) {
    layoutClass = styles.blogHero;
  } else {
    switch (post.gridSpan) {
      case "wide":
        layoutClass = styles.blogWide;
        break;
      case "tall":
        layoutClass = styles.blogTall;
        break;
      case "split":
        layoutClass = styles.blogSplit;
        break;
      case "quad":
        layoutClass = styles.blogQuad;
        break;
      case "spotlight":
        layoutClass = styles.blogSpotlight;
        break;
      case "compact":
        layoutClass = styles.blogCompactMini;
        break;
      case "overlay":
        layoutClass = styles.blogOverlay;
        break;
      case "strip":
        layoutClass = styles.blogStrip;
        break;
      default:
        layoutClass = "";
        break;
    }
  }

  const isOverlay = !compact && post.gridSpan === "overlay";
  const isSpotlight = !compact && post.gridSpan === "spotlight";
  const isStrip = !compact && post.gridSpan === "strip";
  const isMini = !compact && post.gridSpan === "compact";

  return (
    <article className={`${styles.blogCard} ${layoutClass}`}>
      <Link className={styles.coverLink} href={`/blog/${post.slug}`} tabIndex={-1} aria-hidden="true">
        <CommunityImage src={post.coverImage} alt="" priority={featured || post.gridSpan === "hero" || post.gridSpan === "quad"} />
      </Link>
      {isOverlay && <div className={styles.overlayBackdrop} aria-hidden="true" />}
      <div className={styles.blogCopy}>
        {isSpotlight && !post.featured && (
          <span className={styles.spotlightBadge}>
            <Icon name="flare" /> Spotlight Story
          </span>
        )}
        <div className={styles.articleMeta}>
          <span className={styles.category}>
            <Icon name={category.icon} />
            {category.label}
          </span>
          <span>{post.readTime}</span>
          {typeof (post.readsCount ?? post.views) === "number" && (post.readsCount ?? post.views ?? 0) > 0 && (
            <span className={styles.metaReads}>
              <Icon name="visibility" />
              <span>{(post.readsCount ?? post.views)?.toLocaleString()}</span>
            </span>
          )}
        </div>
        {post.pinned ? <span className={styles.featuredLabel}><Icon name="keep" /> Pinned</span> : post.featured && !compact && <span className={styles.featuredLabel}>Editor’s pick</span>}
        <Heading className={styles.blogTitle}>
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </Heading>
        {!isMini && <p className={styles.excerpt}>{post.excerpt}</p>}
        {!compact && !isMini && !isStrip && post.tags?.length > 0 && (
          <div className={styles.tags}>
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
        <div className={styles.blogFooter}>
          <Author author={post.author} />
          <Link className={styles.readLink} href={`/blog/${post.slug}`} aria-label={`Read ${post.title}`}>
            Read story <Icon name="arrow_forward" />
          </Link>
        </div>
      </div>
    </article>
  );
}
