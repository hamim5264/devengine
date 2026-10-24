import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import HelixLoader from "@/components/HelixLoader";
import { type BlogPost, BLOG_CATEGORY_CONFIG, getBlogCategoryDetails } from "@/types/blog";
import {
  getBlogBySlug,
  getPublishedBlogs,
  INITIAL_BLOGS,
  recordBlogRead,
  enrichBlogWithContextualLinks,
} from "@/lib/services/blogService";
import { FeaturePage, Icon } from "@/components/features/FeatureExperience";
import { Author, BlogCard, CommunityImage, SoftReveal } from "@/components/features/CommunityExperience";
import ArticleContent from "@/components/features/ArticleContent";
import EditorialFeed from "@/components/features/EditorialFeed";
import base from "@/components/features/Features.module.css";
import styles from "@/components/features/Community.module.css";

export default function BlogDetailPage({ initialPost }: { initialPost?: BlogPost | null }) {
  const router = useRouter();
  const slug = typeof router.query.slug === "string" ? router.query.slug : initialPost?.slug;
  const [post, setPost] = useState<BlogPost | null>(initialPost || null);
  const [related, setRelated] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(!initialPost);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [autoScroll, setAutoScroll] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (!slug) { setPost(null); setLoading(false); return; }
    let mounted = true;

    // When server-rendered initialPost is provided for this slug, keep it and fetch related/analytics in the background
    if (initialPost && initialPost.slug === slug) {
      if (!initialPost.id.startsWith("seed-")) {
        recordBlogRead(initialPost.id, initialPost.slug, initialPost.title).then((recorded) => {
          if (recorded && mounted) {
            setPost((prev) =>
              prev ? { ...prev, readsCount: (prev.readsCount ?? prev.views ?? 0) + 1 } : prev
            );
          }
        });
      }
      getPublishedBlogs().then((all) => {
        if (!mounted) return;
        const available = all.length ? all : INITIAL_BLOGS.filter((item) => item.isPublished).map((item) => ({ ...item, id: `seed-${item.slug}` }));
        const others = available.filter((item) => item.slug !== initialPost.slug);
        const relevant = [...others.filter((item) => item.category === initialPost.category), ...others.filter((item) => item.category !== initialPost.category)].slice(0, 3);
        setRelated(relevant);
      }).catch(() => {});
      return () => { mounted = false; };
    }

    setLoading(true); setPost(null); setRelated([]); setCopied(false); setShareUrl("");
    async function load() {
      try {
        const candidate = await getBlogBySlug(slug!);
        let found = candidate?.isPublished ? candidate : null;
        if (!candidate) {
          const fallback = INITIAL_BLOGS.find((item) => item.slug === slug && item.isPublished);
          if (fallback) {
            found = enrichBlogWithContextualLinks({
              ...fallback,
              id: `seed-${fallback.slug}`,
            } as BlogPost);
          }
        }
        if (!mounted) return;
        setPost(found);
        if (found) {
          if (!found.id.startsWith("seed-")) {
            recordBlogRead(found.id, found.slug, found.title).then((recorded) => {
              if (recorded && mounted) {
                setPost((prev) =>
                  prev ? { ...prev, readsCount: (prev.readsCount ?? prev.views ?? 0) + 1 } : prev
                );
              }
            });
          }
          const all = await getPublishedBlogs();
          const available = all.length ? all : INITIAL_BLOGS.filter((item) => item.isPublished).map((item) => ({ ...item, id: `seed-${item.slug}` }));
          const others = available.filter((item) => item.slug !== found!.slug);
          const relevant = [...others.filter((item) => item.category === found!.category), ...others.filter((item) => item.category !== found!.category)].slice(0, 3);
          if (mounted) setRelated(relevant);
        }
      } catch (error) { console.error("Failed to load blog detail:", error); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [slug, router.isReady, initialPost]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setShareUrl("");
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 3000);
    } catch { setCopied(false); setShareUrl(url); }
  };
  const category = post ? getBlogCategoryDetails(post.category) : null;
  const published = post?.publishedAt ? new Date(post.publishedAt) : null;
  const validDate = published && Number.isFinite(published.getTime()) ? published : null;

  const canonicalUrl = post ? `https://www.devenginehq.com/blog/${post.slug}` : "https://www.devenginehq.com/blog";
  const ogImage = post?.coverImage || "https://www.devenginehq.com/dev_url_logo.png";
  const articleSchema = post
    ? {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.excerpt,
        "image": post.coverImage ? [post.coverImage] : ["https://www.devenginehq.com/dev_url_logo.png"],
        "datePublished": post.publishedAt || post.createdAt,
        "dateModified": post.updatedAt || post.publishedAt || post.createdAt,
        "author": {
          "@type": "Person",
          "name": post.author?.name || "MD. ABDUL HAMIM LEON",
          "jobTitle": post.author?.role || "Founder & Lead Architect",
        },
        "publisher": {
          "@type": "Organization",
          "name": "DevEngine Systems Inc.",
          "url": "https://www.devenginehq.com",
          "logo": {
            "@type": "ImageObject",
            "url": "https://www.devenginehq.com/dev_url_logo.png",
          },
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": canonicalUrl,
        },
      }
    : null;

  return (
    <FeaturePage>
      <div className={styles.quiet}>
        <Head>
          <title>
            {post
              ? `${post.title} | DevEngine Chronicles`
              : loading
              ? "DevEngine Chronicles"
              : "Story unavailable | DevEngine Chronicles"}
          </title>
          <meta
            name="description"
            content={post?.excerpt || "Ideas, engineering insights, and stories from the DevEngine studio."}
          />
          <link rel="canonical" href={canonicalUrl} />

          {/* OpenGraph / Facebook / LinkedIn */}
          <meta property="og:site_name" content="DevEngine Chronicles" />
          <meta property="og:title" content={post?.title || "DevEngine Chronicles"} />
          <meta
            property="og:description"
            content={post?.excerpt || "Ideas, engineering insights, and stories from the DevEngine studio."}
          />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={canonicalUrl} />
          <meta property="og:image" content={ogImage} />
          {validDate && <meta property="article:published_time" content={validDate.toISOString()} />}
          {post?.author?.name && <meta property="article:author" content={post.author.name} />}

          {/* Twitter Cards */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={post?.title || "DevEngine Chronicles"} />
          <meta
            name="twitter:description"
            content={post?.excerpt || "Ideas, engineering insights, and stories from the DevEngine studio."}
          />
          <meta name="twitter:image" content={ogImage} />

          {/* JSON-LD Article Schema */}
          {articleSchema && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
            />
          )}
        </Head>
    {loading ? <div className={base.loading} role="status"><HelixLoader size={48} color="#2cecf7" /><p className={base.small}>Opening your story…</p></div> : !post ? <section className={`${base.section} ${styles.hero}`}><div className={base.inner}><div className={`${base.card} ${base.empty}`}><div className={base.emptyIcon}><Icon name="menu_book" /></div><h1 className={styles.sectionHeading}>This story isn’t available.</h1><p className={styles.sectionDescription} style={{ marginInline: "auto" }}>It may have moved or is no longer published. Explore the Chronicles for more stories from the studio.</p><div className={base.actions}><Link className={base.button} href="/blog"><Icon name="west" />Back to all stories</Link></div></div></div></section> : <section className={`${base.section} ${styles.hero}`}><div className={base.inner}><article className={styles.article}>
      <div className={styles.articleNav}><Link className={base.secondaryButton} href="/blog"><Icon name="west" />All Chronicles</Link><div className={styles.articleNavActions}><button type="button" className={`${styles.navAutoScrollBtn} ${autoScroll ? styles.navAutoScrollActive : ""}`} onClick={() => setAutoScroll((prev) => !prev)} title={autoScroll ? "Pause auto scroll" : "Auto scroll reading mode (18s per section)"} aria-pressed={autoScroll}><span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1 }}>{autoScroll ? "pause_circle" : "motion_photos_on"}</span><span>Auto Scroll</span><span className={styles.navToggleTrack} aria-hidden="true"><span className={styles.navToggleThumb} /></span></button><button type="button" className={base.secondaryButton} onClick={copyLink}><Icon name={copied ? "check" : "share"} />{copied ? "Link copied" : "Share story"}</button></div></div>
      <span role="status" className={styles.srOnly}>{copied ? "Story link copied to clipboard." : ""}</span>
      {shareUrl && <div className={styles.shareFallback}><p className={styles.shareStatus} role="status">Select and copy the link below to share this story.</p><label className={styles.srOnly} htmlFor="article-share-link">Story link</label><input id="article-share-link" className={styles.input} readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></div>}
      <SoftReveal><header className={styles.articleHeader} style={{ background: "transparent", backgroundColor: "transparent", border: "none", boxShadow: "none" }}><div className={styles.articleMeta}><span className={styles.category}><Icon name={category!.icon} />{category!.label}</span><span>{post.readTime}{validDate && <> · <time dateTime={validDate.toISOString()}>{validDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></>}{typeof (post.readsCount ?? post.views) === "number" && (post.readsCount ?? post.views ?? 0) > 0 && <> · <span className={styles.metaReads}><Icon name="visibility" /><span>{(post.readsCount ?? post.views)?.toLocaleString()} {((post.readsCount ?? post.views) === 1) ? "read" : "reads"}</span></span></>}</span></div><h1 className={styles.articleTitle}>{post.title}</h1>{post.subtitle && <p className={styles.articleSubtitle}>{post.subtitle}</p>}<div className={styles.authorBanner}><Author author={post.author} /><span className={base.small}>DevEngine Chronicles</span></div></header></SoftReveal>
      <div className={styles.articleCover}><CommunityImage src={post.coverImage} alt={post.title} priority /></div>
      {post.stats && post.stats.length > 0 && <div className={styles.articleStats}>{post.stats.map((stat, index) => <div key={index} className={styles.articleStat}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>}
      <EditorialFeed
        content={post.content || ""}
        author={post.author}
        categoryLabel={category?.label}
        readTime={post.readTime}
        readsCount={post.readsCount ?? post.views ?? 0}
        publishedDate={validDate ? validDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : undefined}
        title={post.title}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
      />
      <footer className={styles.articleEnd}>{post.tags?.length > 0 && <><h2 className={styles.srOnly}>Story topics</h2><div className={styles.tags}>{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div></>}<div className={styles.authorBanner}><Author author={post.author} /><Link className={base.secondaryButton} href="/blog">Explore more stories <Icon name="arrow_forward" /></Link></div></footer>
        </article>
      </div>
    </section>}
  </div>
</FeaturePage>
);
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const slug = context.params?.slug as string;
  let initialPost: BlogPost | null = null;
  try {
    const candidate = await getBlogBySlug(slug);
    if (candidate && candidate.isPublished) {
      initialPost = candidate;
    } else {
      const fallback = INITIAL_BLOGS.find((item) => item.slug === slug && item.isPublished);
      if (fallback) {
        initialPost = enrichBlogWithContextualLinks({
          ...fallback,
          id: `seed-${fallback.slug}`,
        } as BlogPost);
      }
    }
  } catch (err) {
    console.error("Error in blog getServerSideProps:", err);
  }

  if (!initialPost) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      initialPost: JSON.parse(JSON.stringify(initialPost)),
    },
  };
};
