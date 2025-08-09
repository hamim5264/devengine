import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Head from "next/head";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
}

export default function EditProjectPage() {
  const router = useRouter();
  const { id } = router.query;

  // Admin gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<any>(null);
  const [toolsInput, setToolsInput] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
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

  // Load project + tags
  useEffect(() => {
    if (!authReady || !isAdmin || !id) return;

    const fetchAll = async () => {
      try {
        // tags
        const tagSnap = await getDocs(collection(db, "tags"));
        const tagList = tagSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name,
        })) as Tag[];
        setAvailableTags(tagList);

        // project
        const ref = doc(db, "projects", id as string);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          alert("Project not found");
          router.push("/admin/manage-projects");
          return;
        }
        const data = snap.data();

        // normalize fields
        const normalized = {
          title: data.title || "",
          subtitle: data.subtitle || "",
          price: data.price || "",
          discount: data.discount || "",
          category: data.category || "android",
          details: data.details || "",
          installation: data.installation || "",
          tags: Array.isArray(data.tags) ? data.tags : [],
          tools: Array.isArray(data.tools) ? data.tools : [],
          isPublic: typeof data.isPublic === "boolean" ? data.isPublic : false,
        };

        setProject(normalized);
        setToolsInput(normalized.tools.join(", "));
        setLoading(false);
      } catch (e) {
        console.error(e);
        setErrMsg("Failed to load project. Check rules/network.");
        setLoading(false);
      }
    };

    fetchAll();
  }, [authReady, isAdmin, id, router]);

  const handleTagToggle = (tagId: string) => {
    setProject((prev: any) => {
      const current: string[] = Array.isArray(prev?.tags) ? prev.tags : [];
      return {
        ...prev,
        tags: current.includes(tagId)
          ? current.filter((t) => t !== tagId)
          : [...current, tagId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setErrMsg("");
    setSaving(true);

    try {
      const ref = doc(db, "projects", id as string);
      const payload = {
        ...project,
        tools: toolsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: Timestamp.now(),
      };

      await updateDoc(ref, payload);
      alert("✅ Project updated successfully!");
      router.push("/admin/manage-projects");
    } catch (err) {
      console.error("Error updating project:", err);
      setErrMsg("❌ Failed to update project.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <>
        <Head>
          <title>Edit Project | DevEngine Admin</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <p className="text-gray-400">Checking admin access...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (loading || !project) {
    return (
      <>
        <Head>
          <title>Edit Project | DevEngine Admin</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <h1 className="text-2xl text-gray-300">Loading project data...</h1>
        </main>
        <Footer />
      </>
    );
  }

  const publicPath = `/projects/${id}`;

  return (
    <>
      <Head>
        <title>Edit Project | DevEngine Admin</title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-teal-400 mb-8">
            Edit Project
          </h1>
          <Link
            href={publicPath}
            target="_blank"
            className="text-sm text-white hover:text-teal-400 underline transition-colors"
          >
            View public page ↗
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl shadow-xl space-y-6 border border-gray-700"
        >
          {errMsg && (
            <div className="bg-red-500/10 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
              {errMsg}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <input
              type="text"
              value={project.title}
              onChange={(e) =>
                setProject({ ...project, title: e.target.value })
              }
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              value={project.subtitle}
              onChange={(e) =>
                setProject({ ...project, subtitle: e.target.value })
              }
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              value={project.price}
              onChange={(e) =>
                setProject({ ...project, price: e.target.value })
              }
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              value={project.discount}
              onChange={(e) =>
                setProject({ ...project, discount: e.target.value })
              }
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <textarea
            value={project.details}
            onChange={(e) =>
              setProject({ ...project, details: e.target.value })
            }
            className="bg-gray-700 text-white p-3 rounded w-full h-40 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
          <textarea
            value={project.installation}
            onChange={(e) =>
              setProject({ ...project, installation: e.target.value })
            }
            className="bg-gray-700 text-white p-3 rounded w-full h-32 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />

          <input
            type="text"
            value={toolsInput}
            onChange={(e) => setToolsInput(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            placeholder="Tools (comma-separated)"
            required
          />

          <div>
            <label className="block text-teal-400 mb-2 font-semibold">
              Category
            </label>
            <select
              value={project.category}
              onChange={(e) =>
                setProject({ ...project, category: e.target.value })
              }
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="desktop">Desktop</option>
              <option value="web">Web</option>
            </select>
          </div>

          <div>
            <label className="block text-teal-400 mb-2 font-semibold">
              Tags
            </label>
            <div className="flex flex-wrap gap-3">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition ${
                    project.tags.includes(tag.id)
                      ? "bg-teal-500 border-teal-500 text-white"
                      : "bg-gray-700 border-gray-500 text-gray-300 hover:border-teal-500"
                  }`}
                  onClick={() => handleTagToggle(tag.id)}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="isPublic"
              type="checkbox"
              checked={!!project.isPublic}
              onChange={(e) =>
                setProject({ ...project, isPublic: e.target.checked })
              }
              className="h-5 w-5 accent-teal-500"
            />
            <label htmlFor="isPublic" className="text-gray-300">
              Published (visible on site)
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg w-full transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Update Project"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/manage-projects")}
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold px-6 py-3 rounded-lg w-full transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}
