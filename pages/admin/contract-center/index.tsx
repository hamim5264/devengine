import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/index.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Dashboard Overview
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatCard, CCStatusBadge, BDTIcon, formatCCPrice } from "@/components/contract-center/CCUI";
import Swal from "sweetalert2";
import { seedContractCenterDemoData } from "@/lib/services/ccSeedService";
import {
  getClients,
  getQuotations,
  getNDAs,
  getServiceAgreements,
  getAuditTrail,
} from "@/lib/services/contractCenterService";
import type {
  CCClient,
  CCQuotation,
  CCNDA,
  CCServiceAgreement,
  CCAuditEvent,
} from "@/types/contractCenter";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ContractCenterDashboard() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [clients, setClients] = useState<CCClient[]>([]);
  const [quotations, setQuotations] = useState<CCQuotation[]>([]);
  const [ndas, setNdas] = useState<CCNDA[]>([]);
  const [agreements, setAgreements] = useState<CCServiceAgreement[]>([]);
  const [auditLogs, setAuditLogs] = useState<CCAuditEvent[]>([]);

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setIsAdmin(true);
      setAuthReady(true);
    }, () => {
      setIsAdmin(false);
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cli, quo, nda, agr, aud] = await Promise.all([
        getClients(),
        getQuotations(),
        getNDAs(),
        getServiceAgreements(),
        getAuditTrail(8),
      ]);
      setClients(cli);
      setQuotations(quo);
      setNdas(nda);
      setAgreements(agr);
      setAuditLogs(aud);
    } catch (err) {
      console.error("Failed to load Contract Center dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    fetchData();
  }, [authReady]);

  const handleSeedDemo = async () => {
    try {
      const confirm = await Swal.fire({
        title: "Populate Contract Center Demo?",
        text: "This will add realistic enterprise clients (Apex FinTech, Nexus Logistics), commercial quotations in BDT (৳), mutual NDAs, and active MSAs.",
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#ec4899",
        cancelButtonColor: "#334155",
        confirmButtonText: "Yes, Seed Contracts",
        background: "#0f172a",
        color: "#f8fafc",
      });
      if (!confirm.isConfirmed) return;

      setSeeding(true);
      await seedContractCenterDemoData(ADMIN_EMAIL);
      await fetchData();
      Swal.fire({
        title: "Contracts & Agreements Populated!",
        text: "Sample clients, BDT quotations, executed NDAs, and active agreements are now ready.",
        icon: "success",
        timer: 3000,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#f8fafc",
      });
    } catch (err: any) {
      console.error("Seeding error:", err);
      Swal.fire({
        title: "Seeding Failed",
        text: err?.message || "Unknown error occurred",
        icon: "error",
        background: "#0f172a",
        color: "#f8fafc",
      });
    } finally {
      setSeeding(false);
    }
  };

  if (!authReady || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <HelixLoader />
        </div>
      </AdminLayout>
    );
  }

  // Calculate high-level pipeline stats
  const activeClientsCount = clients.filter((c) => c.status === "active").length;
  const activeAgreementsCount = agreements.filter(
    (a) => a.status === "active" || a.status === "executed"
  ).length;
  const pendingSignaturesCount =
    quotations.filter((q) => q.status === "sent" || q.status === "viewed").length +
    ndas.filter((n) => n.status === "sent" || n.status === "partially_signed").length +
    agreements.filter((a) => a.status === "sent" || a.status === "partially_signed").length;

  const totalPipelineValue = quotations
    .filter((q) => q.status === "sent" || q.status === "viewed" || q.status === "accepted")
    .reduce((sum, q) => sum + (q.grandTotal || 0), 0);

  const totalContractedValue = agreements.reduce(
    (sum, a) => sum + (a.totalValue || 0),
    0
  );

  return (
    <AdminLayout>
      <Head>
        <title>Contract Center — DevEngine Admin</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-pink-400 bg-pink-500/10 border border-pink-500/30 rounded-full">
                Contract Engine
              </span>
              <span className="text-xs text-slate-500">v2.0 enterprise</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Contract & Agreement Center
            </h1>
            <p className="text-sm text-slate-400">
              Manage client relationships, itemized quotations, NDAs, statements of work, and legally binding agreements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSeedDemo}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
              title="Populate complete sample contracts, NDAs, and quotations in BDT"
            >
              <BDTIcon className="text-emerald-400 text-sm" />
              {seeding ? "Seeding..." : "Seed Sample Contracts"}
            </button>
            <Link
              href="/admin/contract-center/quotations/create"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Quotation
            </Link>
            <Link
              href="/admin/contract-center/ndas"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
            >
              Draft NDA
            </Link>
            <Link
              href="/admin/contract-center/clients"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
            >
              Add Client
            </Link>
          </div>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center" />

        {/* High Level Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CCStatCard
            title="Total Pipeline Value"
            value={formatCCPrice(totalPipelineValue, "BDT")}
            subtext="Active proposals & quotations"
            color="pink"
            icon={<BDTIcon className="text-pink-400 text-2xl" />}
          />
          <CCStatCard
            title="Active Executed Contracts"
            value={activeAgreementsCount}
            subtext={`${formatCCPrice(totalContractedValue, "BDT")} signed volume`}
            color="emerald"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
          />
          <CCStatCard
            title="Pending Signatures"
            value={pendingSignaturesCount}
            subtext="Awaiting client / mutual execution"
            color="amber"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          />
          <CCStatCard
            title="Client Accounts"
            value={clients.length}
            subtext={`${activeClientsCount} active clients`}
            color="sky"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
        </div>

        {/* Dashboard 2-column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Quotations (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quotations card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-white">Recent Quotations & Proposals</h2>
                  <p className="text-xs text-slate-400">Latest itemized quotes sent or in progress</p>
                </div>
                <Link
                  href="/admin/contract-center/quotations"
                  className="text-xs font-medium text-pink-400 hover:text-pink-300"
                >
                  View all ({quotations.length}) →
                </Link>
              </div>

              {quotations.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-xl">
                  <p className="text-sm text-slate-400">No quotations created yet.</p>
                  <Link
                    href="/admin/contract-center/quotations/create"
                    className="mt-3 inline-block text-xs font-semibold text-pink-400 hover:underline"
                  >
                    + Create your first quotation
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-3 font-medium">Quote #</th>
                        <th className="pb-3 font-medium">Title</th>
                        <th className="pb-3 font-medium">Client</th>
                        <th className="pb-3 font-medium">Amount</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {quotations.slice(0, 5).map((q) => (
                        <tr key={q.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 font-mono text-pink-400">{q.quotationNumber}</td>
                          <td className="py-3 font-medium text-white max-w-[200px] truncate">
                            {q.title}
                          </td>
                          <td className="py-3 text-slate-300">{q.clientName || "Valued Client"}</td>
                          <td className="py-3 font-semibold text-white">
                            {formatCCPrice(q.grandTotal || 0, q.currency || "BDT")}
                          </td>
                          <td className="py-3">
                            <CCStatusBadge status={q.status} />
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              href={`/admin/contract-center/quotations`}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              Details
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Active NDAs & Service Agreements summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Non-Disclosure Agreements</h3>
                  <Link href="/admin/contract-center/ndas" className="text-xs text-pink-400">
                    Manage →
                  </Link>
                </div>
                <div className="space-y-2">
                  {ndas.slice(0, 3).map((n) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-medium text-white">{n.ndaNumber}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[140px]">
                          {n.receivingPartyName}
                        </div>
                      </div>
                      <CCStatusBadge status={n.status} />
                    </div>
                  ))}
                  {ndas.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 text-center">No NDAs on record.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-white">Service Agreements</h3>
                  <Link href="/admin/contract-center/agreements" className="text-xs text-pink-400">
                    Manage →
                  </Link>
                </div>
                <div className="space-y-2">
                  {agreements.slice(0, 3).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 text-xs"
                    >
                      <div>
                        <div className="font-medium text-white">{a.agreementNumber}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[140px]">
                          {a.title}
                        </div>
                      </div>
                      <CCStatusBadge status={a.status} />
                    </div>
                  ))}
                  {agreements.length === 0 && (
                    <p className="text-xs text-slate-500 py-3 text-center">No agreements on record.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Quick Links & Audit Feed (1 col) */}
          <div className="space-y-6">
            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-sm font-semibold text-white mb-3">Operations & Workflows</h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/admin/contract-center/quotations/create"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">📄</span>
                  <span className="font-medium">Quote Builder</span>
                </Link>
                <Link
                  href="/admin/contract-center/ndas"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">🔒</span>
                  <span className="font-medium">Mutual NDA</span>
                </Link>
                <Link
                  href="/admin/contract-center/sow"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">📋</span>
                  <span className="font-medium">Statements of Work</span>
                </Link>
                <Link
                  href="/admin/contract-center/signatures"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">✍️</span>
                  <span className="font-medium">Signatures Hub</span>
                </Link>
                <Link
                  href="/admin/contract-center/milestones"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">🎯</span>
                  <span className="font-medium">Milestones Tracker</span>
                </Link>
                <Link
                  href="/admin/contract-center/change-orders"
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 transition-all text-center"
                >
                  <span className="text-lg mb-1">🔄</span>
                  <span className="font-medium">Change Orders</span>
                </Link>
              </div>
            </div>

            {/* Recent Audit Trail */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white">Audit Trail Activity</h2>
                <Link href="/admin/contract-center/audit" className="text-xs text-pink-400">
                  Full log →
                </Link>
              </div>
              <div className="space-y-3">
                {auditLogs.slice(0, 5).map((log, idx) => (
                  <div key={idx} className="flex gap-2.5 text-xs">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
                    <div>
                      <p className="text-slate-200 font-medium">
                        {log.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-[11px] text-slate-400">{log.details}</p>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">No recent activity.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
