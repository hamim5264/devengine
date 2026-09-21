import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { UpdateLogEntry, UpdateLogFormData, UpdateLogTag } from "@/types/update-log";
import {
  getAllUpdateLogsAdmin,
  createUpdateLog,
  updateUpdateLog,
  deleteUpdateLog,
  seedDefaultUpdateLogs,
} from "@/lib/services/updateLogsService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageUpdateLogs() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [logs, setLogs] = useState<UpdateLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Recycle Bin Modal State
  const [deleteTarget, setDeleteTarget] = useState<UpdateLogEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateLogFormData>({
    version: "",
    date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    tag: "DEPLOYED",
    summary: "",
    bullets: [""],
    order: 1,
    isPublished: true,
  });

  // Admin gate check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Load update logs
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUpdateLogsAdmin();
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load update logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [isAdmin]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      version: "",
      date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
      tag: "DEPLOYED",
      summary: "",
      bullets: [""],
      order: logs.length + 1,
      isPublished: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (log: UpdateLogEntry) => {
    setEditingId(log.id);
    setFormData({
      version: log.version,
      date: log.date,
      tag: log.tag,
      summary: log.summary,
      bullets: log.bullets && log.bullets.length > 0 ? [...log.bullets] : [""],
      order: log.order,
      isPublished: log.isPublished !== false,
    });
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.version.trim()) {
      alert("Version title is required");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await updateUpdateLog(editingId, formData);
      } else {
        await createUpdateLog(formData);
      }
      setIsModalOpen(false);
      await fetchLogs();
    } catch (err: any) {
      alert("Error saving update log: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Delete Log - Set target for custom Recycle Bin modal
  const handleTriggerDelete = (log: UpdateLogEntry) => {
    setDeleteTarget(log);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await moveToBin({
        originalCollection: "updateLogs",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.version,
        itemType: "updateLog",
        data: deleteTarget,
        metadata: {
          tag: deleteTarget.tag,
          date: deleteTarget.date,
          summary: deleteTarget.summary || "",
        },
      });
      await deleteUpdateLog(deleteTarget.id);
      setDeleteTarget(null);
      setNotification({
        text: `Update log "${deleteTarget.version}" moved to Recycle Bin.`,
        type: "success",
      });
      setTimeout(() => setNotification(null), 4000);
      await fetchLogs();
    } catch (err: any) {
      setNotification({
        text: "Error moving update log to bin: " + (err?.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Seed default data
  const handleSeed = async () => {
    try {
      setLoading(true);
      await seedDefaultUpdateLogs();
      setNotification({
        text: "Default reference logs seeded successfully!",
        type: "success",
      });
      setTimeout(() => setNotification(null), 4000);
      await fetchLogs();
    } catch (err: any) {
      setNotification({
        text: "Error seeding logs: " + (err?.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Bullet Point handlers
  const handleAddBullet = () => {
    setFormData((prev) => ({
      ...prev,
      bullets: [...prev.bullets, ""],
    }));
  };

  const handleUpdateBullet = (index: number, value: string) => {
    setFormData((prev) => {
      const updated = [...prev.bullets];
      updated[index] = value;
      return { ...prev, bullets: updated };
    });
  };

  const handleRemoveBullet = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      bullets: prev.bullets.filter((_, i) => i !== index),
    }));
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <HelixLoader size={48} color="#2dd4bf" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <Head>
        <title>Manage System Update Logs - DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Notification Toast */}
          {notification && (
            <div
              className={`mb-6 p-4 rounded-2xl border flex items-center justify-between text-sm shadow-xl backdrop-blur-xl ${
                notification.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="font-mono text-xs">{notification.text}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
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
                <span>System Engine</span>
                <span>/</span>
                <span className="text-teal-400">Update Logs</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  System Update Logs
                </h1>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-[11px] font-mono text-teal-300">
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                  Live Firestore
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Manage, publish, and order chronological updates displayed in the system console.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSeed}
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-teal-500/40 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-mono transition-all flex items-center gap-2"
              >
                Seed Default Logs
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all active:scale-[0.98] flex items-center gap-2"
              >
                + Add Update Log
              </button>
            </div>
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Total Entries</span>
              <p className="text-2xl font-bold text-white mt-1.5">{logs.length}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-teal-400 uppercase tracking-wider">Deployed</span>
              <p className="text-2xl font-bold text-teal-400 mt-1.5">
                {logs.filter((l) => l.tag === "DEPLOYED").length}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-blue-400 uppercase tracking-wider">Optimized</span>
              <p className="text-2xl font-bold text-blue-400 mt-1.5">
                {logs.filter((l) => l.tag === "OPTIMIZED").length}
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-xs font-mono text-purple-400 uppercase tracking-wider">Patched / Security</span>
              <p className="text-2xl font-bold text-purple-400 mt-1.5">
                {logs.filter((l) => ["PATCHED", "SECURITY"].includes(l.tag)).length}
              </p>
            </div>
          </div>

          {/* Centered Middle Loader or Logs Table */}
          {loading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center py-20 gap-3">
              <HelixLoader size={45} color="#2dd4bf" />
              <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
                Querying release logs...
              </span>
            </div>
          ) : (
            <div className="rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] shadow-2xl backdrop-blur-xl overflow-hidden">
              {logs.length === 0 ? (
                <div className="p-16 text-center text-gray-500 font-mono text-sm">
                  No update logs found. Click &quot;Add Update Log&quot; or &quot;Seed Default Logs&quot; to begin.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/[0.02] border-b border-white/[0.08] text-xs font-mono uppercase text-gray-400">
                      <tr>
                        <th className="py-4 px-5 w-14 text-center">#</th>
                        <th className="py-4 px-5">Version & Title</th>
                        <th className="py-4 px-5">Date</th>
                        <th className="py-4 px-5">Tag</th>
                        <th className="py-4 px-5">Bullets</th>
                        <th className="py-4 px-5 text-center">Status</th>
                        <th className="py-4 px-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-4 px-5 text-center font-mono text-gray-500">
                            {log.order}
                          </td>
                          <td className="py-4 px-5">
                            <span className="font-semibold text-white block">
                              {log.version}
                            </span>
                            {log.summary && (
                              <span className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                                {log.summary}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-5 font-mono text-xs text-gray-300">
                            {log.date}
                          </td>
                          <td className="py-4 px-5">
                            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-teal-500/30 text-teal-300 bg-teal-500/10">
                              {log.tag}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-xs text-gray-400 font-mono">
                            {log.bullets?.length || 0} items
                          </td>
                          <td className="py-4 px-5 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                                log.isPublished !== false
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-gray-800 text-gray-400 border border-gray-700"
                              }`}
                            >
                              {log.isPublished !== false ? "Published" : "Draft"}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex flex-col sm:flex-row items-end justify-end gap-2 sm:gap-2.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(log)}
                                className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-teal-300 border border-white/[0.08] text-xs font-mono transition cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTriggerDelete(log)}
                                className="px-3.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 text-xs font-mono transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>

        {/* ═══ BOUNDED CREATE / EDIT MODAL ═══ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl max-h-[90vh] bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
              {/* Pinned Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    {editingId ? "Edit Update Log" : "Add New Update Log"}
                  </h3>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">
                    Configure release version, status tags, and bullet highlights
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <form id="update-log-form" onSubmit={handleSave} className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Version & Title * (e.g. v2.0.4 - Core Architecture Rebuild)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.version}
                    onChange={(e) =>
                      setFormData({ ...formData, version: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-sm focus:outline-none transition-colors"
                    placeholder="v2.0.4 - Core Architecture Rebuild"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Date * (YYYY.MM.DD)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                      placeholder="2024.11.02"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Tag / Status *
                    </label>
                    <div className="relative">
                      <select
                        value={formData.tag}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            tag: e.target.value as UpdateLogTag,
                          })
                        }
                        className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 pr-10 text-white text-xs font-mono uppercase appearance-none focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="DEPLOYED">DEPLOYED</option>
                        <option value="OPTIMIZED">OPTIMIZED</option>
                        <option value="PATCHED">PATCHED</option>
                        <option value="SECURITY">SECURITY</option>
                        <option value="FEATURE">FEATURE</option>
                      </select>
                      <svg
                        className="w-4 h-4 text-gray-400 absolute right-3 top-3.5 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-300 mb-1.5">
                      Display Order (1 = Top)
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          order: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-4 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-300 mb-1.5">
                    Summary Overview
                  </label>
                  <textarea
                    rows={3}
                    value={formData.summary}
                    onChange={(e) =>
                      setFormData({ ...formData, summary: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl p-4 text-white text-sm focus:outline-none transition-colors leading-relaxed"
                    placeholder="Brief description of the release highlights..."
                  />
                </div>

                {/* Commit Bullets */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-xs font-mono text-gray-300">
                      Changelog Commit Items
                    </label>
                    <button
                      type="button"
                      onClick={handleAddBullet}
                      className="text-xs text-teal-400 hover:text-teal-300 font-mono transition-colors"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {formData.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={bullet}
                          onChange={(e) =>
                            handleUpdateBullet(idx, e.target.value)
                          }
                          className="flex-1 h-10 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white focus:outline-none transition-colors"
                          placeholder={`Commit bullet #${idx + 1}`}
                        />
                        {formData.bullets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveBullet(idx)}
                            className="w-10 h-10 rounded-xl bg-white/[0.03] hover:bg-red-500/20 text-gray-400 hover:text-red-300 text-xs flex items-center justify-center transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Published Checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={formData.isPublished}
                    onChange={(e) =>
                      setFormData({ ...formData, isPublished: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-black/40 border-white/[0.1] text-teal-400 focus:ring-teal-400"
                  />
                  <label
                    htmlFor="isPublished"
                    className="text-xs font-mono text-gray-300 cursor-pointer"
                  >
                    Published (Visible in User Interface)
                  </label>
                </div>
              </form>

              {/* Pinned Footer */}
              <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="update-log-form"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black font-semibold text-xs font-mono uppercase tracking-wider shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all"
                >
                  {saving ? "Saving..." : editingId ? "Update Log" : "Create Log"}
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
                Are you sure you want to remove <span className="text-white font-semibold">&quot;{deleteTarget.version}&quot;</span>?
              </p>
              <p className="text-xs text-gray-500 mb-6 font-mono">
                This log will be archived in the Recycle Bin where it can be restored anytime or permanently purged.
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
                  onClick={handleConfirmDelete}
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
