import { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { getProjectPrices } from "@/lib/services/currencyService";
import { CurrencyPricing } from "@/types/currency";
import { seedCatalogProjects } from "@/lib/services/masterSeedService";
import { moveToBin } from "@/lib/services/binService";
import HelixLoader from "@/components/HelixLoader";

interface Project {
  id: string; // Firestore doc id (slug)
  slug?: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  image?: string;
  price: string;
  discount: string;
  pricing?: CurrencyPricing[];
  category: string;
  tags: string[];
  isPublic?: boolean;
  createdAt?: any;
}

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageProjectsPage() {
  const router = useRouter();

  // Auth gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modals
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);

  // Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Subscribe to projects
  useEffect(() => {
    if (!authReady || !isAdmin) return;

    const colRef = collection(db, "projects");
    const unsub = onSnapshot(
      colRef,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: d.id,
            ...data,
          } as Project;
        });

        // Newest first
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });

        setProjects(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setErrMsg("Failed to load catalog projects.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    setErrMsg("");
    setSuccessMsg("");
    try {
      const res = await seedCatalogProjects();
      setSuccessMsg(`Successfully seeded ${res.projects} starter projects & ${res.tags} tags into Firestore.`);
      setSeedModalOpen(false);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (err: any) {
      console.error("Error seeding catalog:", err);
      setErrMsg("Failed to seed projects: " + (err?.message || "Unknown error"));
    } finally {
      setSeeding(false);
    }
  };

  const confirmMoveToBin = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await moveToBin({
        originalCollection: "projects",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.title,
        itemType: "Project",
        data: deleteTarget,
        metadata: {
          category: deleteTarget.category,
          price: deleteTarget.price,
          isPublic: deleteTarget.isPublic,
        },
      });

      setSuccessMsg(`Project "${deleteTarget.title}" moved to Recycle Bin.`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(""), 5000);
    } catch (error) {
      console.error("Error moving project to bin:", error);
      setErrMsg("Failed to delete project. Please check permissions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePublish = async (p: Project) => {
    try {
      await updateDoc(doc(db, "projects", p.id), { isPublic: !p.isPublic });
      setSuccessMsg(`Project "${p.title}" ${!p.isPublic ? "published live" : "moved to draft"}.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (error) {
      console.error("Error toggling publish:", error);
      setErrMsg("Failed to update project status.");
    }
  };

  // Filtered list
  const filteredProjects = projects.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(q) ||
      p.subtitle?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q));

    const matchesCat =
      selectedCategory === "all" ||
      p.category?.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "published" ? p.isPublic : !p.isPublic);

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Summary counts
  const totalCount = projects.length;
  const liveCount = projects.filter((p) => p.isPublic).length;
  const draftCount = totalCount - liveCount;

  // Distinct categories
  const categories = ["all", ...Array.from(new Set(projects.map((p) => p.category?.toLowerCase()).filter(Boolean)))];

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Manage Projects | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Projects | DevEngine Admin">
      <Head>
        <title>Manage All Projects | DevEngine Admin</title>
      </Head>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 text-white space-y-7 font-sans">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Catalog & Products / CMS
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Catalog Engine Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manage All Projects
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Active catalog software, pricing options, tag taxonomy, and public status.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/add-project"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-[0_0_15px_rgba(20,184,166,0.3)] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Project</span>
            </Link>

            <Link
              href="/admin/manage-currencies"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">currency_exchange</span>
              <span>Currencies</span>
            </Link>

            <Link
              href="/admin/manage-tags"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">label</span>
              <span>Manage Tags</span>
            </Link>

            <button
              onClick={() => setSeedModalOpen(true)}
              disabled={seeding}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-cyan-500/10 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-medium text-cyan-300 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Populate catalog with starter projects"
            >
              <span className="material-symbols-outlined text-[15px]">database</span>
              <span>Seed Catalog</span>
            </button>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {errMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errMsg}</span>
            </div>
            <button
              onClick={() => setErrMsg("")}
              className="text-rose-400 hover:text-rose-200"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg("")}
              className="text-emerald-400 hover:text-emerald-200"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* ── STATS STRIP ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Total Catalog Projects
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {totalCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">inventory_2</span>
            </div>
          </div>

          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block mb-1">
                Published Live
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {liveCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">visibility</span>
            </div>
          </div>

          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block mb-1">
                Drafts & Hidden
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight">
                {draftCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">visibility_off</span>
            </div>
          </div>
        </div>

        {/* ── FILTER & SEARCH BAR ── */}
        <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          {/* Search Box */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by title, subtitle, or tech tags..."
              className="w-full h-10 pl-9 pr-4 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl text-xs text-white placeholder-gray-500 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Selector */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-3 pr-8 text-xs text-gray-300 font-medium capitalize outline-none transition cursor-pointer appearance-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[16px]">
                expand_more
              </span>
            </div>

            {/* Status Filter */}
            <div className="flex items-center bg-black/40 border border-white/[0.08] rounded-xl p-0.5">
              <button
                onClick={() => setSelectedStatus("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedStatus === "all"
                    ? "bg-teal-500/20 text-teal-300 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedStatus("published")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedStatus === "published"
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Live
              </button>
              <button
                onClick={() => setSelectedStatus("draft")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedStatus === "draft"
                    ? "bg-amber-500/20 text-amber-300 font-semibold"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Drafts
              </button>
            </div>
          </div>
        </div>

        {/* ── PROJECTS GRID ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <HelixLoader size={45} color="#14b8a6" />
            <p className="text-xs text-gray-400 mt-4">Loading catalog projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 bg-[#0c0c16]/80 border border-white/[0.07] rounded-3xl p-8 max-w-md mx-auto shadow-xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">folder_off</span>
            </div>
            <div>
              <p className="text-base font-bold text-white mb-1">
                No matching projects found
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "Try adjusting your search query or filter tags."
                  : "Seed the catalog with starter projects or add your first project."}
              </p>
            </div>
            {projects.length === 0 && (
              <button
                onClick={() => setSeedModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs transition shadow-lg inline-flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">cloud_sync</span>
                <span>Seed Catalog Projects</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const publicPath = `/projects/${project.slug || project.id}`;
              const pricingPath = `/projects/${project.slug || project.id}/pricing`;
              const projectPrices = getProjectPrices(project);

              return (
                <div
                  key={project.id}
                  className="bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between transition-all duration-200 group"
                >
                  {/* Top content */}
                  <div>
                    {/* Project Cover Thumbnail (if present) */}
                    {((project as any).images?.[0] || project.imageUrl || project.image) && (
                      <div className="relative w-full h-44 sm:h-48 rounded-xl overflow-hidden mb-3.5 border border-white/[0.08] bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={(project as any).images?.[0] || project.imageUrl || project.image}
                          alt={project.title}
                          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c16]/80 via-transparent to-transparent opacity-60 pointer-events-none" />
                      </div>
                    )}

                    {/* Header line: Title & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 pr-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded border border-teal-400/20 inline-block mb-1.5">
                          {project.category || "General"}
                        </span>
                        <h2 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-teal-300 transition-colors line-clamp-1">
                          {project.title}
                        </h2>
                      </div>

                      <span
                        className={`text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border shrink-0 flex items-center gap-1.5 ${
                          project.isPublic
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            project.isPublic ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                          }`}
                        />
                        <span>{project.isPublic ? "PUBLISHED" : "DRAFT"}</span>
                      </span>
                    </div>

                    {/* Subtitle */}
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-[32px] mb-3">
                      {project.subtitle || "No summary provided."}
                    </p>

                    {/* Multi-Currency Price Strip */}
                    <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3 my-3 space-y-1.5">
                      <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                          Pricing Matrix
                        </span>
                        <span className="text-[10px] font-mono text-teal-400">
                          {projectPrices.length} Active
                        </span>
                      </div>

                      {projectPrices.map((p) => (
                        <div
                          key={p.currency}
                          className="flex items-center justify-between text-xs font-mono pt-0.5"
                        >
                          <span className="text-gray-300 font-medium">
                            {p.currency} ({p.symbol})
                          </span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-teal-300 font-bold">
                              {p.symbol} {p.discountPrice || p.regularPrice}
                            </span>
                            {p.discountPrice && (
                              <span className="line-through text-gray-500 text-[10px]">
                                {p.symbol} {p.regularPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tags Cloud */}
                    <div className="flex flex-wrap gap-1.5 my-3 min-h-[26px]">
                      {project.tags && project.tags.length > 0 ? (
                        project.tags.slice(0, 5).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-medium bg-white/[0.03] text-gray-300 border border-white/[0.07] px-2 py-0.5 rounded-lg"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-gray-500 italic">No tags assigned</span>
                      )}
                      {project.tags && project.tags.length > 5 && (
                        <span className="text-[10px] text-teal-400/80 px-1 py-0.5">
                          +{project.tags.length - 5}
                        </span>
                      )}
                    </div>

                    {/* Quick Storefront Links */}
                    <div className="flex items-center justify-between text-xs pt-1 pb-2">
                      <Link
                        href={publicPath}
                        target="_blank"
                        className="text-gray-400 hover:text-white flex items-center gap-1 transition"
                      >
                        <span>Storefront Page</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </Link>

                      <Link
                        href={pricingPath}
                        target="_blank"
                        className="text-teal-300 hover:text-teal-200 flex items-center gap-1 transition font-medium"
                      >
                        <span>Pricing Tier</span>
                        <span className="material-symbols-outlined text-[13px]">payments</span>
                      </Link>
                    </div>
                  </div>

                  {/* Actions Bar (Strictly Aligned at Card Bottom) */}
                  <div className="grid grid-cols-3 gap-2 pt-3.5 border-t border-white/[0.07] mt-3">
                    <Link
                      href={`/admin/edit-project/${project.id}`}
                      className="h-9 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-semibold text-white transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">edit</span>
                      <span>Edit</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(project)}
                      className={`h-9 px-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer border ${
                        project.isPublic
                          ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {project.isPublic ? "visibility_off" : "visibility"}
                      </span>
                      <span>{project.isPublic ? "Unpublish" : "Publish"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(project)}
                      className="h-9 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── DELETE MODAL (SOFT DELETE -> RECYCLE BIN) ── */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0e0e1a] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Move Project to Recycle Bin?
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
                <span className="text-[11px] text-gray-400 block line-clamp-1">
                  {deleteTarget.subtitle}
                </span>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                This project will be removed from live storefront catalog cards and moved to your admin <strong>Recycle Bin</strong> where you can restore it anytime or delete it permanently.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmMoveToBin}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                >
                  {isDeleting ? "Moving..." : "Move to Bin"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SEED CATALOG MODAL ── */}
        {seedModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0e0e1a] border border-cyan-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">cloud_sync</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Seed Starter Projects?
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Sync official starter templates to Firestore
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                This will write or update the 6 official starter catalog projects (CraftyBay, QuizCrafter, Find It, etc.) and tags in your Firestore database.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSeedModalOpen(false)}
                  disabled={seeding}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-black font-bold text-xs shadow-lg transition flex items-center gap-1.5"
                >
                  {seeding ? "Syncing..." : "Seed Starter Projects"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
