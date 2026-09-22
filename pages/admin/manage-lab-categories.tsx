import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  LabCategory,
  subscribeLabCategories,
  createLabCategory,
  updateLabCategory,
  deleteLabCategory,
  seedDefaultLabCategories,
  makeSlug,
} from "@/lib/services/labCategoryService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const POPULAR_ICONS = [
  "category",
  "smartphone",
  "language",
  "psychology",
  "cloud",
  "desktop_windows",
  "devices",
  "science",
  "hub",
  "neurology",
  "rocket_launch",
  "terminal",
  "database",
  "memory",
  "security",
  "smart_toy",
];

export default function ManageLabCategoriesPage() {
  const router = useRouter();

  // Admin gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Categories data
  const [categories, setCategories] = useState<LabCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [seeding, setSeeding] = useState(false);

  // New Category Form State
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newIcon, setNewIcon] = useState("category");
  const [newOrder, setNewOrder] = useState<number>(10);
  const [creating, setCreating] = useState(false);

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<LabCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIcon, setEditIcon] = useState("category");
  const [editOrder, setEditOrder] = useState<number>(10);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<LabCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Notifications
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Auth gate check
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
    const unsub = subscribeLabCategories(
      (cats) => {
        setCategories(cats);
        setLoading(false);
      },
      (err) => {
        console.warn("Lab categories live sync notice:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [authReady, isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");

    const name = newName.trim();
    if (!name) {
      setErrMsg("Category name is required.");
      return;
    }

    try {
      setCreating(true);
      const generatedSlug = newSlug.trim() || makeSlug(name);
      await createLabCategory({
        name,
        slug: generatedSlug,
        description: newDescription.trim(),
        icon: newIcon,
        order: Number(newOrder) || 10,
      });

      setSuccessMsg(`Category "${name}" created successfully!`);
      setNewName("");
      setNewSlug("");
      setNewDescription("");
      setNewIcon("category");
      setNewOrder(categories.length + 1);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Create category error:", err);
      setErrMsg(err?.message || "Failed to create category.");
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (cat: LabCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
    setEditIcon(cat.icon || "category");
    setEditOrder(cat.order ?? 10);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setErrMsg("");
    setSuccessMsg("");

    const name = editName.trim();
    if (!name) {
      setErrMsg("Category name cannot be empty.");
      return;
    }

    try {
      setSavingEdit(true);
      await updateLabCategory(editingCategory.id, {
        name,
        description: editDescription.trim(),
        icon: editIcon,
        order: Number(editOrder) || 10,
      });

      setSuccessMsg(`Category "${name}" updated successfully!`);
      setEditingCategory(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Update category error:", err);
      setErrMsg(err?.message || "Failed to update category.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setErrMsg("");
    setSuccessMsg("");

    try {
      setDeleting(true);
      await moveToBin({
        originalCollection: "lab_categories",
        originalId: deleteTarget.id,
        itemType: "lab_category",
        itemTitle: deleteTarget.name,
        data: deleteTarget,
        deletedBy: ADMIN_EMAIL,
      });

      await deleteLabCategory(deleteTarget.id);
      setSuccessMsg(`Category "${deleteTarget.name}" moved to trash!`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Delete category error:", err);
      setErrMsg("Failed to delete category.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setErrMsg("");
    setSuccessMsg("");
    try {
      setSeeding(true);
      await seedDefaultLabCategories();
      setSuccessMsg("Default categories verified and initialized!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Seed error:", err);
      setErrMsg("Failed to seed default categories.");
    } finally {
      setSeeding(false);
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q)
    );
  });

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Manage Categories | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Categories | DevEngine Admin">
      <Head>
        <title>Manage Categories | DevEngine Admin</title>
      </Head>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 text-white space-y-7 font-sans">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Taxonomy & Global Classification
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Sync Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manage Categories
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Create, view, and organize global categories used across Lab experiments and software selectors.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/manage-lab"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">science</span>
              <span>Manage Lab</span>
            </Link>

            <Link
              href="/admin/manage-projects"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">folder</span>
              <span>Manage Projects</span>
            </Link>

            <button
              type="button"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">sync</span>
              <span>{seeding ? "Syncing..." : "Seed Defaults"}</span>
            </button>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {errMsg && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-rose-400">error</span>
              <span className="font-medium">{errMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrMsg("")}
              className="p-1 hover:bg-rose-500/20 rounded-lg text-rose-400 transition"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[20px] text-emerald-400">check_circle</span>
              <span className="font-medium">{successMsg}</span>
            </div>
          </div>
        )}

        {/* ── CREATE CATEGORY DRAWER / CARD ── */}
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-white/[0.06]">
            <span className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">add_box</span>
            </span>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Create New Category
              </h2>
              <p className="text-xs text-gray-400">
                Newly created categories are available immediately across all project and lab dropdown selectors.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Category Name <span className="text-teal-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. AI Engine, Robotics, Web3"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    if (!newSlug || newSlug === makeSlug(newName)) {
                      setNewSlug(makeSlug(e.target.value));
                    }
                  }}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-sm text-white placeholder-gray-500 transition outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Unique Slug</span>
                  <span className="text-[10px] font-mono text-gray-500">Auto or Custom</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ai-engine"
                  value={newSlug}
                  onChange={(e) => setNewSlug(makeSlug(e.target.value))}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-xs font-mono text-white placeholder-gray-500 transition outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Icon Symbol</span>
                  <span className="text-[10px] font-mono text-teal-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">{newIcon}</span>
                    <span>Preview</span>
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. psychology, science"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value.trim().toLowerCase())}
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl pl-10 pr-4 text-xs font-mono text-white placeholder-gray-500 transition outline-none"
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-teal-400 text-[18px]">
                    {newIcon || "category"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Icon Selector Chips */}
            <div>
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                Quick Select Icon:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setNewIcon(iconName)}
                    className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1 transition ${
                      newIcon === iconName
                        ? "bg-teal-500/20 border-teal-500/50 text-teal-300"
                        : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">{iconName}</span>
                    <span className="text-[10px] font-mono">{iconName}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-4 items-center">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Brief Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed infrastructure, smart agent workflows, etc."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 focus:bg-black/60 focus:ring-1 focus:ring-teal-400/20 rounded-xl px-4 text-xs text-white placeholder-gray-500 transition outline-none"
                />
              </div>

              <div className="sm:col-span-1 self-end">
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-[0_0_15px_rgba(20,184,166,0.3)] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <HelixLoader size={16} color="#000000" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">add_circle</span>
                      <span>Add Category</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── PREVIOUS CATEGORIES LIST ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold text-white tracking-tight">
                Previous & Existing Categories
              </h2>
              <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30">
                {categories.length} Total
              </span>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl pl-9 pr-8 text-xs text-white placeholder-gray-500 transition outline-none"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[16px]">
                search
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <HelixLoader size={40} color="#14b8a6" />
              <p className="text-xs text-gray-400 mt-3 font-mono">Loading categories from Firestore...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0c0c16]/80 border border-white/[0.07] text-gray-400">
              <span className="material-symbols-outlined text-3xl text-gray-600 block mb-2">
                category
              </span>
              <p className="text-sm font-semibold text-white">No categories found</p>
              <p className="text-xs mt-1">
                {searchQuery
                  ? "No categories match your search filter."
                  : "Click 'Seed Defaults' or use the form above to add your first category."}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/40 rounded-2xl p-5 shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            {cat.icon || "category"}
                          </span>
                        </span>
                        <div>
                          <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                            {cat.name}
                          </h3>
                          <span className="text-[10px] font-mono text-gray-400">
                            slug: {cat.slug || cat.id}
                          </span>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-gray-500 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.06]">
                        #{idx + 1}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed min-h-[32px]">
                      {cat.description || "No description provided."}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Active Global</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-teal-300 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                        title="Edit category"
                      >
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(cat)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                        title="Delete category"
                      >
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── EDIT CATEGORY MODAL ── */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-[22px]">edit_note</span>
                <h3 className="text-base font-bold text-white">
                  Edit Category: {editingCategory.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-4 text-sm text-white outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Icon Symbol</span>
                  <span className="text-[10px] font-mono text-teal-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">{editIcon}</span>
                    <span>Preview</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={editIcon}
                  onChange={(e) => setEditIcon(e.target.value.trim().toLowerCase())}
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl px-4 text-xs font-mono text-white outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl p-3 text-xs text-white leading-relaxed outline-none transition"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs transition flex items-center gap-1.5"
                >
                  {savingEdit ? (
                    <>
                      <HelixLoader size={14} color="#000000" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">delete</span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Delete Category &quot;{deleteTarget.name}&quot;?
              </h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                This category will be moved to the Trash Bin. Projects currently using this category will retain their saved category tag, but it will no longer appear in future creation dropdowns.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs transition flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <HelixLoader size={14} color="#ffffff" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Move to Trash</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
