import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";

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

export default function ManageTagsPage() {
  const router = useRouter();

  // Admin gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTag, setNewTag] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Admin-only access check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === "hamim.leon@gmail.com";
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Live tag list (after auth)
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
        // optional sort (A→Z)
        list.sort((a, b) => a.name.localeCompare(b.name));
        setTags(list);
      },
      (err) => setErrMsg("Failed to load tags. Check rules/network.")
    );
    return () => unsub();
  }, [authReady, isAdmin]);

  const handleAddTag = async () => {
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
        setErrMsg("This tag already exists.");
        return;
      }
      await setDoc(ref, { name });
      setNewTag("");
    } catch (err) {
      console.error(err);
      setErrMsg("❌ Failed to add tag.");
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
    } catch (err) {
      console.error(err);
      setErrMsg("❌ Failed to update tag.");
    }
  };

  const handleDeleteTag = async (id: string) => {
    const confirm = window.confirm(
      "Delete this tag? Projects that reference it will still store the old tag id."
    );
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "tags", id));
    } catch (err) {
      console.error(err);
      setErrMsg("❌ Failed to delete tag.");
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <>
        <Head>
          <title>Manage Tags | DevEngine Admin</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <p className="text-gray-400">Checking admin access...</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Manage Tags | DevEngine Admin</title>
      </Head>
      <Navbar />
      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <div className="flex items-center justify-between gap-4 mb-10">
          <h1 className="text-3xl font-bold text-teal-400">
            Manage Project Tags
          </h1>
          <Link
            href="/admin/add-project"
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
          >
            Add Project
          </Link>
        </div>

        {errMsg && (
          <div className="max-w-xl mx-auto mb-6 bg-red-500/10 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
            {errMsg}
          </div>
        )}

        <div className="max-w-xl mx-auto space-y-6 bg-gray-800 p-6 rounded-xl shadow-xl border border-gray-700">
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Enter new tag (e.g. trending)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={handleAddTag}
              className="bg-teal-500 hover:bg-teal-600 px-4 py-2 rounded-lg text-white font-semibold"
            >
              Add
            </button>
          </div>

          <div className="space-y-4">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between bg-gray-700 p-3 rounded-lg border border-gray-600"
              >
                {editingTagId === tag.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-gray-800 text-white p-2 rounded w-full mr-4 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleEditTag(tag.id)}
                        className="bg-blue-500 hover:bg-blue-600 px-4 py-1 rounded text-sm text-white font-semibold"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => {
                          setEditingTagId(null);
                          setEditingName("");
                        }}
                        className="bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded text-sm text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-white text-sm font-medium">
                      #{tag.name}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTagId(tag.id);
                          setEditingName(tag.name);
                        }}
                        className="h-10 px-4 min-w-[120px] rounded-lg text-sm font-semibold inline-flex items-center justify-center bg-white text-black hover:bg-gray-100"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteTag(tag.id)}
                        className="h-10 px-4 min-w-[120px] rounded-lg text-sm font-semibold inline-flex items-center justify-center bg-red-600 text-white hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
