import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import HelixLoader from "@/components/HelixLoader";
import type { BlogPost, BlogCategory } from "@/types/blog";
import { getPublishedBlogs, INITIAL_BLOGS } from "@/lib/services/blogService";
import { FeaturePage, Icon } from "@/components/features/FeatureExperience";
import { BlogCard, SearchField, SoftReveal } from "@/components/features/CommunityExperience";
import base from "@/components/features/Features.module.css";
import styles from "@/components/features/Community.module.css";

const CATEGORIES: { key: BlogCategory | "ALL"; label: string }[] = [
  { key: "ALL", label: "All stories" }, { key: "SUCCESS_STORY", label: "Success stories" }, { key: "ACHIEVEMENT", label: "Achievements" }, { key: "FAILURE_LESSON", label: "Lessons learned" }, { key: "ENGINEERING", label: "Engineering" }, { key: "STUDIO_CULTURE", label: "Studio culture" },
];

export default function BlogIndexPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<BlogCategory | "ALL">("ALL");
  useEffect(() => {
    let mounted = true;
    const fallback = () => INITIAL_BLOGS.filter((post) => post.isPublished).map((post) => ({ ...post, id: `seed-${post.slug}` }));
    getPublishedBlogs().then((list) => { if (mounted) setPosts(list.length ? list : fallback()); }).catch((error) => { console.error("Failed to load blog posts:", error); if (mounted) setPosts(fallback()); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  const filtered = useMemo(() => posts.filter((post) => {
    const query = search.trim().toLowerCase();
    return (category === "ALL" || post.category === category) && (!query || [post.title, post.subtitle, post.excerpt, ...(post.tags || [])].some((value) => value?.toLowerCase().includes(query)));
  }), [posts, search, category]);
  const clearFilters = () => { setSearch(""); setCategory("ALL"); };
  return <FeaturePage><div className={styles.quiet}>
    <Head><title>DevEngine Chronicles | Ideas, Engineering & Studio Stories</title><meta name="description" content="Stories from inside DevEngine: engineering insights, lessons learned, milestones, and the people behind the products." /></Head>
    <section className={`${base.section} ${styles.hero}`}><div className={base.inner}><SoftReveal><div className={styles.heroCopy}><span className={styles.heroLabel}>DevEngine Chronicles / Inside the studio</span><h1 className={styles.title}>Behind the work.<br /><span className={styles.highlight}>Stories worth sharing.</span></h1><p className={styles.intro}>The ideas, breakthroughs, and lessons behind our software. Notes from the people building DevEngine, one thoughtful experience at a time.</p></div></SoftReveal></div></section>
    <section className={base.section} style={{ paddingTop: "1rem" }} aria-label="Browse stories"><div className={base.inner}>
      <div className={styles.sectionHeader}><h2 className={styles.sectionHeading}>The latest from DevEngine.</h2><SearchField id="blog-search" value={search} onChange={setSearch} label="Search stories" placeholder="Search stories, topics, or technology…" /></div>
      <div className={styles.toolbar}><div className={base.filters} aria-label="Filter stories by category">{CATEGORIES.map((item) => <button key={item.key} className={base.filter} type="button" aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item.label}</button>)}</div></div>
      <div className={styles.results}><span role="status">{loading ? "Loading stories…" : `${filtered.length} stor${filtered.length === 1 ? "y" : "ies"}${search.trim() ? ` matching “${search.trim()}”` : ""}`}</span>{(search || category !== "ALL") && <button type="button" className={styles.textButton} onClick={clearFilters}>Clear filters <Icon name="close" /></button>}</div>
      {loading ? <div className={base.empty} role="status"><HelixLoader size={48} color="#2cecf7" /><p className={base.small}>Opening the Chronicles…</p></div> : filtered.length ? <div className={styles.blogGrid}>{filtered.map((post) => <BlogCard post={post} key={post.id} />)}</div> : <div className={`${base.card} ${base.empty}`}><div className={base.emptyIcon}><Icon name="auto_stories" /></div><h2 className={base.cardTitle}>No stories match just yet.</h2><p className={base.body}>Try another topic or clear your filters to explore all the Chronicles.</p><div className={base.actions}><button className={base.button} type="button" onClick={clearFilters}>Show all stories <Icon name="arrow_forward" /></button></div></div>}
    </div></section>
  </div></FeaturePage>;
}
