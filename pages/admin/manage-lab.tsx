import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { LabProject, LabProjectStatus, LabProjectCategory } from "@/types/lab";
import {
  getAllLabProjects,
  createLabProject,
  updateLabProject,
  deleteLabProject,
  seedDefaultLabProjects,
} from "@/lib/services/labService";
import {
  LabCategory,
  subscribeLabCategories,
  DEFAULT_LAB_CATEGORIES,
} from "@/lib/services/labCategoryService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const STATUS_OPTIONS: LabProjectStatus[] = [
  "CONCEPT",
  "IN_DEVELOPMENT",
  "ALPHA",
  "BETA",
  "LAUNCHING_SOON",
];

const STATUS_COLORS: Record<string, string> = {
  CONCEPT: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  IN_DEVELOPMENT: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  ALPHA: "bg-sky-500/20 text-sky-300 border-sky-500/30",
  BETA: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  LAUNCHING_SOON: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

const EMPTY_FORM: Omit<LabProject, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  title: "",
  tagline: "",
  description: "",
  category: "Web Platform",
  status: "CONCEPT",
  progressPercent: 0,
  estimatedRelease: "",
  laptopImageUrl: "",
  phoneImageUrl: "",
  techStack: [],
  tags: [],
  icon: "science",
  isPublic: true,
  order: 1,
};

export default function ManageLabPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [projects, setProjects] = useState<LabProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Dynamic Categories from Firestore
  const [dynamicCategories, setDynamicCategories] = useState<LabCategory[]>(DEFAULT_LAB_CATEGORIES);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<LabProject | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [techStackInput, setTechStackInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete Confirmation
  const [deleteTarget, setDeleteTarget] = useState<LabProject | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Subscribe to real-time categories
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsub = subscribeLabCategories((cats) => {
      setDynamicCategories(cats);
    });
    return () => unsub();
  }, [authReady, isAdmin]);

  // Load projects
  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await getAllLabProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to load lab projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady && isAdmin) loadProjects();
  }, [authReady, isAdmin]);

  const handleSeedDefaults = async () => {
    setSeeding(true);
    setMessage(null);
    try {
      const count = await seedDefaultLabProjects();
      setMessage({
        text: `Successfully seeded ${count} Lab projects into Firestore! They are now live and editable.`,
        type: "success",
      });
      await loadProjects();
    } catch (err: any) {
      console.error("Error seeding lab projects:", err);
      setMessage({
        text: "Failed to seed lab projects: " + (err?.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setSeeding(false);
    }
  };

  // Open modal for add/edit
  const openModal = (project?: LabProject) => {
    if (project) {
      setEditingProject(project);
      setForm({
        slug: project.slug || project.id,
        title: project.title,
        tagline: project.tagline || "",
        description: project.description,
        category: project.category,
        status: project.status,
        progressPercent: project.progressPercent,
        estimatedRelease: project.estimatedRelease || "",
        laptopImageUrl: project.laptopImageUrl || "",
        phoneImageUrl: project.phoneImageUrl || "",
        techStack: project.techStack || [],
        tags: project.tags || [],
        icon: project.icon || "science",
        isPublic: project.isPublic !== false,
        order: project.order || 1,
      });
      setTechStackInput((project.techStack || []).join(", "));
      setTagsInput((project.tags || []).join(", "));
    } else {
      setEditingProject(null);
      setForm({ ...EMPTY_FORM, order: projects.length + 1 });
      setTechStackInput("");
      setTagsInput("");
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
    setForm(EMPTY_FORM);
    setTechStackInput("");
    setTagsInput("");
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.title.trim()) return alert("Title is required");
    setSaving(true);
    try {
      const payload = {
        ...form,
        techStack: techStackInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        tags: tagsInput
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      if (editingProject) {
        await updateLabProject(editingProject.id, payload);
      } else {
        await createLabProject(payload);
      }
      closeModal();
      loadProjects();
    } catch (err: any) {
      console.error("Failed to save lab project:", err);
      alert("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Delete - Soft Delete into Recycle Bin
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await moveToBin({
        originalCollection: "labProjects",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.title,
        itemType: "labProject",
        data: deleteTarget,
        metadata: {
          category: deleteTarget.category,
          status: deleteTarget.status,
          progressPercent: deleteTarget.progressPercent,
          tagline: deleteTarget.tagline || "",
        },
      });
      await deleteLabProject(deleteTarget.id);
      setDeleteTarget(null);
      setMessage({
        text: `Lab experiment "${deleteTarget.title}" moved to Recycle Bin.`,
        type: "success",
      });
      loadProjects();
    } catch (err: any) {
      console.error("Failed to delete lab project:", err);
      setMessage({
        text: "Failed to move to bin: " + (err?.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Toggle visibility
  const toggleVisibility = async (project: LabProject) => {
    try {
      await updateLabProject(project.id, { isPublic: !project.isPublic });
      setProjects((prev) =>
        prev.map((p) =>
          p.id === project.id ? { ...p, isPublic: !p.isPublic } : p
        )
      );
    } catch (err: any) {
      console.error("Failed to toggle visibility:", err);
      alert("Failed to toggle: " + (err?.message || "Unknown error"));
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <HelixLoader size={48} color="#2dd4bf" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const categoryNames = dynamicCategories.map((c) => c.name);
  const categoryOptions = Array.from(new Set([...categoryNames, form.category].filter(Boolean)));

  return (
    <AdminLayout>
      <Head>
        <title>Manage Lab Projects | Admin — DevEngine</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Status Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-sm shadow-xl backdrop-blur-xl ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="font-mono text-xs">{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-teal-400 transition-colors"
                >
                  Dashboard
                </Link>
                <span>/</span>
                <span>CMS Engine</span>
                <span>/</span>
                <span className="text-teal-400">App Lab Experiments</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  App Lab Experiments
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-[11px] font-mono text-teal-300">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Live Firestore
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Manage ongoing and upcoming experiments displayed in DevEngine Lab.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/admin/manage-lab-categories"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-teal-500/40 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px] text-teal-400">category</span>
                <span>Manage Categories</span>
              </Link>
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-teal-500/40 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-mono transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {seeding ? "Syncing..." : "⚡ Seed Default Projects"}
              </button>
              <button
                type="button"
                onClick={() => openModal()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              >
                + Add Lab Project
              </button>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Total Experiments</span>
              <p className="text-2xl font-bold text-white mt-1.5">{projects.length}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">In Development</span>
              <p className="text-2xl font-bold text-amber-400 mt-1.5">
                {projects.filter((p) => ["IN_DEVELOPMENT", "ALPHA", "BETA"].includes(p.status)).length}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider">Public Active</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1.5">
                {projects.filter((p) => p.isPublic).length}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-rose-400 uppercase tracking-wider">Launching Soon</span>
              <p className="text-2xl font-bold text-rose-400 mt-1.5">
                {projects.filter((p) => p.status === "LAUNCHING_SOON").length}
              </p>
            </div>
          </div>

          {/* Centered Middle Loader or Project List */}
          {loading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 gap-3">
              <HelixLoader size={45} color="#2dd4bf" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                Loading lab experiments...
              </span>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl p-12 sm:p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl">science</span>
              </div>
              <p className="text-lg text-white font-medium">
                No lab projects in database yet.
              </p>
              <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto mb-6">
                Click below to seed default experiments into Firestore so you can customize or remove them.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {seeding ? "Syncing..." : "⚡ Seed Default Projects"}
                </button>
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
                >
                  Add Blank Project
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const statusClass =
                  STATUS_COLORS[project.status] || STATUS_COLORS.CONCEPT;
                return (
                  <div
                    key={project.id}
                    className="p-5 sm:p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl hover:border-white/[0.16] transition-all flex flex-col lg:flex-row items-start lg:items-center gap-5"
                  >
                    {/* Image Preview */}
                    <div className="w-full lg:w-48 h-28 rounded-2xl bg-black/40 overflow-hidden shrink-0 border border-white/[0.08]">
                      {project.laptopImageUrl ? (
                        <img
                          src={project.laptopImageUrl}
                          alt={project.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                          <span className="material-symbols-outlined text-3xl">
                            {project.icon || "science"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded font-mono font-bold tracking-widest uppercase">
                          LAB-{String(project.order).padStart(3, "0")}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono uppercase tracking-wider font-semibold ${statusClass}`}
                        >
                          {project.status.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider ${
                            project.isPublic
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : "bg-gray-800 text-gray-400 border border-gray-700"
                          }`}
                        >
                          {project.isPublic ? "PUBLIC" : "HIDDEN"}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg text-white truncate">
                        {project.title}
                      </h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {project.tagline}
                      </p>
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-gray-400 font-mono">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-400 rounded-full"
                              style={{ width: `${project.progressPercent}%` }}
                            />
                          </div>
                          <span>{project.progressPercent}%</span>
                        </div>
                        <span>
                          Release:{" "}
                          {project.estimatedRelease
                            ? new Date(project.estimatedRelease).toLocaleDateString()
                            : "TBD"}
                        </span>
                        <span className="hidden sm:inline">Category: {project.category}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleVisibility(project)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                          project.isPublic
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.08]"
                        }`}
                      >
                        {project.isPublic ? "Hide" : "Show"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openModal(project)}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-teal-300 border border-white/[0.08] text-xs font-mono transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(project)}
                        className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-mono transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ═══ BOUNDED ADD / EDIT MODAL ═══ */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-3xl max-h-[90vh] bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
              {/* Pinned Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    {editingProject ? "Edit Lab Project" : "Add Lab Project"}
                  </h2>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    Configure experiment details, roadmap progress, and imagery
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <form id="lab-project-form" onSubmit={handleSave} className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                {/* Row 1: Title & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Project Nexus"
                      value={form.title}
                      onChange={(e) =>
                        setForm({ ...form, title: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-sm focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Slug (auto-generated if empty)
                    </label>
                    <input
                      type="text"
                      placeholder="project-nexus"
                      value={form.slug}
                      onChange={(e) =>
                        setForm({ ...form, slug: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Tagline */}
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Tagline *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="One-line elevator pitch"
                    value={form.tagline}
                    onChange={(e) =>
                      setForm({ ...form, tagline: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-sm focus:outline-none transition-colors"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed project description..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl p-4 text-white text-sm focus:outline-none transition-colors leading-relaxed"
                  />
                </div>

                {/* Row 2: Category, Status, Icon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono text-gray-300">
                        Category *
                      </label>
                      <Link
                        href="/admin/manage-lab-categories"
                        target="_blank"
                        className="text-[10px] font-mono text-teal-400 hover:text-teal-300 transition flex items-center gap-0.5"
                        title="Manage Categories in new tab"
                      >
                        <span>+ Manage</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </Link>
                    </div>
                    <div className="relative">
                      <select
                        value={form.category}
                        onChange={(e) =>
                          setForm({ ...form, category: e.target.value as LabProjectCategory })
                        }
                        className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 pr-10 text-white text-xs font-mono appearance-none focus:outline-none transition-colors cursor-pointer"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            status: e.target.value as LabProjectStatus,
                          })
                        }
                        className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 pr-10 text-white text-xs font-mono appearance-none focus:outline-none transition-colors cursor-pointer"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <svg className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Icon (Material Symbols)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. science"
                      value={form.icon}
                      onChange={(e) =>
                        setForm({ ...form, icon: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Row 3: Progress, Release Date, Order */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Progress ({form.progressPercent}%)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={form.progressPercent}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          progressPercent: parseInt(e.target.value),
                        })
                      }
                      className="w-full mt-2 accent-teal-400 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Estimated Release Date
                    </label>
                    <input
                      type="date"
                      value={form.estimatedRelease}
                      onChange={(e) =>
                        setForm({ ...form, estimatedRelease: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Display Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.order}
                      onChange={(e) =>
                        setForm({ ...form, order: parseInt(e.target.value) || 1 })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Row 4: Image URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Laptop Screenshot URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.laptopImageUrl}
                      onChange={(e) =>
                        setForm({ ...form, laptopImageUrl: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Phone Screenshot URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={form.phoneImageUrl}
                      onChange={(e) =>
                        setForm({ ...form, phoneImageUrl: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Row 5: Tech Stack & Tags */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Tech Stack (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="Next.js, TypeScript, Firebase"
                      value={techStackInput}
                      onChange={(e) => setTechStackInput(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="SAAS, REAL-TIME, AI"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="labPublic"
                    checked={form.isPublic}
                    onChange={(e) =>
                      setForm({ ...form, isPublic: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-black/40 border-white/[0.1] text-teal-400 focus:ring-teal-400 cursor-pointer"
                  />
                  <label
                    htmlFor="labPublic"
                    className="text-xs font-mono text-gray-300 cursor-pointer"
                  >
                    Public (Visible in DevEngine Lab experiments directory)
                  </label>
                </div>
              </form>

              {/* Pinned Footer */}
              <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-mono transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="lab-project-form"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ RECYCLE BIN DELETE CONFIRMATION MODAL ═══ */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0c0c16]/98 border border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-xl text-white mb-2">
                Move to Recycle Bin?
              </h3>
              <p className="text-sm text-gray-400 mb-1">
                Are you sure you want to remove <span className="text-white font-semibold">&quot;{deleteTarget.title}&quot;</span>?
              </p>
              <p className="text-xs text-gray-500 mb-6 font-mono">
                This project will be archived in the Recycle Bin where it can be restored anytime or permanently purged.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-xs font-mono font-semibold transition-all shadow-lg shadow-red-500/25 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Moving...</span>
                    </>
                  ) : (
                    "Move to Bin"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
