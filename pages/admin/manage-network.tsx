import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { NetworkHub, NetworkHubFormData, HubStatusType } from "@/types/network";
import {
  getNetworkHubs,
  createNetworkHub,
  updateNetworkHub,
  deleteNetworkHub,
  seedDefaultNetworkHubs,
} from "@/lib/services/networkService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageNetworkPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [hubs, setHubs] = useState<NetworkHub[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<NetworkHubFormData>({
    name: "",
    regionCode: "",
    uptimeText: "99.99% UPTIME",
    status: "ONLINE",
    latencyMs: 24,
    loadPercent: 50,
    order: 1,
    isOnline: true,
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

  // Load hubs
  const fetchHubs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNetworkHubs();
      setHubs(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load network hubs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchHubs();
    }
  }, [isAdmin]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({
      name: "",
      regionCode: "",
      uptimeText: "99.99% UPTIME",
      status: "ONLINE",
      latencyMs: 24,
      loadPercent: 50,
      order: hubs.length + 1,
      isOnline: true,
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (hub: NetworkHub) => {
    setEditingId(hub.id);
    setFormData({
      name: hub.name,
      regionCode: hub.regionCode,
      uptimeText: hub.uptimeText,
      status: hub.status,
      latencyMs: hub.latencyMs,
      loadPercent: hub.loadPercent,
      order: hub.order,
      isOnline: hub.isOnline,
    });
    setIsModalOpen(true);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.regionCode.trim()) {
      alert("Please provide both Hub Name and Region Code.");
      return;
    }

    try {
      setSaving(true);
      if (editingId && !editingId.startsWith("default-") && !editingId.startsWith("fallback-")) {
        await updateNetworkHub(editingId, formData);
      } else {
        await createNetworkHub(formData);
      }
      setIsModalOpen(false);
      await fetchHubs();
    } catch (err: any) {
      alert("Error saving hub: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // Delete Handler
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete network hub: "${name}"?`)) {
      return;
    }
    try {
      setLoading(true);
      if (!id.startsWith("default-") && !id.startsWith("fallback-")) {
        await deleteNetworkHub(id);
      }
      await fetchHubs();
    } catch (err: any) {
      alert("Error deleting hub: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Seed Default Hubs
  const handleSeed = async () => {
    if (
      !confirm(
        "Do you want to seed the standard global routing hubs into Firestore? (Existing logs won't be overwritten)"
      )
    ) {
      return;
    }
    try {
      setLoading(true);
      await seedDefaultNetworkHubs();
      await fetchHubs();
    } catch (err: any) {
      alert("Error seeding hubs: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  if (!authReady || loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <HelixLoader />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout>
      <Head>
        <title>Manage Network Hubs - DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-black text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-xs font-mono text-teal-400 hover:underline flex items-center gap-1"
                >
                  ← Back to Dashboard
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-xs font-mono text-gray-400">Network Hubs</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Global Network Hubs
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Manage global server regions, status states, latency, and live routing nodes.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSeed}
                className="px-4 py-2 text-xs font-mono rounded-lg border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition-colors"
                title="Seed standard hubs if database is empty"
              >
                Seed Sample Hubs
              </button>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs tracking-wider rounded-lg shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all flex items-center gap-2"
              >
                <span className="text-base leading-none">+</span> Add New Hub
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Hubs Grid Table */}
          <div className="rounded-xl border border-gray-800 bg-[#08111f]/60 backdrop-blur-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0e1626] text-xs font-mono text-gray-400 uppercase border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Order</th>
                    <th className="px-6 py-4">Region Name</th>
                    <th className="px-6 py-4">Region Code</th>
                    <th className="px-6 py-4">Uptime / Badge</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Ping (ms)</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {hubs.map((hub) => (
                    <tr key={hub.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-mono text-gray-400">#{hub.order}</td>
                      <td className="px-6 py-4 font-semibold text-white">{hub.name}</td>
                      <td className="px-6 py-4 font-mono text-teal-400">{hub.regionCode}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#38f2ff]/10 text-[#38f2ff] border border-[#38f2ff]/30">
                          {hub.uptimeText}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold ${
                            hub.status === "ONLINE"
                              ? "text-teal-400"
                              : hub.status === "SYNCING"
                              ? "text-purple-300"
                              : "text-red-400"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              hub.status === "ONLINE"
                                ? "bg-teal-400 shadow-[0_0_8px_#2dd4bf]"
                                : hub.status === "SYNCING"
                                ? "bg-purple-300 animate-pulse"
                                : "bg-red-400 shadow-[0_0_8px_#f87171]"
                            }`}
                          />
                          {hub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-gray-300">{hub.latencyMs}ms</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(hub)}
                            className="px-3 py-1.5 text-xs font-mono text-teal-400 hover:bg-teal-500/10 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(hub.id, hub.name)}
                            className="px-3 py-1.5 text-xs font-mono text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {hubs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                        No network hubs found. Click "Seed Sample Hubs" or "+ Add New Hub".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>      </div>

      {/* Modal: Create or Edit Hub */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e1626] border border-gray-700 rounded-2xl w-full max-w-lg p-6 sm:p-8 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingId ? "Edit Network Hub" : "Create New Network Hub"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                  Region Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North America"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Region Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. US-EAST-1"
                    value={formData.regionCode}
                    onChange={(e) => setFormData({ ...formData, regionCode: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as HubStatusType })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="SYNCING">SYNCING</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="DEGRADED">DEGRADED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                  Uptime Badge Text
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 99.99% UPTIME or DATA REPLICATION"
                  value={formData.uptimeText}
                  onChange={(e) => setFormData({ ...formData, uptimeText: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Ping (ms)
                  </label>
                  <input
                    type="number"
                    value={formData.latencyMs}
                    onChange={(e) =>
                      setFormData({ ...formData, latencyMs: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Load (%)
                  </label>
                  <input
                    type="number"
                    value={formData.loadPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, loadPercent: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 uppercase mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })
                    }
                    className="w-full px-4 py-2.5 rounded-lg bg-black/60 border border-gray-700 text-white text-sm font-mono focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isOnline"
                  checked={formData.isOnline}
                  onChange={(e) => setFormData({ ...formData, isOnline: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-500 focus:ring-teal-500 bg-black border-gray-700"
                />
                <label htmlFor="isOnline" className="text-xs text-gray-300 font-mono">
                  Online in Routing Mesh
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-xs tracking-wider rounded-lg shadow-lg shadow-teal-500/30 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingId ? "Update Hub" : "Create Hub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
