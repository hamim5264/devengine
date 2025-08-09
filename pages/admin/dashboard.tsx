import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HelixLoader from "@/components/HelixLoader";

type TS = { toMillis?: () => number } | number | null | undefined;

interface Project {
  id: string;
  title: string;
  subtitle: string;
  category?: string;
  isPublic?: boolean;
  createdAt?: TS;
  updatedAt?: TS;
}

interface UserRow {
  id: string; // uid / doc id
  fullName: string;
  email: string;
  mobile?: string;
}

const ADMIN_EMAIL = "hamim.leon@gmail.com";

// uniform size for action buttons (edit/delete/publish/unpublish)
const ACTION_BTN =
  "h-10 px-4 min-w-[120px] rounded-lg text-sm font-semibold inline-flex items-center justify-center";

export default function AdminDashboard() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [totalProjects, setTotalProjects] = useState(0);
  const [totalTags, setTotalTags] = useState(0);
  const [totalCategories, setTotalCategories] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [recentDrafts, setRecentDrafts] = useState<Project[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);

  const [loading, setLoading] = useState(true);

  // gate admin
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // fetch stats after auth
  useEffect(() => {
    if (!authReady || !isAdmin) return;

    (async () => {
      try {
        const projectSnap = await getDocs(collection(db, "projects"));
        const tagSnap = await getDocs(collection(db, "tags"));
        const usersSnap = await getDocs(collection(db, "users"));

        setTotalProjects(projectSnap.size);
        setTotalTags(tagSnap.size);
        setTotalUsers(usersSnap.size);

        const categories = new Set<string>();
        const projects: Project[] = projectSnap.docs.map((d) => {
          const data = d.data() as any;
          if (data.category) categories.add(String(data.category));
          return {
            id: d.id,
            title: data.title || "",
            subtitle: data.subtitle || "",
            category: data.category || "",
            isPublic: !!data.isPublic,
            createdAt: data.createdAt ?? null,
            updatedAt: data.updatedAt ?? null,
          };
        });
        setTotalCategories(categories.size);

        // recent drafts (unpublished)
        const tsVal = (t: TS) =>
          typeof t === "number" ? t : t?.toMillis?.() ?? 0;
        const drafts = projects
          .filter((p) => !p.isPublic)
          .sort(
            (a, b) =>
              tsVal(b.updatedAt || b.createdAt) -
              tsVal(a.updatedAt || a.createdAt)
          )
          .slice(0, 5);
        setRecentDrafts(drafts);

        // recent users (fallback sort)
        const userList: UserRow[] = usersSnap.docs.map((d) => {
          const u = d.data() as any;
          return {
            id: d.id,
            fullName: u.fullName || "—",
            email: u.email || "—",
            mobile: u.mobile || "",
          };
        });
        userList.sort((a, b) => a.email.localeCompare(b.email));
        setRecentUsers(userList.slice(0, 50));
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, isAdmin]);

  // 1) still show a quick gate while deciding admin
  if (!authReady || !isAdmin) {
    return (
      <>
        <Head>
          <title>Admin Panel | DevEngine</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <p className="text-gray-400">Checking admin access...</p>
        </main>
        <Footer />
      </>
    );
  }

  // 2) once admin is confirmed, show a centered loader until all dashboard data is ready
  if (loading) {
    return (
      <>
        <Head>
          <title>Admin Panel | DevEngine</title>
        </Head>
        <Navbar />
        <main className="pt-40 text-center text-white min-h-screen bg-gradient-to-br from-gray-900 to-black">
          <div className="flex flex-col items-center justify-center">
            <HelixLoader size={56} color="#14b8a6" />
            <p className="mt-4 text-gray-400">Loading dashboard…</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Panel | DevEngine</title>
      </Head>
      <Navbar />

      <main className="pt-28 px-6 md:px-20 pb-20 min-h-screen bg-gradient-to-br from-gray-900 to-black text-white">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-teal-400">
            DevEngine Admin Dashboard
          </h1>

          {/* Quick Actions (no emojis) */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/add-project"
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Add Project
            </Link>
            <Link
              href="/admin/manage-projects"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600"
            >
              Manage Projects
            </Link>
            <Link
              href="/admin/manage-tags"
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold border border-gray-600"
            >
              Manage Tags
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-600 hover:shadow-teal-500/40 transition">
            <h2 className="text-xl font-bold mb-2 text-white">
              Total Projects
            </h2>
            <p className="text-4xl text-teal-300 font-mono">{totalProjects}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-600 hover:shadow-teal-500/40 transition">
            <h2 className="text-xl font-bold mb-2 text-white">Categories</h2>
            <p className="text-4xl text-teal-300 font-mono">
              {totalCategories}
            </p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-600 hover:shadow-teal-500/40 transition">
            <h2 className="text-xl font-bold mb-2 text-white">Total Tags</h2>
            <p className="text-4xl text-teal-300 font-mono">{totalTags}</p>
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-teal-600 hover:shadow-teal-500/40 transition">
            <h2 className="text-xl font-bold mb-2 text-white">Total Users</h2>
            <p className="text-4xl text-teal-300 font-mono">{totalUsers}</p>
          </div>
        </div>

        {/* Drafts + Users + Shortcuts */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Drafts - 2/5 width */}
          <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-teal-400">
                Recent Drafts (Unpublished)
              </h3>
              <Link
                href="/admin/manage-projects"
                className="text-sm text-white hover:text-teal-300 underline"
              >
                Manage All
              </Link>
            </div>

            {recentDrafts.length === 0 ? (
              <p className="text-gray-400">No drafts right now.</p>
            ) : (
              <ul className="divide-y divide-gray-700">
                {recentDrafts.map((p) => (
                  <li
                    key={p.id}
                    className="py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">{p.title}</p>
                      <p className="text-xs text-gray-400">
                        {p.category || "uncategorized"}
                      </p>
                    </div>

                    {/* EDIT button: white bg, black text, uniform size */}
                    <Link
                      href={`/admin/edit-project/${p.id}`}
                      className={`${ACTION_BTN} bg-white text-black hover:bg-gray-100`}
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right column - 3/5 width */}
          <div className="lg:col-span-3 space-y-6">
            {/* Recent Users */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-teal-400">
                  Recent Users
                </h3>
                <span className="text-sm text-gray-400">
                  {totalUsers} total
                </span>
              </div>

              {recentUsers.length === 0 ? (
                <p className="text-gray-400">No users found.</p>
              ) : (
                <div className="themed-scroll overflow-y-auto max-h-[420px] rounded-lg border border-gray-700">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-900 sticky top-0">
                      <tr className="text-left text-gray-400">
                        <th className="py-2 px-4">Name</th>
                        <th className="py-2 px-4">Email</th>
                        <th className="py-2 px-4">Mobile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {recentUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-900/40">
                          <td className="py-2 px-4 text-white whitespace-nowrap">
                            {u.fullName}
                          </td>
                          <td className="py-2 px-4 text-gray-300 whitespace-nowrap">
                            {u.email}
                          </td>
                          <td className="py-2 px-4 text-gray-300 whitespace-nowrap">
                            {u.mobile || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Shortcuts */}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-semibold text-teal-400 mb-3">
                Shortcuts
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  • Add a project and toggle{" "}
                  <span className="text-teal-300">Publish</span> in Manage
                  Projects
                </li>
                <li>• Create new tags in Manage Tags</li>
                <li>• Edit pricing, tools, and details anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
