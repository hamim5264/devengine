import { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { moveToBin } from "@/lib/services/binService";
import HelixLoader from "@/components/HelixLoader";

interface Tag {
  id: string; // doc id (slug)
  name: string; // display name
}

const makeSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageTagsPage() {
  const router = useRouter();

  // Admin gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Tag | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin-only access check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Live tag list
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const colRef = collection(db, "tags");
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name,
        })) as Tag[];

        list.sort((a, b) => a.name.localeCompare(b.name));
        setTags(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setErrMsg("Failed to load tags. Check Firestore rules or network.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [authReady, isAdmin]);

  const handleAddTag = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrMsg("");
    const name = newTag.trim();
    if (!name) return;

    const slug = makeSlug(name);
    if (!slug) {
      setErrMsg("Tag name is not valid.");
      return;
    }

    try {
      const ref = doc(db, "tags", slug);
      const exists = await getDoc(ref);
      if (exists.exists()) {
        setErrMsg(`Tag "${name}" already exists.`);
        return;
      }
      await setDoc(ref, { name });
      setNewTag("");
      setSuccessMsg(`Tag "${name}" added successfully.`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      setErrMsg("Failed to add tag.");
    }
  };

  const handleEditTag = async (id: string) => {
    setErrMsg("");
    const name = editingName.trim();
    if (!name) return;
    try {
      await updateDoc(doc(db, "tags", id), { name });
      setEditingTagId(null);
      setEditingName("");
      setSuccessMsg(`Tag updated to "${name}".`);
      setTimeout(() => setSuccessMsg(""), 3500);
    } catch (err) {
      console.error(err);
      setErrMsg("Failed to update tag.");
    }
  };

  const confirmMoveToBin = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await moveToBin({
        originalCollection: "tags",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.name,
        itemType: "Tag",
        data: deleteTarget,
      });

      setSuccessMsg(`Tag "${deleteTarget.name}" moved to Recycle Bin.`);
      setDeleteTarget(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      console.error(err);
      setErrMsg("Failed to delete tag.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered tags
  const filteredTags = tags.filter((t) =>
    !searchQuery ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authReady || !isAdmin) {
    return (
      <AdminLayout title="Manage Tags | DevEngine Admin">
        <main className="flex items-center justify-center min-h-[calc(100vh-56px)] bg-[#07070f]">
          <HelixLoader size={48} color="#14b8a6" />
        </main>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Manage Tags | DevEngine Admin">
      <Head>
        <title>Manage Project Tags | DevEngine Admin</title>
      </Head>

      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-8 text-white space-y-7 font-sans">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Catalog & Taxonomy
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Active Tag Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Manage Project Tags
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Create, edit, and organize taxonomy tags for catalog discovery and multi-filter matching.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href="/admin/manage-projects"
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              <span>Back to Projects</span>
            </Link>

            <Link
              href="/admin/add-project"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-[0_0_15px_rgba(20,184,166,0.3)] transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Add Project</span>
            </Link>
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        {errMsg && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg">
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
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg">
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

        {/* ── METRICS STRIP ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Total Available Tags
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                {tags.length}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">label</span>
            </div>
          </div>

          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block mb-1">
                Matching Active Filter
              </span>
              <span className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
                {filteredTags.length}
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">filter_alt</span>
            </div>
          </div>

          <div className="bg-[#0c0c16]/90 border border-white/[0.07] rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400/90 block mb-1">
                Taxonomy Health
              </span>
              <span className="text-base sm:text-lg font-bold font-mono text-cyan-300 flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                Synchronized
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">verified</span>
            </div>
          </div>
        </div>

        {/* ── CREATE NEW TAG & SEARCH ROW ── */}
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Add Tag Form */}
            <form onSubmit={handleAddTag} className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Create New Tag
              </label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-500">
                    #
                  </span>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter tag name (e.g. Next.js, Trending)"
                    className="w-full h-11 pl-8 pr-4 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add Tag</span>
                </button>
              </div>
            </form>

            {/* Search Filter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-gray-300">
                Search Taxonomy
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tags by name or slug..."
                  className="w-full h-11 pl-10 pr-4 bg-black/40 border border-white/[0.08] focus:border-teal-400/70 rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 outline-none transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── TAGS LIST CONTAINER ── */}
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center text-xs font-bold font-mono">
                #
              </span>
              <h2 className="text-sm font-bold text-white">
                Configured Tags ({filteredTags.length})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-gray-500">
              A → Z Sorted
            </span>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <HelixLoader size={40} color="#14b8a6" />
              <p className="text-xs text-gray-400 mt-3">Loading taxonomy tags...</p>
            </div>
          ) : filteredTags.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <span className="material-symbols-outlined text-gray-600 text-4xl block">
                label_off
              </span>
              <p className="text-sm font-semibold text-gray-300">
                {searchQuery ? "No tags match your search" : "No project tags found"}
              </p>
              <p className="text-xs text-gray-500">
                {searchQuery ? "Try searching for a different keyword." : "Add your first tag above to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTags.map((tag) => {
                const isEditing = editingTagId === tag.id;

                return (
                  <div
                    key={tag.id}
                    className="bg-black/30 border border-white/[0.07] hover:border-teal-500/30 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 transition group"
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2 w-full">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="w-full h-9 bg-black/60 border border-teal-400/60 rounded-xl px-3 text-xs text-white outline-none transition"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleEditTag(tag.id)}
                          className="h-9 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs shrink-0 transition"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTagId(null);
                            setEditingName("");
                          }}
                          className="h-9 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-xs shrink-0 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-xl bg-teal-400/10 border border-teal-400/20 text-teal-300 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                            #
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs sm:text-sm font-semibold text-white group-hover:text-teal-300 transition-colors block truncate">
                              {tag.name}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 block truncate">
                              slug: {tag.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTagId(tag.id);
                              setEditingName(tag.name);
                            }}
                            className="h-8 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-gray-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                            title="Rename Tag"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(tag)}
                            className="h-8 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-medium text-rose-300 transition flex items-center gap-1 cursor-pointer"
                            title="Delete Tag"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            <span>Delete</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── DELETE TAG MODAL (RECYCLE BIN SOFT DELETE) ── */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[#0e0e1a] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">delete_forever</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Move Tag to Recycle Bin?
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Safe soft-delete with bin recovery
                  </p>
                </div>
              </div>

              <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 space-y-1">
                <span className="text-xs font-bold text-white block">
                  #{deleteTarget.name}
                </span>
                <span className="text-[11px] font-mono text-gray-400 block">
                  Identifier: {deleteTarget.id}
                </span>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed">
                This tag will be moved to your admin <strong>Recycle Bin</strong>. Projects referencing this tag will retain the string identifier until manually re-saved.
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
      </main>
    </AdminLayout>
  );
}
