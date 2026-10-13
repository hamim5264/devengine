// pages/admin/contract-center/clients.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Client Directory & CRM
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
  getClients,
  createClient,
  updateClient,
} from "@/lib/services/contractCenterService";
import type { CCClient, CCClientType, CCClientStatus, CCCurrency } from "@/types/contractCenter";

export default function ContractCenterClientsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<CCClient[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<CCClient | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    clientType: "organization" as CCClientType,
    legalName: "",
    organizationName: "",
    businessRegistration: "",
    primaryContactName: "",
    authorizedSignatoryName: "",
    authorizedSignatoryTitle: "",
    email: "",
    phone: "",
    businessAddress: "",
    country: "Bangladesh",
    preferredCurrency: "BDT" as CCCurrency,
    status: "active" as CCClientStatus,
    internalNotes: "",
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/clients");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getClients();
      setClients(list);
    } catch (err) {
      console.error("Error loading clients:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      clientType: "organization",
      legalName: "",
      organizationName: "",
      businessRegistration: "",
      primaryContactName: "",
      authorizedSignatoryName: "",
      authorizedSignatoryTitle: "",
      email: "",
      phone: "",
      businessAddress: "",
      country: "Bangladesh",
      preferredCurrency: "BDT",
      status: "active",
      internalNotes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: CCClient) => {
    setEditingClient(client);
    setFormData({
      clientType: client.clientType,
      legalName: client.legalName,
      organizationName: client.organizationName || "",
      businessRegistration: client.businessRegistration || "",
      primaryContactName: client.primaryContactName,
      authorizedSignatoryName: client.authorizedSignatoryName || "",
      authorizedSignatoryTitle: client.authorizedSignatoryTitle || "",
      email: client.email,
      phone: client.phone || "",
      businessAddress: client.businessAddress || "",
      country: client.country || "Bangladesh",
      preferredCurrency: client.preferredCurrency || "BDT",
      status: client.status,
      internalNotes: client.internalNotes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.legalName || !formData.email) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";

      if (editingClient) {
        await updateClient(editingClient.id, formData, performedBy);
      } else {
        await createClient(
          {
            ...formData,
            createdBy: performedBy,
          },
          performedBy
        );
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to save client:", err);
      alert("Failed to save client. Please check console.");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter((c) => {
    const matchesSearch =
      c.legalName.toLowerCase().includes(search.toLowerCase()) ||
      (c.organizationName && c.organizationName.toLowerCase().includes(search.toLowerCase())) ||
      c.clientNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesType = typeFilter === "all" || c.clientType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
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
        <title>Client Directory — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Client Directory & Legal Entities</h1>
            <p className="text-sm text-slate-400">
              Manage client companies, authorized signatories, tax IDs, and contract preferences.
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
            Add New Client
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/clients" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search clients by legal name, organization, client ID, email..."
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
              <option value="active">Active</option>
              <option value="prospect">Prospect</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Entity Types</option>
              <option value="organization">Organization</option>
              <option value="individual">Individual</option>
            </select>
          </div>
        </div>

        {/* Clients Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Client #</th>
                  <th className="py-3 px-4 font-medium">Legal Name / Org</th>
                  <th className="py-3 px-4 font-medium">Primary Contact</th>
                  <th className="py-3 px-4 font-medium">Currency</th>
                  <th className="py-3 px-4 font-medium">Country</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-pink-400">
                      {client.clientNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{client.legalName}</div>
                      {client.organizationName && (
                        <div className="text-[11px] text-slate-400">{client.organizationName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-200">{client.primaryContactName}</div>
                      <div className="text-[11px] text-slate-500">{client.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{client.preferredCurrency}</td>
                    <td className="py-3 px-4 text-slate-300">{client.country}</td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={client.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(client)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No clients found matching the query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">
                  {editingClient ? `Edit Client (${editingClient.clientNumber})` : "Add New Client Entity"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Entity Type</label>
                    <select
                      value={formData.clientType}
                      onChange={(e) => setFormData({ ...formData, clientType: e.target.value as CCClientType })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="organization">Organization / Company</option>
                      <option value="individual">Individual / Proprietor</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as CCClientStatus })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="active">Active</option>
                      <option value="prospect">Prospect</option>
                      <option value="inactive">Inactive</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Legal Entity Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Technologies Ltd."
                      value={formData.legalName}
                      onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Trade / Org Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Primary Contact Person *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formData.primaryContactName}
                      onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="contact@acme.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Authorized Signatory Name</label>
                    <input
                      type="text"
                      placeholder="Signatory legal name"
                      value={formData.authorizedSignatoryName}
                      onChange={(e) => setFormData({ ...formData, authorizedSignatoryName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Signatory Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Managing Director / CEO"
                      value={formData.authorizedSignatoryTitle}
                      onChange={(e) => setFormData({ ...formData, authorizedSignatoryTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Preferred Currency</label>
                    <select
                      value={formData.preferredCurrency}
                      onChange={(e) => setFormData({ ...formData, preferredCurrency: e.target.value as CCCurrency })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="BDT">BDT (৳)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Country / Jurisdiction</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Registered Address</label>
                  <textarea
                    rows={2}
                    placeholder="Full legal business address..."
                    value={formData.businessAddress}
                    onChange={(e) => setFormData({ ...formData, businessAddress: e.target.value })}
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
                    {saving ? "Saving..." : editingClient ? "Update Client" : "Create Client"}
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
