import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import HelixLoader from "@/components/HelixLoader";
import { OrderRecord, OrderStatus } from "@/types/order";
import { generatePdfInvoice } from "@/lib/utils/generatePdfInvoice";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageOrdersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrderModal, setSelectedOrderModal] = useState<OrderRecord | null>(null);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<OrderRecord | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Auth check
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      if (user?.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        router.push("/login");
      }
    });
    return () => unsub();
  }, [router]);

  // Load orders from Firestore
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: OrderRecord[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          customerName: data.customerName || data.buyerName || data.fullName || "Anonymous",
          customerEmail: data.customerEmail || data.buyerEmail || data.email || "—",
          customerPhone: data.customerPhone || data.phone || "—",
          customerAddress: data.customerAddress || data.address || "—",
          projectId: data.projectId || "",
          projectSlug: data.projectSlug || "",
          projectTitle: data.projectTitle || data.productName || "DevEngine System",
          planId: data.planId || "studio",
          planName: data.planName || "Studio License",
          amount: data.amount || data.amountUSD || "0",
          currency: data.currency || "BDT",
          paymentMethod: data.paymentMethod || "bKash",
          transactionId: data.transactionId || data.trxId || "—",
          senderNumberOrAccount: data.senderNumberOrAccount || data.senderNumber || "—",
          additionalNotes: data.additionalNotes || data.notes || "",
          status: data.status || "Pending Verification",
          createdAt: data.createdAt?.toDate?.()
            ? data.createdAt.toDate().toISOString()
            : data.createdAt || new Date().toISOString(),
        };
      });
      setOrders(list);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchOrders();
    }
  }, [isAdmin]);

  // Update order status
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (selectedOrderModal?.id === orderId) {
      setSelectedOrderModal((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setActionLoading(orderId);

    try {
      const ref = doc(db, "orders", orderId);
      await updateDoc(ref, {
        status: newStatus,
        verifiedAt: Timestamp.now(),
      });
    } catch (err) {
      console.error("Failed to update order status:", err);
      alert("Failed to update status in database.");
    } finally {
      setActionLoading(null);
    }
  };

  // Move order to Recycle Bin (Soft Delete)
  const confirmMoveToBin = async () => {
    if (!deleteTargetOrder) return;
    const order = deleteTargetOrder;
    setActionLoading(order.id);
    try {
      await moveToBin({
        originalCollection: "orders",
        originalId: order.id,
        itemTitle: `Order #${order.id} (${order.customerName})`,
        itemType: "Order",
        data: order,
        metadata: {
          customerEmail: order.customerEmail,
          projectTitle: order.projectTitle,
          amount: order.amount,
          currency: order.currency,
        },
      });
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      if (selectedOrderModal?.id === order.id) setSelectedOrderModal(null);
      setDeleteTargetOrder(null);
    } catch (err) {
      console.error("Failed to move order to Recycle Bin:", err);
      alert("Failed to move order to Recycle Bin.");
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, idKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      o.status?.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail.toLowerCase().includes(q) ||
      o.customerPhone.toLowerCase().includes(q) ||
      o.transactionId.toLowerCase().includes(q) ||
      o.projectTitle.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter(
    (o) => o.status?.toLowerCase() === "pending verification" || o.status?.toLowerCase() === "pending"
  ).length;
  const verifiedCount = orders.filter(
    (o) => o.status?.toLowerCase() === "verified"
  ).length;
  const rejectedCount = orders.filter(
    (o) => o.status?.toLowerCase() === "rejected"
  ).length;

  if (!authReady || !isAdmin) {
    return (
      <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center bg-[#07070f] text-white">
        <HelixLoader size={48} color="#14b8a6" />
        <p className="mt-4 font-mono text-xs text-gray-400">Verifying Admin Permissions…</p>
      </main>
    );
  }

  return (
    <AdminLayout title="Manage Orders & Payments | DevEngine Admin">
      <Head>
        <title>Manage Orders & Payment Records | DevEngine Admin</title>
      </Head>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 text-white space-y-7">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-teal-400 uppercase bg-teal-400/10 px-2.5 py-0.5 rounded-full border border-teal-400/20">
                Financial Audit Matrix
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Live Billing Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Customer Orders & Manual Payments
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Review transaction receipts, audit TrxIDs, and verify software license orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchOrders}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh</span>
            </button>
            <Link
              href="/admin/dashboard"
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-500/10"
            >
              <span>Admin Dashboard</span>
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
            </Link>
          </div>
        </div>

        {/* ── BIG METRICS CARDS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Orders */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-teal-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Total Orders
                </span>
                <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    receipt_long
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                {orders.length}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-teal-400 font-semibold">All Records</span>
              <span className="text-gray-500">Cumulative submissions</span>
            </div>
          </div>

          {/* Card 2: Pending Audit */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-amber-500/20 hover:border-amber-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">
                  Pending Audit
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    pending_actions
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 flex items-center gap-2 text-3xl sm:text-4xl lg:text-[42px] font-black text-amber-300 tracking-tight leading-none">
                <span>{pendingCount}</span>
                {pendingCount > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-amber-300 font-semibold">Action Required</span>
              <span className="text-gray-500">Awaiting verification</span>
            </div>
          </div>

          {/* Card 3: Verified Orders */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-emerald-500/20 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-400">
                  Verified Orders
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    verified
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-emerald-300 tracking-tight leading-none">
                {verifiedCount}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-emerald-400 font-semibold">Approved</span>
              <span className="text-gray-500">License issued</span>
            </div>
          </div>

          {/* Card 4: Payment Methods */}
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Payment Channels
                </span>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">
                    account_balance_wallet
                  </span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 flex items-baseline text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <span>5</span>
                <span className="text-xs sm:text-sm font-medium text-cyan-400 ml-2">Active</span>
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-cyan-400 font-semibold">bKash, Nagad, Bank</span>
              <span className="text-gray-500">Manual verification</span>
            </div>
          </div>
        </div>

        {/* ── SEARCH & FILTER CONTROLS (PERFECT ALIGNMENT) ── */}
        <div className="rounded-2xl bg-[#0c0c16] border border-white/[0.07] p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, customer, TrxID, project..."
              className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-teal-400/50 rounded-xl pl-9 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Pills with Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-0.5">
            {[
              { id: "ALL", label: "All", count: orders.length },
              { id: "Pending Verification", label: "Pending", count: pendingCount, color: "text-amber-400" },
              { id: "Verified", label: "Verified", count: verifiedCount, color: "text-emerald-400" },
              { id: "Rejected", label: "Rejected", count: rejectedCount, color: "text-rose-400" },
            ].map((tab) => {
              const active = statusFilter.toLowerCase() === tab.id.toLowerCase();
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20"
                      : "bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? "bg-black/20 text-slate-950" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── ORDERS DATA TABLE (HIGH PRECISION ALIGNMENT) ── */}
        {loading ? (
          <div className="py-24 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.07]">
            <HelixLoader size={40} color="#14b8a6" />
            <p className="mt-3 font-mono text-xs text-gray-400">Loading order records…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.07]">
            <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">
              inbox
            </span>
            <p className="text-base font-bold text-gray-300">No matching orders found</p>
            <p className="text-xs text-gray-500 mt-1">
              Try adjusting your search query or status filter.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0c0c16] border border-white/[0.07] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    <th className="py-3.5 px-5 w-44">Order / Tracking ID</th>
                    <th className="py-3.5 px-5 w-56">Customer Details</th>
                    <th className="py-3.5 px-5 w-60">Project & Plan</th>
                    <th className="py-3.5 px-5 w-40">Amount & Method</th>
                    <th className="py-3.5 px-5 w-48">Transaction ID</th>
                    <th className="py-3.5 px-5 text-center w-36">Status</th>
                    <th className="py-3.5 px-5 text-right w-44">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-xs">
                  {filteredOrders.map((order) => {
                    const isPending =
                      order.status?.toLowerCase() === "pending verification" ||
                      order.status?.toLowerCase() === "pending";
                    const isVerified = order.status?.toLowerCase() === "verified";
                    const isRejected = order.status?.toLowerCase() === "rejected";

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                      >
                        {/* Order ID */}
                        <td className="py-4 px-5">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(order.id, order.id)}
                            className="font-mono text-xs font-bold text-teal-400 hover:text-teal-300 transition flex items-center gap-1.5"
                            title="Click to copy ID"
                          >
                            <span>{order.id}</span>
                            <span className="material-symbols-outlined text-[13px] opacity-0 group-hover:opacity-100 transition-opacity text-gray-500">
                              {copiedId === order.id ? "check" : "content_copy"}
                            </span>
                          </button>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </td>

                        {/* Customer Info */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-white truncate max-w-[200px]">
                            {order.customerName}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate max-w-[200px] mt-0.5">
                            {order.customerEmail}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {order.customerPhone}
                          </div>
                        </td>

                        {/* Project & Plan */}
                        <td className="py-4 px-5">
                          <div className="font-semibold text-gray-200 truncate max-w-[220px]">
                            {order.projectTitle}
                          </div>
                          <span className="inline-block px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-medium mt-1">
                            {order.planName}
                          </span>
                        </td>

                        {/* Amount & Method */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-sm text-emerald-400 tracking-tight">
                            {order.currency === "USD" ? "$" : "BDT "}
                            {Number(order.amount).toLocaleString("en-US")}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                            <span>{order.paymentMethod}</span>
                          </div>
                        </td>

                        {/* Transaction ID */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-1.5">
                            <code className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-gray-200 font-mono text-[11px] truncate max-w-[130px]">
                              {order.transactionId}
                            </code>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(order.transactionId, `trx-${order.id}`)}
                              className="text-gray-500 hover:text-teal-400 p-1 rounded"
                              title="Copy TrxID"
                            >
                              <span className="material-symbols-outlined text-[13px]">
                                {copiedId === `trx-${order.id}` ? "check" : "content_copy"}
                              </span>
                            </button>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-1">
                            From: {order.senderNumberOrAccount}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center">
                          {isVerified && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Verified
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              Pending
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <button
                              type="button"
                              onClick={() => setSelectedOrderModal(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                              title="Audit Order"
                            >
                              Details
                            </button>

                            {/* Quick Verify */}
                            {isVerified ? (
                              <span className="px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">done</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(order.id, "Verified")}
                                disabled={actionLoading === order.id}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1 disabled:opacity-50"
                              >
                                <span>Verify</span>
                              </button>
                            )}

                            {/* Download PDF */}
                            <button
                              type="button"
                              onClick={() => generatePdfInvoice(order)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-gray-400 hover:text-teal-400 transition"
                              title="Download PDF Invoice"
                            >
                              <span className="material-symbols-outlined text-[17px]">download</span>
                            </button>

                            {/* Delete Order */}
                            <button
                              type="button"
                              onClick={() => setDeleteTargetOrder(order)}
                              disabled={actionLoading === order.id}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                              title="Delete Order"
                            >
                              <span className="material-symbols-outlined text-[17px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ── PAYMENT AUDIT MODAL ── */}
      {selectedOrderModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
          <div className="relative w-full max-w-2xl bg-[#0c0c16] border border-teal-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <button
              onClick={() => setSelectedOrderModal(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-teal-400 uppercase tracking-widest bg-teal-400/10 px-2 py-0.5 rounded-md border border-teal-400/20">
                  ORDER AUDIT
                </span>
                <span className="text-gray-500">•</span>
                <code className="text-xs text-white font-mono font-bold">
                  {selectedOrderModal.id}
                </code>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Payment Verification Details
              </h3>
            </div>

            {/* Audit Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-5 rounded-2xl border border-white/[0.06] text-xs">
              <div>
                <span className="text-gray-400 block text-[11px]">Customer Name:</span>
                <span className="text-white font-bold text-sm block mt-0.5">
                  {selectedOrderModal.customerName}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Customer Email:</span>
                <span className="text-gray-200 font-mono block mt-0.5">
                  {selectedOrderModal.customerEmail}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Customer Phone:</span>
                <span className="text-gray-200 font-mono block mt-0.5">
                  {selectedOrderModal.customerPhone}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Delivery Address:</span>
                <span className="text-gray-200 block mt-0.5">
                  {selectedOrderModal.customerAddress}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Project / System:</span>
                <span className="text-teal-400 font-bold block mt-0.5">
                  {selectedOrderModal.projectTitle}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">License Tier:</span>
                <span className="text-gray-200 block mt-0.5">
                  {selectedOrderModal.planName}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Amount Payable:</span>
                <span className="text-emerald-400 font-bold text-base block mt-0.5">
                  {selectedOrderModal.currency === "USD" ? "$" : "BDT "}
                  {Number(selectedOrderModal.amount).toLocaleString("en-US")}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Payment Method:</span>
                <span className="text-white font-semibold block mt-0.5">
                  {selectedOrderModal.paymentMethod}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Transaction ID (TrxID):</span>
                <code className="text-teal-300 font-mono font-bold text-xs bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 inline-block mt-0.5">
                  {selectedOrderModal.transactionId}
                </code>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px]">Sender Account / Number:</span>
                <span className="text-white font-mono block mt-0.5">
                  {selectedOrderModal.senderNumberOrAccount}
                </span>
              </div>
            </div>

            {selectedOrderModal.additionalNotes && (
              <div className="p-3.5 bg-black/40 rounded-xl border border-white/[0.06] text-xs">
                <span className="text-gray-400 font-semibold block mb-1">Customer Notes:</span>
                <p className="text-gray-300">{selectedOrderModal.additionalNotes}</p>
              </div>
            )}

            {/* Quick Status Modifiers */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2">
                {selectedOrderModal.status?.toLowerCase() === "verified" ? (
                  <div className="flex items-center gap-2">
                    <span className="px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      <span>Verified</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrderModal.id, "Pending Verification")}
                      disabled={actionLoading === selectedOrderModal.id}
                      className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white text-xs font-medium transition cursor-pointer"
                    >
                      Revert to Pending
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrderModal.id, "Verified")}
                      disabled={actionLoading === selectedOrderModal.id}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>Approve & Verify</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrderModal.id, "Rejected")}
                      disabled={actionLoading === selectedOrderModal.id}
                      className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => generatePdfInvoice(selectedOrderModal)}
                className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-200 hover:text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-white/[0.08]"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download Invoice PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM DELETE CONFIRMATION MODAL ── */}
      {deleteTargetOrder && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0c0c16] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-rose-950/40 text-center space-y-4">
            <button
              onClick={() => setDeleteTargetOrder(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Move Order to Recycle Bin?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                Order <code className="text-rose-300 font-mono font-bold">{deleteTargetOrder.id}</code> will be moved to the Recycle Bin. You can recover it anytime or permanently purge it from the Bin.
              </p>
            </div>

            {/* Order summary card with strict alignment */}
            <div className="p-4 rounded-2xl bg-black/50 border border-white/[0.08] text-left text-xs space-y-2.5">
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-400 font-medium shrink-0 w-24">Customer:</span>
                <span className="text-white font-semibold text-right flex-1 truncate">{deleteTargetOrder.customerName}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-400 font-medium shrink-0 w-24">Project:</span>
                <span className="text-gray-200 font-medium text-right flex-1 leading-snug break-words">{deleteTargetOrder.projectTitle}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-gray-400 font-medium shrink-0 w-24">Amount:</span>
                <span className="text-emerald-400 font-bold text-right flex-1">
                  {deleteTargetOrder.currency === "USD" ? "$" : "BDT "}
                  {Number(deleteTargetOrder.amount).toLocaleString("en-US")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetOrder(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMoveToBin}
                disabled={actionLoading === deleteTargetOrder.id}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{actionLoading === deleteTargetOrder.id ? "Moving..." : "Move to Bin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
