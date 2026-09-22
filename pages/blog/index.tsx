import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import LandingNavbar from "@/components/landing/LandingNavbar";
import LandingFooter from "@/components/landing/LandingFooter";
import HelixLoader from "@/components/HelixLoader";
import { BlogPost, BlogCategory, BLOG_CATEGORY_CONFIG } from "@/types/blog";
import { getPublishedBlogs, seedInitialBlogs, INITIAL_BLOGS } from "@/lib/services/blogService";

const CATEGORIES: { id: string; label: string; filterKey?: BlogCategory }[] = [
  { id: "ALL", label: "All Chronicles" },
  { id: "SUCCESS_STORY", label: "Success Stories", filterKey: "SUCCESS_STORY" },
  { id: "ACHIEVEMENT", label: "Achievements", filterKey: "ACHIEVEMENT" },
  { id: "FAILURE_LESSON", label: "Failures & Lessons", filterKey: "FAILURE_LESSON" },
  { id: "ENGINEERING", label: "Engineering", filterKey: "ENGINEERING" },
  { id: "STUDIO_CULTURE", label: "Studio Culture", filterKey: "STUDIO_CULTURE" },
];

export default function BlogIndexPage() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      try {
        let list = await getPublishedBlogs();
        // If Firestore is empty on first run, attempt auto-seed or load initial chronicles
        if (list.length === 0) {
          try {
            await seedInitialBlogs();
            list = await getPublishedBlogs();
          } catch (seedErr) {
            console.warn("Auto-seed error, using fallback initial blogs:", seedErr);
          }
        }
        if (list.length === 0) {
          list = INITIAL_BLOGS.map((b, i) => ({ ...b, id: `seed-${i}` }));
        }
        if (mounted) setBlogs(list);
      } catch (err) {
        console.error("Failed to load blog posts:", err);
        // Fallback in-memory
        if (mounted) {
          setBlogs(INITIAL_BLOGS.map((b, i) => ({ ...b, id: `seed-${i}` })));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  // Filtered list
  const filteredBlogs = blogs.filter((post) => {
    const matchesCategory =
      selectedCategory === "ALL" || post.category === selectedCategory;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.subtitle?.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      post.tags.some((t) => t.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <Head>
        <title>DevEngine Chronicles — Stories, Failures & Architectural Triumphs</title>
        <meta
          name="description"
          content="Dispatches from the frontlines of software craftsmanship. Explore DevEngine's real engineering failures, breakthroughs, and enterprise milestones."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Atmospheric Background */}
      <div className="fixed inset-0 bg-[#02040A] z-[-10]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,24,42,0.95)_0%,rgba(2,4,10,1)_100%)] z-[-9] pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,rgba(62,243,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(62,243,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px] z-[-8] pointer-events-none" />
      <div className="fixed top-1/4 -left-48 w-96 h-96 bg-[#3EF3FF]/[0.05] rounded-full blur-[160px] pointer-events-none z-[-7]" />
      <div className="fixed bottom-1/4 -right-48 w-96 h-96 bg-[#5448dc]/[0.05] rounded-full blur-[180px] pointer-events-none z-[-7]" />

      <LandingNavbar />

      <main className="min-h-screen pt-32 sm:pt-36 pb-32 px-4 sm:px-8 md:px-12 max-w-[1440px] mx-auto text-white font-sans selection:bg-[#3EF3FF] selection:text-[#02040A] relative z-10">
        {/* Hero Header */}
        <section className="mb-14 sm:mb-20 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3EF3FF]/10 border border-[#3EF3FF]/30 mb-6 shadow-[0_0_20px_rgba(62,243,255,0.15)]">
            <span className="w-2 h-2 rounded-full bg-[#3EF3FF] animate-pulse" />
            <span className="font-jetbrains text-xs text-[#3EF3FF] uppercase tracking-widest font-semibold">
              DevEngine Chronicles // Engineering Log
            </span>
          </div>

          <h1 className="font-space font-bold text-4xl sm:text-6xl md:text-7xl text-white tracking-tight leading-[1.08] mb-6">
            Stories, Failures &amp;{" "}
            <span className="bg-gradient-to-r from-[#3EF3FF] via-white to-[#5448dc] bg-clip-text text-transparent">
              Architectural Triumphs
            </span>
          </h1>

          <p className="font-sans text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Raw, unfiltered accounts from the frontlines of software creation. Discover our biggest production outages, milestone achievements, and zero-compromise engineering philosophies.
          </p>

          {/* Search & Category Filter */}
          <div className="mt-10 max-w-xl mx-auto space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-500 text-xl pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chronicles by title, tech stack, failure keywords..."
                className="w-full bg-[#08111f]/80 backdrop-blur-xl border border-white/10 hover:border-white/20 focus:border-[#3EF3FF] focus:ring-2 focus:ring-[#3EF3FF]/20 rounded-2xl pl-12 pr-10 py-3.5 text-sm text-white placeholder-gray-500 focus:outline-none transition shadow-xl font-sans"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-3 text-gray-400 hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-jetbrains uppercase tracking-wider transition cursor-pointer ${
                      isSelected
                        ? "bg-[#3EF3FF] text-[#02040A] font-bold shadow-[0_0_20px_rgba(62,243,255,0.4)] scale-105"
                        : "bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Content Section */}
        {loading ? (
          <div className="py-24 text-center">
            <HelixLoader size={48} color="#3EF3FF" />
            <p className="mt-4 font-jetbrains text-xs text-gray-400 tracking-widest uppercase">
              Loading Chronicles…
            </p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-24 text-center max-w-md mx-auto bg-[#08111f]/50 border border-white/10 rounded-3xl p-8 backdrop-blur-xl">
            <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">
              auto_stories
            </span>
            <h3 className="font-space font-bold text-xl text-white">No Chronicles Found</h3>
            <p className="text-gray-400 text-xs mt-2 leading-relaxed font-sans">
              No stories match your search query &ldquo;{searchQuery}&rdquo;. Try another keyword or switch category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("ALL");
              }}
              className="mt-5 px-5 py-2.5 rounded-xl bg-[#3EF3FF]/15 hover:bg-[#3EF3FF]/25 border border-[#3EF3FF]/30 text-[#3EF3FF] font-jetbrains text-xs font-bold uppercase transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Bento Grid Showcase */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(320px,auto)]">
            {filteredBlogs.map((post) => (
              <BentoBlogCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />
    </>
  );
}

// ══════════════════════════════════════════════════════════
// BENTO GRID CARD COMPONENT (Handles different grid layouts)
// ══════════════════════════════════════════════════════════
function BentoBlogCard({ post }: { post: BlogPost }) {
  const config = BLOG_CATEGORY_CONFIG[post.category] || BLOG_CATEGORY_CONFIG.ENGINEERING;
  const isHero = post.gridSpan === "hero" || post.featured;
  const isWide = post.gridSpan === "wide";
  const isTall = post.gridSpan === "tall";

  // Dynamic grid span classes
  let spanClass = "col-span-1";
  if (isHero) {
    spanClass = "md:col-span-2 lg:col-span-3";
  } else if (isWide) {
    spanClass = "md:col-span-2 lg:col-span-2";
  } else if (isTall) {
    spanClass = "col-span-1 md:row-span-2";
  }

  return (
    <article
      className={`group relative rounded-3xl overflow-hidden bg-[#08111f]/80 border border-white/10 hover:border-white/25 transition-all duration-500 hover:shadow-[0_0_50px_rgba(62,243,255,0.12)] flex flex-col justify-between backdrop-blur-xl ${spanClass}`}
    >
      {/* Background Cover Image with cinematic gradient overlay */}
      <div className={`relative w-full overflow-hidden ${isHero ? "h-72 sm:h-96" : isTall ? "h-64 sm:h-80" : "h-56"}`}>
        <Image
          src={post.coverImage}
          alt={post.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out brightness-[0.85] group-hover:brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08111f] via-[#08111f]/60 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          {/* Category Chip */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-jetbrains uppercase tracking-wider font-bold border backdrop-blur-md ${config.badgeBg} ${config.badgeText} ${config.badgeBorder} shadow-lg`}
          >
            <span className="material-symbols-outlined text-sm">{config.icon}</span>
            <span>{config.label}</span>
          </span>

          {/* Read Time */}
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-gray-300 font-jetbrains text-[10px] uppercase tracking-wider">
            {post.readTime}
          </span>
        </div>

        {/* Hero Feature Pill */}
        {post.featured && (
          <div className="absolute bottom-4 left-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#3EF3FF] text-[#02040A] font-jetbrains text-[10px] font-bold uppercase tracking-widest">
              ★ Featured Chronicle
            </span>
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
        <div>
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-jetbrains text-[10px] text-gray-400"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h2
            className={`font-space font-bold text-white group-hover:text-[#3EF3FF] transition-colors leading-snug ${
              isHero ? "text-2xl sm:text-3xl md:text-4xl" : "text-xl sm:text-2xl"
            }`}
          >
            <Link href={`/blog/${post.slug}`} className="focus:outline-none">
              {post.title}
            </Link>
          </h2>

          {/* Excerpt */}
          <p className="font-sans text-xs sm:text-sm text-gray-400 mt-2.5 leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        </div>

        {/* Footer Meta: Author & CTA */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-[#3EF3FF]/20 border border-[#3EF3FF]/40 flex items-center justify-center overflow-hidden">
              <Image
                src={post.author.avatarUrl || "/assets/DevEngine-emblem.png"}
                alt={post.author.name}
                width={28}
                height={28}
                className="object-cover"
              />
            </div>
            <div>
              <div className="font-jetbrains text-xs font-semibold text-gray-200">
                {post.author.name}
              </div>
              <div className="font-jetbrains text-[10px] text-gray-500">
                {post.author.role}
              </div>
            </div>
          </div>

          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1 font-jetbrains text-xs text-[#3EF3FF] group-hover:translate-x-1 transition-transform font-bold"
          >
            <span>Read Chronicle</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
