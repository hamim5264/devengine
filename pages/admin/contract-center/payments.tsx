import { AdminSelect } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/payments.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Payment Milestones & Receivables
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav, CCStatCard, CCStatusBadge, formatCCPrice, BDTIcon } from "@/components/contract-center/CCUI";
import {
  getQuotations,
  getServiceAgreements,
  recordMilestonePayment,
} from "@/lib/services/contractCenterService";
import type { CCQuotation, CCServiceAgreement, CCPaymentMilestone } from "@/types/contractCenter";

interface PaymentRow {
  id: string;
  quotationId?: string;
  agreementNumber?: string;
  clientName: string;
  description: string;
  percentage?: number;
  amount: number;
  currency: string;
  status: "pending" | "invoiced" | "paid" | "overdue" | "cancelled";
  paidDate?: string;
  paymentReference?: string;
}

export default function PaymentsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Payment Recording Modal
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null);
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);

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
      const [quoList, agrList] = await Promise.all([getQuotations(), getServiceAgreements()]);
      const rows: PaymentRow[] = [];

      quoList.forEach((q) => {
        if (q.paymentSchedule) {
          q.paymentSchedule.forEach((m) => {
            rows.push({
              id: `${q.id}_${m.id}`,
              quotationId: q.id,
              agreementNumber: q.quotationNumber,
              clientName: q.clientName || "Client",
              description: m.description,
              percentage: m.percentage,
              amount: m.amount || 0,
              currency: q.currency,
              status: m.status,
              paidDate: m.paidDate,
              paymentReference: m.paymentReference,
            });
          });
        }
      });

      setPaymentRows(rows);
    } catch (err) {
      console.error("Error loading payment schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRow || !selectedRow.quotationId) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const milestoneId = selectedRow.id.split("_")[1];

      await recordMilestonePayment(
        selectedRow.quotationId,
        milestoneId,
        selectedRow.amount,
        payRef || "Direct Bank / Wire Transfer",
        performedBy
      );

      setSelectedRow(null);
      setPayRef("");
      await loadData();
    } catch (err) {
      console.error("Failed to record payment:", err);
      alert("Failed to record payment.");
    } finally {
      setSaving(false);
    }
  };

  const totalContracted = paymentRows.reduce((sum, r) => sum + r.amount, 0);
  const totalCollected = paymentRows
    .filter((r) => r.status === "paid")
    .reduce((sum, r) => sum + r.amount, 0);
  const totalOutstanding = totalContracted - totalCollected;

  const filtered = paymentRows.filter((r) => {
    const matchesSearch =
      r.description.toLowerCase().includes(search.toLowerCase()) ||
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      (r.agreementNumber && r.agreementNumber.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
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
        <title>Payment Schedules & Collections — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Payment Schedules & Receivables</h1>
            <p className="text-sm text-slate-400">Track deposits, milestone payments, and settlements.</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/payments" />

        {/* Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <CCStatCard
            title="Total Contracted Fees"
            value={formatCCPrice(totalContracted, "BDT")}
            subtext="Across all milestones"
            color="sky"
            icon={<BDTIcon className="text-sky-400 text-xl" />}
          />
          <CCStatCard
            title="Collected Revenue"
            value={formatCCPrice(totalCollected, "BDT")}
            subtext="Verified & settled"
            color="emerald"
            icon={<BDTIcon className="text-emerald-400 text-xl" />}
          />
          <CCStatCard
            title="Outstanding Receivables"
            value={formatCCPrice(totalOutstanding, "BDT")}
            subtext="Pending / Due milestones"
            color="amber"
            icon={<BDTIcon className="text-amber-400 text-xl" />}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input data-admin-search
              type="text"
              placeholder="Find a payment or milestone"
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
              <option value="all">All Payment Statuses</option>
              <option value="pending">Pending</option>
              <option value="invoiced">Invoiced</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </AdminSelect>
          </div>
        </div>

        {/* Payments Table */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/40 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-medium">Agreement / Ref</th>
                  <th className="py-3 px-4 font-medium">Milestone Description</th>
                  <th className="py-3 px-4 font-medium">Client</th>
                  <th className="py-3 px-4 font-medium">Amount</th>
                  <th className="py-3 px-4 font-medium">Payment Ref</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-pink-400">
                      {row.agreementNumber}
                    </td>
                    <td className="py-3 px-4 max-w-[240px]">
                      <div className="font-semibold text-white truncate">{row.description}</div>
                      {row.percentage && (
                        <div className="text-[11px] text-slate-400">{row.percentage}% of contract</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{row.clientName}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      {formatCCPrice(row.amount, row.currency || "BDT")}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {row.paymentReference || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <CCStatusBadge status={row.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {row.status !== "paid" && (
                        <button
                          onClick={() => setSelectedRow(row)}
                          className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-medium transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No milestone payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mark Paid Modal */}
        {selectedRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Record Milestone Settlement</h3>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-300 space-y-1">
                  <div>Milestone: <span className="text-white font-medium">{selectedRow.description}</span></div>
                  <div>Amount: <span className="text-emerald-400 font-bold">{selectedRow.amount.toLocaleString()} {selectedRow.currency}</span></div>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Payment Reference / Transaction ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank Wire TXN-8921829 or Stripe ch_3Nx"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedRow(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-50"
                  >
                    {saving ? "Confirming..." : "Confirm Settlement"}
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
