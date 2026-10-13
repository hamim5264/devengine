// pages/admin/contract-center/projects.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Projects & Client Engagements
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge, formatCCPrice } from "@/components/contract-center/CCUI";
import {
  getProjects,
  getClients,
  createProject,
  updateProject,
} from "@/lib/services/contractCenterService";
import type {
  CCProject,
  CCClient,
  CCCommercialModel,
  CCProjectStatus,
  CCCurrency,
} from "@/types/contractCenter";

export default function ContractCenterProjectsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<CCProject[]>([]);
  const [clients, setClients] = useState<CCClient[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<CCProject | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    projectType: "Web & Mobile Application",
    description: "",
    commercialModel: "milestone" as CCCommercialModel,
    currency: "BDT" as CCCurrency,
    approvedBudget: 0,
    status: "in_progress" as CCProjectStatus,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/projects");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projList, clientList] = await Promise.all([getProjects(), getClients()]);
      setProjects(projList);
      setClients(clientList);
    } catch (err) {
      console.error("Error loading projects data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const openAddModal = () => {
    setEditingProject(null);
    setFormData({
      title: "",
      clientId: clients[0]?.id || "",
      projectType: "Full-Stack Custom Platform",
      description: "",
      commercialModel: "milestone",
      currency: "USD",
      approvedBudget: 0,
      status: "proposal",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (proj: CCProject) => {
    setEditingProject(proj);
    setFormData({
      title: proj.title,
      clientId: proj.clientId,
      projectType: proj.projectType,
      description: proj.description,
      commercialModel: proj.commercialModel,
      currency: proj.currency,
      approvedBudget: proj.approvedBudget || 0,
      status: proj.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.clientId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selClient = clients.find((c) => c.id === formData.clientId);

      if (editingProject) {
        await updateProject(
          editingProject.id,
          {
            ...formData,
            clientName: selClient ? selClient.legalName : undefined,
          },
          performedBy
        );
      } else {
        await createProject(
          {
            ...formData,
            clientName: selClient ? selClient.legalName : undefined,
            createdBy: performedBy,
          },
          performedBy
        );
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save project:", err);
      alert("Failed to save project.");
    } finally {
      setSaving(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.projectNumber.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName && p.clientName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesModel = modelFilter === "all" || p.commercialModel === modelFilter;

    return matchesSearch && matchesStatus && matchesModel;
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
        <title>Projects & Engagements — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Client Projects & Engagements</h1>
            <p className="text-sm text-slate-400">
              Track contract-bound client software engagements, scope definitions, and commercial models.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Project
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/projects" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search projects by title, project ID, client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
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
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Statuses</option>
              <option value="proposal">Proposal Stage</option>
              <option value="negotiation">Under Negotiation</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={modelFilter}
              onChange={(e) => setModelFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Models</option>
              <option value="fixed_price">Fixed Price</option>
              <option value="milestone">Milestone-Based</option>
              <option value="hourly">Hourly Billing</option>
              <option value="monthly_retainer">Monthly Retainer</option>
              <option value="time_and_materials">Time & Materials</option>
            </select>
          </div>
        </div>

        {/* Projects Grid / Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-pink-400 font-semibold">{p.projectNumber}</span>
                  <CCStatusBadge status={p.status} />
                </div>
                <h3 className="text-base font-bold text-white mb-1 line-clamp-1">{p.title}</h3>
                <p className="text-xs text-slate-400 mb-3">
                  Client: <span className="text-slate-200 font-medium">{p.clientName || "Unassigned"}</span>
                </p>

                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800/80 mb-4 space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Model:</span>
                    <span className="text-slate-200 capitalize">{p.commercialModel.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Budget:</span>
                    <span className="text-emerald-400 font-semibold">
                      {p.approvedBudget ? formatCCPrice(p.approvedBudget, p.currency || "BDT") : "TBD"}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Type:</span>
                    <span className="text-slate-300">{p.projectType}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => openEditModal(p)}
                  className="text-xs font-medium text-slate-300 hover:text-white"
                >
                  Edit Scope
                </button>
                <Link
                  href={`/admin/contract-center/quotations/create?clientId=${p.clientId}&projectId=${p.id}`}
                  className="text-xs font-semibold text-pink-400 hover:text-pink-300"
                >
                  Create Quote →
                </Link>
              </div>
            </div>
          ))}

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No projects found. Click "Create New Project" to get started.
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">
                  {editingProject ? `Edit Project (${editingProject.projectNumber})` : "Create New Project"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Project Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Next-Gen FinTech Trading Platform"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Associated Client *</label>
                    <select
                      required
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="">Select Client...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.legalName} ({c.clientNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Commercial Model</label>
                    <select
                      value={formData.commercialModel}
                      onChange={(e) => setFormData({ ...formData, commercialModel: e.target.value as CCCommercialModel })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="milestone">Milestone-Based</option>
                      <option value="fixed_price">Fixed Price</option>
                      <option value="hourly">Hourly Billing</option>
                      <option value="monthly_retainer">Monthly Retainer</option>
                      <option value="time_and_materials">Time & Materials</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Approved Budget</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={formData.approvedBudget}
                      onChange={(e) => setFormData({ ...formData, approvedBudget: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value as CCCurrency })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Project Category / Type</label>
                    <input
                      type="text"
                      value={formData.projectType}
                      onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CCProjectStatus })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="proposal">Proposal Stage</option>
                      <option value="negotiation">Under Negotiation</option>
                      <option value="approved">Approved</option>
                      <option value="active">Active</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Scope & Description</label>
                  <textarea
                    rows={3}
                    placeholder="Key deliverables, tech stack, architectural requirements..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    {saving ? "Saving..." : editingProject ? "Update Project" : "Create Project"}
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
