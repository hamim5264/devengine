import { AdminSelect } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/change-orders.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Change Orders & Addenda
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge, formatCCPrice } from "@/components/contract-center/CCUI";
import {
  getChangeOrders,
  getServiceAgreements,
  createChangeOrder,
} from "@/lib/services/contractCenterService";
import type { CCChangeOrder, CCServiceAgreement, CCChangeOrderStatus } from "@/types/contractCenter";
import { CC_CHANGE_ORDER_STATUS_LABELS } from "@/types/contractCenter";

export default function ChangeOrdersPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [changeOrders, setChangeOrders] = useState<CCChangeOrder[]>([]);
  const [agreements, setAgreements] = useState<CCServiceAgreement[]>([]);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    serviceAgreementId: "",
    reason: "Client requested additional features and technical integrations outside the initial scope.",
    scopeDescription: "",
    costVariance: 50000,
    scheduleVarianceDays: 7,
    status: "draft" as CCChangeOrderStatus,
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
      const [coList, agrList] = await Promise.all([getChangeOrders(), getServiceAgreements()]);
      setChangeOrders(coList);
      setAgreements(agrList);
      if (agrList.length > 0) {
        setFormData((prev) => ({ ...prev, serviceAgreementId: agrList[0].id }));
      }
    } catch (err) {
      console.error("Error loading change orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.serviceAgreementId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selAgr = agreements.find((a) => a.id === formData.serviceAgreementId);

      await createChangeOrder(
        {
          title: formData.title,
          description: formData.scopeDescription || formData.title,
          originalAgreementId: formData.serviceAgreementId,
          originalAgreementNumber: selAgr?.agreementNumber,
          projectId: selAgr?.projectId || "",
          clientId: selAgr?.clientId || "",
          clientName: selAgr?.clientName,
          reason: formData.reason,
          additionalFees: formData.costVariance,
          impactOnDates: `${formData.scheduleVarianceDays} Days`,
          status: formData.status,
          version: 1,
          createdBy: performedBy,
        },
        performedBy
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create change order:", err);
      alert("Failed to create change order.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = changeOrders.filter((co) => {
    const matchesSearch =
      co.changeOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      co.title.toLowerCase().includes(search.toLowerCase()) ||
      (co.clientName && co.clientName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || co.status === statusFilter;
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
        <title>Change Orders & Scope Adjustments — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Change Orders & Scope Adjustments</h1>
            <p className="text-sm text-slate-400">Manage scope, price, and schedule changes.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Change Order
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/change-orders" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input data-admin-search
              type="text"
              placeholder="Search change orders by number, title, client..."
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
              {Object.entries(CC_CHANGE_ORDER_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </AdminSelect>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">CO #</th>
                  <th className="py-3 px-4 font-medium">Title & Reason</th>
                  <th className="py-3 px-4 font-medium">Agreement Ref</th>
                  <th className="py-3 px-4 font-medium">Cost Impact</th>
                  <th className="py-3 px-4 font-medium">Schedule Impact</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((co) => (
                  <tr key={co.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-pink-400">
                      {co.changeOrderNumber}
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-semibold text-white truncate">{co.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{co.reason}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {co.originalAgreementNumber || "Direct"}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400">
                      +{formatCCPrice(co.additionalFees || 0, "BDT")}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {co.impactOnDates || "0 Days"}
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={co.status} />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No change orders on record.
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
                <h3 className="text-lg font-bold text-white">Create Change Order Addendum</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Target Agreement *</label>
                  <AdminSelect
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
                  </AdminSelect>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Change Order Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scope Addendum: Multi-Vendor Wallet System"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Additional Cost Variance</label>
                    <input
                      type="number"
                      value={formData.costVariance}
                      onChange={(e) => setFormData({ ...formData, costVariance: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Schedule Delay (Days)</label>
                    <input
                      type="number"
                      value={formData.scheduleVarianceDays}
                      onChange={(e) => setFormData({ ...formData, scheduleVarianceDays: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Scope Change Reason & Justification</label>
                  <textarea
                    rows={3}
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
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
                    {saving ? "Creating..." : "Issue Change Order"}
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
