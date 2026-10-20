import { AdminSelect } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/signatures.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — E-Signatures Hub & Verification
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatusBadge } from "@/components/contract-center/CCUI";
import {
  getSignatureRequests,
  createSignatureRequest,
} from "@/lib/services/contractCenterService";
import type { CCSignatureRequest, CCDocumentType, CCSignerRole } from "@/types/contractCenter";

export default function SignaturesHubPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signatures, setSignatures] = useState<CCSignatureRequest[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    documentType: "service_agreement" as CCDocumentType,
    documentId: "",
    documentRef: "",
    signerName: "",
    signerEmail: "",
    signerRole: "client_authorized" as CCSignerRole,
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
      const list = await getSignatureRequests();
      setSignatures(list);
    } catch (err) {
      console.error("Error loading signature requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.signerName || !formData.signerEmail) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";

      await createSignatureRequest(
        {
          documentType: formData.documentType,
          documentId: formData.documentId || `doc-${Date.now()}`,
          documentRef: formData.documentRef || "DEV-DOC-2026",
          documentVersion: 1,
          signingOrder: "parallel",
          status: "pending",
          signers: [
            {
              id: `signer-${Date.now()}`,
              name: formData.signerName,
              email: formData.signerEmail,
              role: formData.signerRole,
              status: "invitation_sent",
              signingOrder: 1,
            },
          ],
          createdBy: performedBy,
        },
        performedBy
      );

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create signature request:", err);
      alert("Failed to create signature request.");
    } finally {
      setSaving(false);
    }
  };

  const copySigningLink = (sig: CCSignatureRequest) => {
    const url = `${window.location.origin}/contract/view/${sig.documentId}?type=${sig.documentType}&token=${sig.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(sig.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = signatures.filter((s) => {
    const matchesSearch =
      s.documentRef.toLowerCase().includes(search.toLowerCase()) ||
      s.signers.some((signer) =>
        signer.name.toLowerCase().includes(search.toLowerCase()) ||
        signer.email.toLowerCase().includes(search.toLowerCase())
      );

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
        <title>Signatures Hub — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">E-Signatures & Audit Verification</h1>
            <p className="text-sm text-slate-400">Track signing requests and execution status.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Send Signature Request
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/signatures" />

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input data-admin-search
              type="text"
              placeholder="Search by document ref #, signer name, email..."
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
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </AdminSelect>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Document Ref</th>
                  <th className="py-3 px-4 font-medium">Doc Type</th>
                  <th className="py-3 px-4 font-medium">Signer</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((sig) => {
                  const signer = sig.signers?.[0];
                  return (
                    <tr key={sig.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-pink-400">
                        {sig.documentRef}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-300">
                        {sig.documentType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{signer?.name || "Signer"}</div>
                        <div className="text-[11px] text-slate-400">{signer?.email}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize">{signer?.role?.replace(/_/g, " ") || "Client"}</td>
                      <td className="py-3 px-4">
                        <CCStatusBadge status={sig.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => copySigningLink(sig)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-[11px] font-medium transition-colors"
                        >
                          {copiedId === sig.id ? "Copied ✓" : "Copy Signing Link"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No signature requests found.
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
                <h3 className="text-lg font-bold text-white">Create Signature Request</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white text-lg"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Document Type</label>
                  <AdminSelect
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value as CCDocumentType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="service_agreement">Master Service Agreement</option>
                    <option value="nda">Non-Disclosure Agreement</option>
                    <option value="quotation">Quotation / Proposal Acceptance</option>
                    <option value="sow">Statement of Work</option>
                    <option value="change_order">Change Order Addendum</option>
                  </AdminSelect>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Document Reference #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DEV-AGR-2026-0001"
                    value={formData.documentRef}
                    onChange={(e) => setFormData({ ...formData, documentRef: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Signer Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full Name"
                      value={formData.signerName}
                      onChange={(e) => setFormData({ ...formData, signerName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-300 mb-1">Signer Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="signer@client.com"
                      value={formData.signerEmail}
                      onChange={(e) => setFormData({ ...formData, signerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Signer Role</label>
                  <AdminSelect
                    value={formData.signerRole}
                    onChange={(e) => setFormData({ ...formData, signerRole: e.target.value as CCSignerRole })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="client_authorized">Client Authorized Signatory</option>
                    <option value="devengine_authorized">DevEngine Authorized Executive</option>
                    <option value="witness">Witness</option>
                  </AdminSelect>
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
                    {saving ? "Sending..." : "Create Request"}
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
