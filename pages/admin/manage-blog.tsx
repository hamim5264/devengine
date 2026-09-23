import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { BlogPost, BlogCategory, GridSpanType, BLOG_CATEGORY_CONFIG } from "@/types/blog";
import {
  getAllBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  seedInitialBlogs,
} from "@/lib/services/blogService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const CATEGORIES: { id: BlogCategory; label: string }[] = [
  { id: "SUCCESS_STORY", label: "Success Story" },
  { id: "ACHIEVEMENT", label: "Milestone & Achievement" },
  { id: "FAILURE_LESSON", label: "Failure & Hard Lessons" },
  { id: "ENGINEERING", label: "Engineering Deep Dive" },
  { id: "STUDIO_CULTURE", label: "Studio Philosophy" },
];

const GRID_SPANS: { id: GridSpanType; label: string }[] = [
  { id: "normal", label: "Standard (1 Column)" },
  { id: "wide", label: "Wide (2 Columns)" },
  { id: "tall", label: "Tall (2 Rows Vertical)" },
  { id: "hero", label: "Hero Banner (Full 3 Columns)" },
];

const EMPTY_FORM: Omit<BlogPost, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  content: "",
  category: "SUCCESS_STORY",
  coverImage:
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop",
  author: {
    name: "MD. ABDUL HAMIM LEON",
    role: "Founder & Lead Architect",
    avatarUrl: "/assets/DevEngine-emblem.png",
  },
  readTime: "5 min read",
  featured: false,
  gridSpan: "normal",
  tags: ["Architecture", "Engineering"],
  order: 1,
  isPublished: true,
  publishedAt: new Date().toISOString(),
};

export default function ManageBlogPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Load posts
  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await getAllBlogs();
      setPosts(data);
    } catch (err) {
      console.error("Failed to load blog posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPosts();
    }
  }, [isAdmin]);

  // Seed handler
  const handleSeedDefaults = async () => {
    if (!confirm("Seed initial sample chronicles into Firestore database?")) return;
    setSeeding(true);
    try {
      const count = await seedInitialBlogs();
      alert(`Successfully seeded ${count} new chronicles!`);
      await loadPosts();
    } catch (err) {
      console.error("Failed to seed initial blogs:", err);
      alert("Failed to seed blogs. Check console for details.");
    } finally {
      setSeeding(false);
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingPost(null);
    setForm({
      ...EMPTY_FORM,
      order: posts.length + 1,
      publishedAt: new Date().toISOString(),
    });
    setTagsInput(EMPTY_FORM.tags.join(", "));
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (post: BlogPost, index?: number) => {
    setEditingPost(post);
    setForm({
      slug: post.slug || "",
      title: post.title || "",
      subtitle: post.subtitle || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      category: post.category || "SUCCESS_STORY",
      coverImage: post.coverImage || "",
      author: {
        name: post.author?.name || "MD. ABDUL HAMIM LEON",
        role: post.author?.role || "Founder & Lead Architect",
        avatarUrl: post.author?.avatarUrl || "/assets/DevEngine-emblem.png",
      },
      readTime: post.readTime || "5 min read",
      featured: !!post.featured,
      gridSpan: post.gridSpan || "normal",
      tags: post.tags || [],
      order: typeof post.order === "number" ? post.order : (index !== undefined ? index + 1 : 1),
      isPublished: post.isPublished !== false,
      publishedAt: post.publishedAt || new Date().toISOString(),
      ...(post.stats ? { stats: post.stats } : {}),
    });
    setTagsInput((post.tags || []).join(", "));
    setModalOpen(true);
  };

  // Auto slug from title
  const handleTitleChange = (newTitle: string) => {
    const newSlug = newTitle
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 70);

    setForm((prev) => ({
      ...prev,
      title: newTitle,
      slug: editingPost ? prev.slug : newSlug,
    }));
  };

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: Omit<BlogPost, "id" | "createdAt" | "updatedAt"> = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || "",
        excerpt: form.excerpt.trim(),
        content: form.content,
        category: form.category,
        coverImage: form.coverImage.trim(),
        author: {
          name: form.author?.name?.trim() || "MD. ABDUL HAMIM LEON",
          role: form.author?.role?.trim() || "Founder & Lead Architect",
          ...(form.author?.avatarUrl ? { avatarUrl: form.author.avatarUrl } : {}),
        },
        readTime: form.readTime?.trim() || "5 min read",
        featured: !!form.featured,
        gridSpan: form.gridSpan,
        tags: parsedTags,
        order: Number(form.order) || 1,
        isPublished: !!form.isPublished,
        publishedAt: form.publishedAt || new Date().toISOString(),
        ...(form.stats ? { stats: form.stats } : {}),
      };

      if (editingPost) {
        await updateBlog(editingPost.id, payload);
      } else {
        await createBlog(payload);
      }

      setModalOpen(false);
      await loadPosts();
    } catch (err: any) {
      console.error("Failed to save post:", err);
      alert(`Failed to save chronicle: ${err?.message || "Check console."}`);
    } finally {
      setSaving(false);
    }
  };

  // Quick Toggle Publish
  const handleTogglePublish = async (post: BlogPost) => {
    try {
      await updateBlog(post.id, { isPublished: !post.isPublished });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id ? { ...p, isPublished: !p.isPublished } : p
        )
      );
    } catch (err) {
      console.error("Failed to toggle publish status:", err);
      alert("Failed to update status.");
    }
  };

  // Move chronicle to Recycle Bin (Soft Delete)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      await moveToBin({
        originalCollection: "blogs",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.title,
        itemType: "BlogPost",
        data: deleteTarget,
        metadata: {
          category: deleteTarget.category,
          slug: deleteTarget.slug,
          isPublished: deleteTarget.isPublished,
          author: deleteTarget.author?.name,
        },
      });
      setPosts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to move chronicle to bin:", err);
      alert("Failed to move chronicle to Recycle Bin.");
    } finally {
      setSaving(false);
    }
  };

  // Filtered posts
  const filteredPosts = posts.filter((post) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PUBLISHED" && post.isPublished) ||
      (statusFilter === "DRAFT" && !post.isPublished);

    const matchesCategory =
      categoryFilter === "ALL" || post.category === categoryFilter;

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      post.title.toLowerCase().includes(q) ||
      post.slug.toLowerCase().includes(q) ||
      post.tags.some((t) => t.toLowerCase().includes(q));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  if (!authReady || !isAdmin) {
    return (
      <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center bg-[#02040A] text-white">
        <HelixLoader size={48} color="#3EF3FF" />
        <p className="mt-4 font-jetbrains text-xs text-gray-400">Verifying Admin Access…</p>
      </main>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Blog & Chronicles | DevEngine Admin</title>
      </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-2">
              <Link
                href="/admin/dashboard"
                className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-500 hover:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-500">CMS Engine</span>
              <span className="text-gray-600">/</span>
              <Link
                href="/blog"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Public Blog</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Blog &amp; Chronicles Management</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Firestore
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Publish engineering deep dives, failure retrospectives, milestones, and architectural chronicles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>{seeding ? "Seeding…" : "Seed Sample Chronicles"}</span>
            </button>

            <Link
              href="/blog"
              target="_blank"
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>View Live Blog</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black shadow-lg shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>+ New Chronicle</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] shadow-lg">
            <div className="text-xs font-medium text-gray-400">Total Chronicles</div>
            <div className="text-2xl font-bold text-white mt-1">{posts.length}</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c16]/95 border border-emerald-500/20 shadow-lg">
            <div className="text-xs font-medium text-emerald-400">Published</div>
            <div className="text-2xl font-bold text-emerald-300 mt-1">
              {posts.filter((p) => p.isPublished).length}
            </div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c16]/95 border border-amber-500/20 shadow-lg">
            <div className="text-xs font-medium text-amber-400">Drafts</div>
            <div className="text-2xl font-bold text-amber-300 mt-1">
              {posts.filter((p) => !p.isPublished).length}
            </div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#0c0c16]/95 border border-teal-500/20 shadow-lg">
            <div className="text-xs font-medium text-teal-300">Featured Stories</div>
            <div className="text-2xl font-bold text-white mt-1">
              {posts.filter((p) => p.featured).length}
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 mb-6 bg-[#0c0c16]/95 p-4 rounded-2xl border border-white/[0.08] shadow-xl">
          <div className="w-full lg:w-80 relative">
            <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chronicles by title or slug..."
              className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl pl-9 pr-3 text-xs text-white placeholder-gray-500 outline-none transition"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto">
            {/* Status Tabs */}
            <div className="flex items-center bg-black/40 border border-white/[0.06] p-1 rounded-xl">
              {["ALL", "PUBLISHED", "DRAFT"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                    statusFilter === st
                      ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Category Select */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 text-gray-300 text-xs rounded-xl px-3.5 pr-8 appearance-none cursor-pointer outline-none transition"
              >
                <option value="ALL" className="bg-[#0c0c16] text-white">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0c0c16] text-white">
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Table / List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] py-20">
            <HelixLoader size={45} color="#14b8a6" />
            <p className="mt-4 font-mono text-xs text-gray-400 tracking-wider uppercase">
              Loading Publications from Firestore...
            </p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center bg-[#0c0c16]/95 rounded-3xl border border-white/[0.08] p-8 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h4 className="text-sm font-semibold text-white">No Chronicles Found</h4>
            <p className="text-gray-400 font-mono text-xs max-w-md mx-auto">
              No articles match your criteria. Click &ldquo;+ New Chronicle&rdquo; to draft one, or seed defaults.
            </p>
          </div>
        ) : (
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-black/40 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-4 px-4 text-center">Order</th>
                    <th className="py-4 px-5">Chronicle</th>
                    <th className="py-4 px-5">Category</th>
                    <th className="py-4 px-5">Layout Grid</th>
                    <th className="py-4 px-5">Author</th>
                    <th className="py-4 px-5 text-center">Status</th>
                    <th className="py-4 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] text-xs font-sans">
                  {filteredPosts.map((post, idx) => {
                    const catConfig =
                      BLOG_CATEGORY_CONFIG[post.category] || BLOG_CATEGORY_CONFIG.ENGINEERING;
                    const orderNum = typeof post.order === "number" ? post.order : idx + 1;

                    return (
                      <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Display Order */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-block px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/25 text-teal-300 font-mono text-xs font-bold shadow-sm">
                            #{orderNum}
                          </span>
                        </td>
                        {/* Image + Title */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-10 rounded-xl overflow-hidden bg-black/40 flex-shrink-0 border border-white/10">
                              <Image
                                src={post.coverImage}
                                alt={post.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm line-clamp-1">
                                {post.title}
                              </div>
                              <div className="text-teal-400/80 font-mono text-[11px]">
                                /{post.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${catConfig.badgeBg} ${catConfig.badgeText} ${catConfig.badgeBorder}`}
                          >
                            <span className="material-symbols-outlined text-xs">
                              {catConfig.icon}
                            </span>
                            <span>{catConfig.label}</span>
                          </span>
                        </td>

                        {/* Grid Span */}
                        <td className="py-4 px-5 font-mono text-[11px] text-gray-300 uppercase">
                          <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                            {post.gridSpan} {post.featured && "★"}
                          </span>
                        </td>

                        {/* Author */}
                        <td className="py-4 px-5 text-gray-300">
                          <div className="font-semibold text-white">{post.author.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            {post.author.role}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(post)}
                            className={`px-2.5 py-1 rounded-full font-mono text-[10px] uppercase font-bold border transition cursor-pointer ${
                              post.isPublished
                                ? "bg-teal-500/10 text-teal-300 border-teal-500/25 hover:bg-teal-500/20"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/25 hover:bg-amber-500/20"
                            }`}
                          >
                            {post.isPublished ? "✓ Published" : "Draft"}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              className="p-2 rounded-xl hover:bg-white/[0.06] text-gray-400 hover:text-teal-300 transition"
                              title="View Public Post"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>

                            <button
                              type="button"
                              onClick={() => handleOpenEdit(post, idx)}
                              className="p-2 rounded-xl hover:bg-teal-500/10 text-gray-400 hover:text-teal-300 transition cursor-pointer"
                              title="Edit Chronicle"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDeleteTarget(post)}
                              className="p-2 rounded-xl hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition cursor-pointer"
                              title="Move to Recycle Bin"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════
          CREATE / EDIT CHRONICLE MODAL (BOUNDED)
      ══════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          <div className="bg-[#0c0c16] border border-white/[0.12] rounded-3xl max-w-3xl w-full shadow-2xl relative max-h-[90vh] text-white flex flex-col overflow-hidden">
            {/* Pinned Header */}
            <div className="flex justify-between items-start px-6 sm:px-8 py-5 border-b border-white/[0.08] bg-[#0c0c16] shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span>Publication Editor</span>
                </div>
                <h3 className="font-bold text-xl sm:text-2xl text-white tracking-tight">
                  {editingPost ? "Edit Chronicle" : "Draft New Chronicle"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer shadow-sm"
                aria-label="Close dialog"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="chronicle-form"
              onSubmit={handleSave}
              className="overflow-y-auto px-6 sm:px-8 py-6 space-y-4 flex-1 pr-4 sm:pr-6 custom-scrollbar"
            >
              {/* Title & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Title</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. The 48-Hour Outage"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>URL Slug</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="e.g. the-48-hour-outage"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g. A Raw Post-Mortem on What Broke and How We Rebuilt"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 outline-none transition"
                />
              </div>

              {/* Category, Grid Span, Read Time & Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Category</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm({ ...form, category: e.target.value as BlogCategory })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 pr-8 text-xs text-white appearance-none cursor-pointer outline-none transition"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0c0c16] text-white">
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Grid Presentation</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.gridSpan}
                      onChange={(e) =>
                        setForm({ ...form, gridSpan: e.target.value as GridSpanType })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 pr-8 text-xs text-white appearance-none cursor-pointer outline-none transition"
                    >
                      {GRID_SPANS.map((g) => (
                        <option key={g.id} value={g.id} className="bg-[#0c0c16] text-white">
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Display Order</span>
                    <span className="text-[10px] text-teal-400 font-mono">1 = Top</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.order || 1}
                    onChange={(e) =>
                      setForm({ ...form, order: parseInt(e.target.value, 10) || 1 })
                    }
                    placeholder="1"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Read Time
                  </label>
                  <input
                    type="text"
                    value={form.readTime}
                    onChange={(e) => setForm({ ...form, readTime: e.target.value })}
                    placeholder="e.g. 6 min read"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Cover Image URL</span>
                  <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                </label>
                <input
                  type="url"
                  required
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Summary / Excerpt</span>
                  <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  placeholder="A compelling 2-3 sentence overview shown in the grid..."
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none resize-none leading-relaxed transition"
                />
              </div>

              {/* Full Content */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Full Article Content (Markdown format)</span>
                  <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                </label>
                <textarea
                  rows={8}
                  required
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Use ## for section titles, ### for subheadings, - for bullets, ``` for code blocks..."
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl p-3.5 text-xs font-mono text-gray-200 placeholder-gray-500 outline-none leading-relaxed transition"
                />
              </div>

              {/* Author & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={form.author.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        author: { ...form.author, name: e.target.value },
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Tags (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="e.g. Architecture, Outage, Scaling"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                  />
                </div>
              </div>

              {/* Checkboxes: Featured & Published */}
              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-gray-200">Featured Chronicle (Top Highlight)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-400 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-emerald-400 font-semibold">Publish Immediately</span>
                </label>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-md flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="chronicle-form"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                <span>{saving ? "Saving…" : editingPost ? "Update Chronicle" : "Publish Chronicle"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL (SOFT DELETE -> RECYCLE BIN)
      ══════════════════════════════════════════════════════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0e0e1a] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Move Chronicle to Recycle Bin?
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Item is safely retained in the Recycle Bin.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-bold text-white block">
                {deleteTarget.title}
              </span>
              <span className="text-[11px] text-teal-400 font-mono block line-clamp-1">
                /{deleteTarget.slug}
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This publication will be removed from the live blog and moved to your admin <strong>Recycle Bin</strong> where you can restore it anytime or permanently purge it.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Moving..." : "Move to Bin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
