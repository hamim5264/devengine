// pages/admin/contract-center/sow.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Statements of Work (SOW)
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge } from "@/components/contract-center/CCUI";
import {
  getSOWs,
  getServiceAgreements,
  createSOW,
} from "@/lib/services/contractCenterService";
import type { CCSOW, CCServiceAgreement, CCSOWStatus } from "@/types/contractCenter";

const SOW_STATUS_LABELS: Record<CCSOWStatus, string> = {
  draft: "Draft",
  internal_review: "Internal Review",
  approved: "Approved",
  sent: "Sent",
  executed: "Executed",
  amended: "Amended",
  completed: "Completed",
  archived: "Archived",
};

export default function SOWManagementPage() {
  const router = useRouter();
  const { agreementId: preAgrId } = router.query;

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sows, setSows] = useState<CCSOW[]>([]);
  const [agreements, setAgreements] = useState<CCServiceAgreement[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    serviceAgreementId: "",
    objective: "Implement Phase 1 production features, API architecture, and database migrations.",
    deliverablesText: "Core REST APIs & Database Schemas\nAdmin Management Dashboard\nStaging Deployment & Acceptance Testing",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/sow");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sowList, agrList] = await Promise.all([getSOWs(), getServiceAgreements()]);
      setSows(sowList);
      setAgreements(agrList);
      if (preAgrId && typeof preAgrId === "string") {
        setFormData((prev) => ({ ...prev, serviceAgreementId: preAgrId }));
      } else if (agrList.length > 0) {
        setFormData((prev) => ({ ...prev, serviceAgreementId: agrList[0].id }));
      }
    } catch (err) {
      console.error("Error loading SOWs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady, preAgrId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.serviceAgreementId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selAgr = agreements.find((a) => a.id === formData.serviceAgreementId);

      const deliverables = formData.deliverablesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      await createSOW(
        {
          title: formData.title,
          version: 1,
          agreementId: formData.serviceAgreementId,
          agreementNumber: selAgr?.agreementNumber,
          clientId: selAgr?.clientId || "",
          clientName: selAgr?.clientName,
          projectObjectives: formData.objective,
          includedFunctionality: deliverables,
          excludedFunctionality: [],
          deliverables: deliverables.map((d, i) => ({
            id: `del-${i + 1}`,
            phaseNumber: i + 1,
            phaseName: d,
            description: d,
            deliverables: [d],
            sortOrder: i + 1,
          })),
          status: "draft",
          createdBy: performedBy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as any
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create SOW:", err);
      alert("Failed to create Statement of Work.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = sows.filter((s) => {
    const matchesSearch =
      s.sowNumber.toLowerCase().includes(search.toLowerCase()) ||
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      (s.clientName && s.clientName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
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
        <title>Statements of Work (SOW) — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Statements of Work (SOWs)</h1>
            <p className="text-sm text-slate-400">
              Detailed technical deliverables, milestone scopes, and acceptance criteria under Master Agreements.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New SOW
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/sow" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search SOWs by reference #, title, client..."
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
              {Object.entries(SOW_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SOWs Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">SOW #</th>
                  <th className="py-3 px-4 font-medium">Title & Scope</th>
                  <th className="py-3 px-4 font-medium">Master Agreement</th>
                  <th className="py-3 px-4 font-medium">Client</th>
                  <th className="py-3 px-4 font-medium">Deliverables</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((sow) => (
                  <tr key={sow.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pink-400">
                      {sow.sowNumber}
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-semibold text-white truncate">{sow.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {sow.projectObjectives}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {sow.agreementNumber || "Direct"}
                    </td>
                    <td className="py-3 px-4 text-slate-200">
                      {sow.clientName || "Client"}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {sow.deliverables?.length || sow.includedFunctionality?.length || 0} Items
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={sow.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No statements of work found.
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
                <h3 className="text-lg font-bold text-white">Create Statement of Work</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Select Master Agreement *</label>
                  <select
                    required
                    value={formData.serviceAgreementId}
                    onChange={(e) => setFormData({ ...formData, serviceAgreementId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select Agreement...</option>
                    {agreements.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.agreementNumber} — {a.title} ({a.clientName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">SOW Scope Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SOW 01: Core Web & Mobile App Staging Delivery"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Project Objectives</label>
                  <textarea
                    rows={2}
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Key Deliverables (one per line)</label>
                  <textarea
                    rows={4}
                    value={formData.deliverablesText}
                    onChange={(e) => setFormData({ ...formData, deliverablesText: e.target.value })}
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
                    {saving ? "Creating..." : "Create SOW"}
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
