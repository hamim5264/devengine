import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";

interface Project {
  id: string; // Firestore doc id (slug)
  slug?: string; // stored slug (optional; fallback to id)
  title: string;
  subtitle: string;
  price: string;
  discount: string;
  category: string;
  tags: string[];
  isPublic?: boolean;
  createdAt?: any;
}

const ADMIN_EMAIL = "hamim.leon@gmail.com";

// uniform size for card action buttons
const ACTION_BTN =
  "h-10 px-4 min-w-[120px] rounded-lg text-sm font-semibold inline-flex items-center justify-center text-center";

export default function ManageProjectsPage() {
  const router = useRouter();

  // Auth gate
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

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

  // Subscribe to projects AFTER we know it's the admin
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

        // Optional: newest first
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
        setErrMsg("Failed to load projects. Check Firestore rules & network.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [authReady, isAdmin]);

  const handleDelete = async (id: string) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this project?"
    );
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "projects", id));
      alert("Project deleted!");
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Failed to delete project.");
    }
  };

  const handleTogglePublish = async (p: Project) => {
    try {
      await updateDoc(doc(db, "projects", p.id), { isPublic: !p.isPublic });
    } catch (error) {
      console.error("Error toggling publish:", error);
      alert("Failed to update publish status.");
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <>
        <Head>
          <title>Manage Projects | DevEngine Admin</title>
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
        <title>Manage Projects | DevEngine Admin</title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 bg-gradient-to-br from-gray-900 to-black text-white min-h-screen">
        <div className="flex items-center justify-between gap-4 mb-10">
          <h1 className="text-3xl font-bold text-teal-400">
            Manage All Projects
          </h1>
          <div className="flex gap-3">
            <Link
              href="/admin/add-project"
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Add Project
            </Link>
            <Link
              href="/admin/manage-tags"
              className="bg-white text-black hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200"
            >
              Manage Tags
            </Link>
          </div>
        </div>

        {errMsg && (
          <div className="max-w-4xl mx-auto mb-6 bg-red-500/10 border border-red-500 text-red-300 px-4 py-3 rounded-lg">
            {errMsg}
          </div>
        )}

        {loading ? (
          <p className="text-center text-gray-400">Loading projects...</p>
        ) : projects.length === 0 ? (
          <p className="text-center text-yellow-500">No projects found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => {
              const publicPath = `/projects/${project.slug || project.id}`;
              return (
                <div
                  key={project.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg hover:shadow-teal-500/40 transition"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="text-xl font-bold text-white">
                      {project.title}
                    </h2>
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${
                        project.isPublic
                          ? "bg-green-600/20 text-green-300 border-green-600"
                          : "bg-yellow-600/20 text-yellow-300 border-yellow-600"
                      }`}
                    >
                      {project.isPublic ? "Published" : "Draft"}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-3">
                    {project.subtitle}
                  </p>

                  <p className="text-sm text-teal-400 font-semibold">
                    Price: <span className="line-through">{project.price}</span>{" "}
                    → {project.discount}
                  </p>

                  <p className="text-sm text-gray-300 mt-2">
                    Category:{" "}
                    <span className="text-white">{project.category}</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2">
                    {project.tags?.map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-teal-600 text-white px-3 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4">
                    <Link
                      href={publicPath}
                      className="text-xs text-white underline hover:text-teal-200"
                      target="_blank"
                    >
                      View public page
                    </Link>
                  </div>

                  {/* Actions: same size buttons */}
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <Link
                      href={`/admin/edit-project/${project.id}`}
                      className={`${ACTION_BTN} bg-white text-black hover:bg-gray-100`}
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleTogglePublish(project)}
                      className={`${ACTION_BTN} ${
                        project.isPublic
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      }`}
                    >
                      {project.isPublic ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => handleDelete(project.id)}
                      className={`${ACTION_BTN} bg-red-600 hover:bg-red-700 text-white`}
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

      <Footer />
    </>
  );
}
