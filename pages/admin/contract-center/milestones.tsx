import { AdminSelect, AdminDateInput } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/milestones.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Project Delivery Milestones
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge } from "@/components/contract-center/CCUI";
import {
  getMilestones,
  getProjects,
  createMilestone,
  updateMilestoneStatus,
} from "@/lib/services/contractCenterService";
import type { CCMilestoneRecord, CCProject, CCMilestoneStatus } from "@/types/contractCenter";

export default function MilestonesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [milestones, setMilestones] = useState<CCMilestoneRecord[]>([]);
  const [projects, setProjects] = useState<CCProject[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    phaseName: "",
    projectId: "",
    description: "",
    plannedDate: new Date().toISOString().split("T")[0],
    acceptanceCriteria: "Staging deployment verified, integration tests passed, client sign-off.",
    deliverablesText: "Core APIs\nUI Prototype\nUser Acceptance Testing",
  });

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setAuthReady(true);
    }, () => {
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mList, pList] = await Promise.all([getMilestones(), getProjects()]);
      setMilestones(mList);
      setProjects(pList);
      if (pList.length > 0) {
        setFormData((prev) => ({ ...prev, projectId: pList[0].id }));
      }
    } catch (err) {
      console.error("Error loading milestones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.phaseName || !formData.projectId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selProject = projects.find((p) => p.id === formData.projectId);

      const deliverables = formData.deliverablesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await createMilestone(
        {
          phaseName: formData.phaseName,
          projectId: formData.projectId,
          projectTitle: selProject?.title,
          clientId: selProject?.clientId || "",
          description: formData.description,
          plannedDate: formData.plannedDate,
          acceptanceCriteria: formData.acceptanceCriteria,
          deliverables,
          status: "pending",
          createdBy: performedBy,
        },
        performedBy
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create milestone:", err);
      alert("Failed to create milestone.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    m: CCMilestoneRecord,
    newStatus: CCMilestoneStatus
  ) => {
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      await updateMilestoneStatus(m.id, newStatus, performedBy);
      await loadData();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const filtered = milestones.filter((m) => {
    const matchesSearch =
      m.phaseName.toLowerCase().includes(search.toLowerCase()) ||
      (m.projectTitle && m.projectTitle.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!authReady || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <HelixLoader />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Project Delivery Milestones — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Delivery Milestones & Acceptance</h1>
            <p className="text-sm text-slate-400">Track deliverables, approvals, and schedules.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Milestone
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/milestones" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input data-admin-search
              type="text"
              placeholder="Search milestones by title, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="transparent-input bg-transparent w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            <svg
              className="absolute left-3 top-2.5 text-slate-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>

          <div className="flex gap-2">
            <AdminSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="submitted">Submitted</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </AdminSelect>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Milestone Phase</th>
                  <th className="py-3 px-4 font-medium">Project</th>
                  <th className="py-3 px-4 font-medium">Deliverables</th>
                  <th className="py-3 px-4 font-medium">Planned Date</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.phaseName}</div>
                      <div className="text-[11px] text-slate-400 max-w-[220px] truncate">
                        {m.acceptanceCriteria}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-medium">
                      {m.projectTitle || "Project"}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.deliverables?.length || 0} Deliverables
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {m.plannedDate ? new Date(m.plannedDate).toLocaleDateString() : "TBD"}
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={m.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {m.status === "pending" && (
                          <button
                            onClick={() => handleUpdateStatus(m, "in_progress")}
                            className="px-2 py-1 rounded bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-[11px] font-medium"
                          >
                            Start
                          </button>
                        )}
                        {m.status === "in_progress" && (
                          <button
                            onClick={() => handleUpdateStatus(m, "submitted")}
                            className="px-2 py-1 rounded bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[11px] font-medium"
                          >
                            Submit
                          </button>
                        )}
                        {m.status === "submitted" && (
                          <button
                            onClick={() => handleUpdateStatus(m, "accepted")}
                            className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-medium"
                          >
                            Accept ✓
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No milestones recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Add Delivery Milestone</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Target Project *</label>
                  <AdminSelect
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.projectNumber})
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Milestone Phase Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Staging QA and payment integration"
                    value={formData.phaseName}
                    onChange={(e) => setFormData({ ...formData, phaseName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Target Planned Date</label>
                  <AdminDateInput
                    type="date"
                    value={formData.plannedDate}
                    onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Deliverables (one per line)</label>
                  <textarea
                    rows={3}
                    value={formData.deliverablesText}
                    onChange={(e) => setFormData({ ...formData, deliverablesText: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Acceptance Criteria</label>
                  <textarea
                    rows={2}
                    value={formData.acceptanceCriteria}
                    onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-medium disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Save Milestone"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
