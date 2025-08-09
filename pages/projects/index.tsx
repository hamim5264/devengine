import Head from "next/head";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import HelixLoader from "@/components/HelixLoader";

// ---- Types ----
interface Project {
  id: string; // Firestore doc id (slug)
  slug: string;
  title: string;
  subtitle: string;
  category: string; // "android" | "ios" | "desktop" | "web"
  price: string | number;
  discount?: string | number;
  tags: string[];
  isPublic?: boolean;
}

const toNumber = (v: unknown) =>
  typeof v === "number" ? v : Number(String(v ?? "0").replace(/[^\d]/g, ""));

// ---- Reusable cards ----
function ProjectCard({ p }: { p: Project }) {
  return (
    <Link
      href={`/projects/${p.slug}`}
      className="group block bg-gray-800 rounded-2xl p-6 border border-gray-700 hover:border-teal-500 shadow-xl hover:shadow-teal-500/40 hover:scale-105 transition-all duration-300"
    >
      <h2 className="text-xl font-bold text-white group-hover:text-teal-400 mb-2">
        {p.title}
      </h2>
      <p className="text-gray-400 group-hover:text-gray-300 text-sm mb-1">
        {p.subtitle}
      </p>
      <p className="text-sm text-teal-400 font-semibold">
        Price: {p.discount ?? p.price}
      </p>
    </Link>
  );
}

function ProjectSection({
  title,
  tag,
  projects,
}: {
  title: string;
  tag: string;
  projects: Project[];
}) {
  const filtered = projects.filter((p) => (p.tags || []).includes(tag));
  if (filtered.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl md:text-3xl font-semibold text-teal-400 mb-6">
        {title}
      </h2>
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => (
          <ProjectCard key={p.id} p={p} />
        ))}
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [priceRange, setPriceRange] = useState<number>(100000);
  const [category, setCategory] = useState<string>("all");

  // admin detection
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if admin is logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user && user.email === "hamim.leon@gmail.com");
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Fetch projects (admin = all, public = only isPublic)
  useEffect(() => {
    if (!authReady) return;

    (async () => {
      setLoading(true);
      try {
        const colRef = collection(db, "projects");
        const q = isAdmin
          ? colRef
          : query(colRef, where("isPublic", "==", true));
        const snap = await getDocs(q);

        const list = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            slug: d.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            category: data.category || "android",
            price: data.price ?? "0 BDT",
            discount: data.discount,
            tags: Array.isArray(data.tags) ? data.tags : [],
            isPublic: !!data.isPublic,
          } as Project;
        });

        setAllProjects(list);
      } catch (e) {
        console.error("Failed to load projects:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, isAdmin]);

  // Apply filters
  const filteredProjects = allProjects.filter((project) => {
    const priceVal = toNumber(project.discount ?? project.price);
    const matchesPrice = priceVal <= priceRange;
    const matchesCategory = category === "all" || project.category === category;
    return matchesPrice && matchesCategory;
  });

  const anyTagMatches = [
    "most-popular",
    "trending",
    "new",
    "students-favourite",
  ].some((t) => filteredProjects.some((p) => (p.tags || []).includes(t)));

  return (
    <>
      <Head>
        <title>Projects | DevEngine</title>
      </Head>

      <Navbar />

      <main className="pt-24 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-12 text-teal-400">
          All Projects
        </h1>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center mb-12">
          <div className="flex flex-col gap-3 w-full md:w-1/2 bg-gray-800 p-4 rounded-xl shadow-md h-36 justify-center">
            <label className="text-sm text-teal-400 font-semibold">
              Filter by Price (Up to BDT {priceRange.toLocaleString()})
            </label>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-teal-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-3 w-full md:w-1/2 bg-gray-800 p-4 rounded-xl shadow-md h-36 justify-center">
            <label className="text-sm text-teal-400 font-semibold">
              Filter by Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-gray-900 border border-teal-600 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-inner"
            >
              <option value="all">All</option>
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="desktop">Desktop</option>
              <option value="web">Web</option>
            </select>
          </div>
        </div>

        {/* Grid / Loader */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <HelixLoader size={50} speed={2.5} color="#14b8a6" />
            <p className="mt-4 text-gray-400 text-sm">Loading projects…</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <p className="text-center text-yellow-400">No projects found.</p>
        ) : (
          <>
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-semibold text-teal-400 mb-6">
                All
              </h2>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {filteredProjects.map((p) => (
                  <ProjectCard key={p.id} p={p} />
                ))}
              </div>
            </div>

            {/* Optional: Tag-based sections */}
            {anyTagMatches && (
              <>
                <ProjectSection
                  title="Most Popular"
                  tag="most-popular"
                  projects={filteredProjects}
                />
                <ProjectSection
                  title="Trending"
                  tag="trending"
                  projects={filteredProjects}
                />
                <ProjectSection
                  title="New Releases"
                  tag="new"
                  projects={filteredProjects}
                />
                <ProjectSection
                  title="Students' Favourite"
                  tag="students-favourite"
                  projects={filteredProjects}
                />
              </>
            )}
          </>
        )}
      </main>

      <Footer />
    </>
  );
}
