import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { BlogPost, BLOG_CATEGORY_CONFIG } from "@/types/blog";
import { getBlogBySlug, getPublishedBlogs, INITIAL_BLOGS } from "@/lib/services/blogService";

export default function BlogDetailPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!slug) return;

    let mounted = true;
    async function loadPost() {
      setLoading(true);
      try {
        const slugStr = String(slug);
        let found = await getBlogBySlug(slugStr);

        // Fallback search in INITIAL_BLOGS if not yet seeded or offline
        if (!found) {
          const match = INITIAL_BLOGS.find(
            (b) => b.slug === slugStr || b.slug.includes(slugStr)
          );
          if (match) {
            found = { ...match, id: `seed-${match.slug}` };
          }
        }

        if (mounted) {
          setPost(found);
        }

        // Fetch related posts
        const all = await getPublishedBlogs();
        const fallbackAll = all.length > 0 ? all : INITIAL_BLOGS.map((b, i) => ({ ...b, id: `seed-${i}` }));
        const others = fallbackAll
          .filter((p) => p.slug !== slugStr)
          .slice(0, 3);
        if (mounted) {
          setRelatedPosts(others);
        }
      } catch (err) {
        console.error("Failed to load blog detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadPost();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#02040A] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#3EF3FF" />
        <p className="mt-4 font-jetbrains text-xs text-gray-400 tracking-widest uppercase">
          Deciphering Chronicle…
        </p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#02040A] flex flex-col items-center justify-center text-white px-4">
        <div className="text-center max-w-md bg-[#08111f] border border-white/10 p-8 rounded-3xl">
          <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">
            menu_book
          </span>
          <h1 className="font-space font-bold text-2xl text-white">Chronicle Not Found</h1>
          <p className="text-gray-400 text-xs mt-2 font-sans">
            The requested publication does not exist or has been archived.
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3EF3FF] text-[#02040A] font-jetbrains text-xs font-bold uppercase transition"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Back to All Chronicles</span>
          </Link>
        </div>
      </div>
    );
  }

  const categoryConfig = BLOG_CATEGORY_CONFIG[post.category] || BLOG_CATEGORY_CONFIG.ENGINEERING;

  return (
    <>
      <Head>
        <title>{`${post.title} — DevEngine Chronicles`}</title>
        <meta name="description" content={post.excerpt} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Background */}
      <div className="fixed inset-0 bg-[#02040A] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,24,42,0.95)_0%,rgba(2,4,10,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(62,243,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(62,243,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] z-[-8] pointer-events-none" />
      <div className="fixed top-1/4 -left-48 w-96 h-96 bg-[#3EF3FF]/[0.05] rounded-full blur-[160px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      <article className="min-h-screen pt-32 sm:pt-36 pb-32 px-4 sm:px-8 md:px-12 max-w-4xl mx-auto text-white font-sans selection:bg-[#3EF3FF] selection:text-[#02040A] relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-white/10 font-jetbrains text-xs">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-[#3EF3FF] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>All Chronicles</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            <span>{copiedLink ? "Link Copied!" : "Share Article"}</span>
          </button>
        </div>

        {/* Header Badges & Date */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-jetbrains uppercase tracking-wider font-bold border ${categoryConfig.badgeBg} ${categoryConfig.badgeText} ${categoryConfig.badgeBorder}`}
          >
            <span className="material-symbols-outlined text-sm">{categoryConfig.icon}</span>
            <span>{categoryConfig.label}</span>
          </span>

          <span className="text-gray-400 font-jetbrains text-xs flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            <span>{post.readTime}</span>
          </span>

          {post.publishedAt && (
            <span className="text-gray-500 font-jetbrains text-xs">
              • {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>

        {/* Title & Subtitle */}
        <h1 className="font-space font-bold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight leading-[1.1] mb-6">
          {post.title}
        </h1>

        {post.subtitle && (
          <p className="font-sans text-lg sm:text-xl text-gray-300 mb-8 leading-relaxed font-light">
            {post.subtitle}
          </p>
        )}

        {/* Author Bio Banner */}
        <div className="flex items-center justify-between gap-4 p-4 bg-[#08111f]/90 border border-white/10 rounded-2xl mb-10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-[#3EF3FF]/20 border border-[#3EF3FF]/40 flex items-center justify-center overflow-hidden">
              <Image
                src={post.author.avatarUrl || "/assets/DevEngine-emblem.png"}
                alt={post.author.name}
                width={44}
                height={44}
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-jetbrains font-bold text-sm text-white">
                {post.author.name}
              </div>
              <div className="font-jetbrains text-xs text-[#3EF3FF]">
                {post.author.role}
              </div>
            </div>
          </div>

          <div className="hidden sm:block text-right font-jetbrains text-[11px] text-gray-400">
            DevEngine Extreme Architecture Studio
          </div>
        </div>

        {/* Featured Cover Image */}
        <div className="relative w-full h-80 sm:h-[480px] rounded-3xl overflow-hidden mb-12 border border-white/10 shadow-[0_0_60px_rgba(62,243,255,0.1)]">
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 900px"
            className="object-cover"
          />
        </div>

        {/* Article Body Content */}
        <div className="prose prose-invert prose-cyan max-w-none space-y-6 text-gray-300 font-sans leading-relaxed text-base sm:text-lg">
          {post.content.split("\n\n").map((paragraph, index) => {
            // Heading 2
            if (paragraph.startsWith("## ")) {
              return (
                <h2
                  key={index}
                  className="font-space font-bold text-2xl sm:text-3xl text-white pt-6 pb-2 border-b border-white/10 mt-8"
                >
                  {paragraph.replace("## ", "")}
                </h2>
              );
            }
            // Heading 3
            if (paragraph.startsWith("### ")) {
              return (
                <h3
                  key={index}
                  className="font-space font-bold text-xl sm:text-2xl text-[#3EF3FF] pt-4"
                >
                  {paragraph.replace("### ", "")}
                </h3>
              );
            }
            // Code block
            if (paragraph.startsWith("```")) {
              const codeContent = paragraph
                .replace(/^```[a-z]*\n?/, "")
                .replace(/```$/, "");
              return (
                <pre
                  key={index}
                  className="p-5 bg-[#030712] border border-white/15 rounded-2xl overflow-x-auto font-mono text-xs text-emerald-300 my-6 shadow-inner"
                >
                  <code>{codeContent}</code>
                </pre>
              );
            }
            // Blockquote
            if (paragraph.startsWith("> ")) {
              return (
                <blockquote
                  key={index}
                  className="border-l-4 border-[#3EF3FF] pl-4 py-2 my-6 bg-[#3EF3FF]/5 rounded-r-2xl font-sans italic text-gray-200"
                >
                  {paragraph.replace(/^> /, "")}
                </blockquote>
              );
            }
            // Bullet / numbered list items
            if (paragraph.startsWith("- ") || /^\d+\.\s/.test(paragraph)) {
              return (
                <ul key={index} className="list-disc list-inside space-y-2 pl-2">
                  {paragraph.split("\n").map((line, liIdx) => (
                    <li key={liIdx} className="text-gray-300">
                      {line.replace(/^[-*]\s+|\d+\.\s+/, "")}
                    </li>
                  ))}
                </ul>
              );
            }
            // Default paragraph
            return (
              <p key={index} className="leading-relaxed">
                {paragraph}
              </p>
            );
          })}
        </div>

        {/* Tags Section */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-white/10">
            <span className="font-jetbrains text-xs text-gray-400 uppercase tracking-wider block mb-3">
              Chronicle Tags
            </span>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 font-jetbrains text-xs text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Author Signoff Card */}
        <div className="mt-14 p-6 sm:p-8 bg-[#08111f] border border-[#3EF3FF]/30 rounded-3xl shadow-[0_0_40px_rgba(62,243,255,0.1)] flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#3EF3FF]/20 border border-[#3EF3FF]/40 flex items-center justify-center overflow-hidden flex-shrink-0">
              <Image
                src={post.author.avatarUrl || "/assets/DevEngine-emblem.png"}
                alt={post.author.name}
                width={56}
                height={56}
                className="object-cover"
              />
            </div>
            <div>
              <h4 className="font-space font-bold text-lg text-white">
                Written by {post.author.name}
              </h4>
              <p className="font-sans text-xs text-gray-400 mt-1 max-w-md">
                Architecting high-fidelity, extreme performance software systems at DevEngine Studio.
              </p>
            </div>
          </div>

          <Link
            href="/blog"
            className="px-6 py-3 rounded-full bg-[#3EF3FF] hover:bg-[#00e1f0] text-[#02040A] font-jetbrains text-xs font-bold uppercase transition flex-shrink-0 shadow-[0_0_20px_rgba(62,243,255,0.4)]"
          >
            Explore More Chronicles
          </Link>
        </div>

        {/* Related Chronicles Grid */}
        {relatedPosts.length > 0 && (
          <section className="mt-20 pt-12 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-space font-bold text-2xl text-white">
                More From DevEngine
              </h3>
              <Link
                href="/blog"
                className="font-jetbrains text-xs text-[#3EF3FF] hover:underline uppercase"
              >
                View All →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedPosts.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/blog/${rel.slug}`}
                  className="group bg-[#08111f] border border-white/10 hover:border-[#3EF3FF]/40 rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] flex flex-col"
                >
                  <div className="relative w-full h-36">
                    <Image
                      src={rel.coverImage}
                      alt={rel.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-jetbrains uppercase text-[#3EF3FF] font-bold">
                        {rel.category.replace("_", " ")}
                      </span>
                      <h4 className="font-space font-bold text-sm text-white group-hover:text-[#3EF3FF] transition-colors mt-1 line-clamp-2">
                        {rel.title}
                      </h4>
                    </div>
                    <span className="font-jetbrains text-[10px] text-gray-500 mt-3 block">
                      {rel.readTime}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <LandingFooter />
    </>
  );
}
