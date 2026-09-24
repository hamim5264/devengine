import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/router";
import { moveToBin } from "@/lib/services/binService";
import { getCleanAppThumbnail, DUMMY_APP_IMAGES } from "@/lib/services/launchpadService";
import HelixLoader from "@/components/HelixLoader";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageAppLab() {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [ready, setReady] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (!u || u.email !== ADMIN_EMAIL) {
        router.replace("/login?redirect=/admin/app-lab/manage");
      } else {
        setReady(true);
      }
    });
  }, [router]);

  useEffect(() => {
    return onSnapshot(collection(db, "appLab"), (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const handleTogglePublish = async (app: any) => {
    try {
      const nextPublic = !app.isPublic;
      await updateDoc(doc(db, "appLab", app.id), {
        isPublic: nextPublic,
      });
      setMessage(`"${app.name}" is now ${nextPublic ? "PUBLIC" : "UNPUBLISHED"}.`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleConfirmMoveToBin = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await moveToBin({
        originalCollection: "appLab",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.name,
        itemType: "App Lab",
        data: deleteTarget,
        metadata: {
          slug: deleteTarget.slug || deleteTarget.id,
          version: deleteTarget.version,
          platform: deleteTarget.platform,
          category: deleteTarget.category,
        },
      });

      setMessage(`"${deleteTarget.name}" was moved to the Recycle Bin.`);
      setDeleteTarget(null);
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      alert("Failed to move to bin: " + err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!ready) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-[#030712] flex items-center justify-center">
          <HelixLoader size={48} color="#38f2ff" text="LOADING APP LAB CMS..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage App Lab | DevEngine Admin</title>
      </Head>

      <main className="px-4 sm:px-8 py-8 min-h-[calc(100vh-56px)] text-white max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mb-1">
              <Link href="/admin/manage-launchpad" className="hover:text-teal-400">
                ← Manage Launchpad
              </Link>
              <span>/</span>
              <span className="text-white font-bold">App Lab Collection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black font-space text-white">
              App Lab Applications ({apps.length})
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/manage-launchpad"
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition"
            >
              Unified Launchpad Hub
            </Link>
            <Link
              href="/admin/app-lab/add"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black text-xs font-mono font-bold transition shadow-lg flex items-center gap-1.5"
            >
              <span>+ Add App</span>
            </Link>
          </div>
        </div>

        {message && (
          <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs font-mono text-teal-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => {
            const currentImg = getCleanAppThumbnail(app);
            return (
              <div
                key={app.id}
                className="bg-[#0c101c] border border-white/10 rounded-2xl p-5 space-y-4 hover:border-teal-500/30 transition shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/40 border border-white/10 shrink-0">
                      <img
                        src={currentImg}
                        alt={app.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = DUMMY_APP_IMAGES.default;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold font-space text-white truncate">
                        {app.name}
                      </h2>
                      <p className="text-xs text-teal-400 font-mono truncate">
                        {app.subtitle || "No tagline"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-gray-400">
                        <span>v{app.version || "1.0.0"}</span>
                        <span>•</span>
                        <span>{app.platform || "android"}</span>
                        {app.category && (
                          <>
                            <span>•</span>
                            <span>{app.category}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        app.isPublic
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {app.isPublic ? "LIVE" : "DRAFT"}
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-sans">
                    {app.description || "No description."}
                  </p>

                  <div className="space-y-1 text-[11px] font-mono border-t border-white/5 pt-2">
                    <div className="flex items-center justify-between text-gray-400">
                      <span className="text-gray-500">Download Link:</span>
                      {app.apkUrl ? (
                        <a
                          href={app.apkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-300 hover:underline truncate max-w-[170px]"
                        >
                          {app.apkUrl}
                        </a>
                      ) : (
                        <span className="text-amber-400/80">Missing</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-gray-400">
                      <span className="text-gray-500">Preview Link:</span>
                      {app.previewUrl ? (
                        <a
                          href={app.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-300 hover:underline truncate max-w-[170px]"
                        >
                          {app.previewUrl}
                        </a>
                      ) : (
                        <span className="text-gray-600">None</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/app-lab/${app.slug || app.id}`}
                      target="_blank"
                      className="px-2.5 py-1 rounded-lg text-xs font-mono text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition"
                    >
                      Specs ↗
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(app)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition ${
                        app.isPublic
                          ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300"
                          : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300"
                      }`}
                    >
                      {app.isPublic ? "Unpublish" : "Publish"}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(app)}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono text-rose-400 hover:text-rose-200 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal (Recycle Bin) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-space">Move to Recycle Bin?</h3>
                  <p className="text-xs font-mono text-gray-400">
                    Retained for 30 days before permanent purging.
                  </p>
                </div>
              </div>

              <p className="text-gray-300 text-sm leading-relaxed font-sans">
                Are you sure you want to move{" "}
                <span className="text-white font-semibold font-mono">
                  &quot;{deleteTarget.name}&quot;
                </span>{" "}
                to the Recycle Bin?
              </p>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed font-mono">
                💡 You can restore this application anytime from{" "}
                <strong>Dashboard &gt; Recycle Bin</strong>.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-mono text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleConfirmMoveToBin}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20 flex items-center gap-1.5"
                >
                  {deleting ? "Moving to Bin…" : "MOVE TO BIN"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}
