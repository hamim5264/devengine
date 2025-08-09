import { useState, useEffect } from "react";
import Head from "next/head";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getDoc,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Tag {
  id: string;
  name: string;
}

export default function AddProjectPage() {
  const router = useRouter();

  // Auth gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [details, setDetails] = useState("");
  const [installation, setInstallation] = useState("");
  const [tools, setTools] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("android");
  const [publishNow, setPublishNow] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // Admin-only access check (wait for auth)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === "hamim.leon@gmail.com";
      setIsAdmin(!!ok);
      setAuthReady(true);
      if (!ok) {
        router.replace("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // Load tags
  useEffect(() => {
    (async () => {
      try {
        const tagSnap = await getDocs(collection(db, "tags"));
        const tagList = tagSnap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name,
        })) as Tag[];
        setAvailableTags(tagList);
      } catch (e) {
        console.error(e);
        setErrMsg("Failed to load tags. Please try again.");
      }
    })();
  }, []);

  const handleTagToggle = (tagId: string) => {
    setTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const makeSlug = (s: string) =>
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg("");
    setLoading(true);

    try {
      const slug = makeSlug(title);
      if (!slug) {
        setErrMsg("Title is required to generate a valid slug.");
        setLoading(false);
        return;
      }

      // Ensure unique slug
      const ref = doc(db, "projects", slug);
      const existing = await getDoc(ref);
      if (existing.exists()) {
        setErrMsg(
          "A project with this title/slug already exists. Please change the title."
        );
        setLoading(false);
        return;
      }

      const newProject = {
        slug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        details: details.trim(),
        installation: installation.trim(),
        tools: tools.split(",").map((t) => t.trim()).filter(Boolean),
        price: price.trim(), // You can store numbers later if you prefer
        discount: discount.trim(),
        category,
        tags,
        isPublic: publishNow, // <-- important for public reads via rules
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: "hamim.leon@gmail.com",
      };

      await setDoc(ref, newProject);
      alert("✅ Project added successfully!");
      router.push("/admin/manage-projects");
    } catch (err) {
      console.error("Error adding project:", err);
      setErrMsg("❌ Failed to add project. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <>
        <Head>
          <title>Add Project | DevEngine Admin</title>
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
        <title>Add Project | DevEngine Admin</title>
      </Head>
      <Navbar />
      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-3xl md:text-4xl font-bold text-teal-400 mb-8 text-center">
          Add New Project
        </h1>

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
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              placeholder="Subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              placeholder="Regular Price (e.g. 1,00,000 BDT)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
            <input
              type="text"
              placeholder="Discount Price (e.g. 70,000 BDT)"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>

          <textarea
            placeholder="Project Details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded w-full h-40 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />
          <textarea
            placeholder="Installation Instructions"
            value={installation}
            onChange={(e) => setInstallation(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded w-full h-32 focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />

          <input
            type="text"
            placeholder="Tools (comma-separated)"
            value={tools}
            onChange={(e) => setTools(e.target.value)}
            className="bg-gray-700 text-white p-3 rounded w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
          />

          <div>
            <label className="block text-teal-400 mb-2 font-semibold">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
                    tags.includes(tag.id)
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
              id="publishNow"
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="h-5 w-5 accent-teal-500"
            />
            <label htmlFor="publishNow" className="text-gray-300">
              Publish immediately (visible on site)
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-3 rounded-lg w-full transition disabled:opacity-50"
          >
            {loading ? "Adding Project..." : "Add Project"}
          </button>
        </form>
      </main>
      <Footer />
    </>
  );
}
