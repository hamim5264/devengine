// pages/admin/contract-center/audit.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Immutable Audit Trail
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav } from "@/components/contract-center/CCUI";
import { getAuditTrail } from "@/lib/services/contractCenterService";
import type { CCAuditEvent, CCDocumentType } from "@/types/contractCenter";

export default function AuditTrailPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CCAuditEvent[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (!user) router.replace("/login?redirect=/admin/contract-center/audit");
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await getAuditTrail(100);
      setLogs(list);
    } catch (err) {
      console.error("Error loading audit trail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.details && l.details.toLowerCase().includes(search.toLowerCase())) ||
      (l.documentRef && l.documentRef.toLowerCase().includes(search.toLowerCase())) ||
      l.performedBy.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === "all" || l.documentType === typeFilter;
    return matchesSearch && matchesType;
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
        <title>Audit Trail & Verification — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                Append-Only Immutable
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Audit Trail & Integrity Log
            </h1>
            <p className="text-sm text-slate-400">
              Complete tamper-evident event log recording all document creations, status changes, and signatures.
            </p>
          </div>
          <button
            onClick={loadData}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-all"
          >
            Refresh Log
          </button>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/audit" />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search audit events by action, operator, reference #, details..."
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
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Document Types</option>
              <option value="quotation">Quotations</option>
              <option value="nda">NDAs</option>
              <option value="service_agreement">Service Agreements</option>
              <option value="sow">Statements of Work</option>
              <option value="change_order">Change Orders</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Timestamp</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                  <th className="py-3 px-4 font-medium">Document Ref</th>
                  <th className="py-3 px-4 font-medium">Type</th>
                  <th className="py-3 px-4 font-medium">Details</th>
                  <th className="py-3 px-4 font-medium text-right">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-pink-400 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.documentRef || "—"}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-400">
                      {log.documentType ? log.documentType.replace(/_/g, " ") : "—"}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-sm truncate">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-300">
                      {log.performedBy}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No audit events logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
