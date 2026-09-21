import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  BinItem,
  getBinItems,
  restoreBinItem,
  permanentlyDeleteBinItem,
  restoreBatch,
  permanentlyDeleteBatch,
  emptyBin,
} from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageBinPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [binItems, setBinItems] = useState<BinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modals
  const [previewItem, setPreviewItem] = useState<BinItem | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<BinItem | null>(null);
  const [emptyBinModalOpen, setEmptyBinModalOpen] = useState(false);

  // Notification
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  const loadBin = async () => {
    setLoading(true);
    try {
      const items = await getBinItems();
      setBinItems(items);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Failed to load bin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadBin();
    }
  }, [isAdmin]);

  // Select item toggle
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  // Single item restore
  const handleRestoreSingle = async (item: BinItem) => {
    setActionLoading(item.id);
    try {
      await restoreBinItem(item);
      setNotice({
        type: "success",
        message: `Successfully recovered "${item.itemTitle}" back to active records!`,
      });
      await loadBin();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: "Recovery failed: " + (err?.message || "Unknown error"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Single item permanent purge
  const handlePurgeSingle = async () => {
    if (!purgeTarget) return;
    setActionLoading(purgeTarget.id);
    try {
      await permanentlyDeleteBinItem(purgeTarget.id);
      setNotice({
        type: "success",
        message: `Permanently deleted "${purgeTarget.itemTitle}".`,
      });
      setPurgeTarget(null);
      await loadBin();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: "Failed to purge: " + (err?.message || "Unknown error"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Batch restore
  const handleBatchRestore = async () => {
    const itemsToRestore = binItems.filter((i) => selectedIds.has(i.id));
    if (itemsToRestore.length === 0) return;

    setActionLoading("batch-restore");
    try {
      const count = await restoreBatch(itemsToRestore);
      setNotice({
        type: "success",
        message: `Successfully recovered ${count} item(s) back to active records!`,
      });
      await loadBin();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: "Batch recovery failed: " + (err?.message || "Unknown error"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Batch permanent purge
  const handleBatchPurge = async () => {
    const idsToPurge = Array.from(selectedIds);
    if (idsToPurge.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete ${idsToPurge.length} selected item(s)? This cannot be undone.`
      )
    ) {
      return;
    }

    setActionLoading("batch-purge");
    try {
      const count = await permanentlyDeleteBatch(idsToPurge);
      setNotice({
        type: "success",
        message: `Permanently purged ${count} item(s) from database.`,
      });
      await loadBin();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: "Batch purge failed: " + (err?.message || "Unknown error"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Empty whole bin
  const handleEmptyBin = async () => {
    setActionLoading("empty-bin");
    try {
      const count = await emptyBin();
      setNotice({
        type: "success",
        message: `Recycle Bin emptied! Purged ${count} item(s).`,
      });
      setEmptyBinModalOpen(false);
      await loadBin();
    } catch (err: any) {
      setNotice({
        type: "error",
        message: "Failed to empty bin: " + (err?.message || "Unknown error"),
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered items
  const filteredItems = binItems.filter((i) => {
    const matchesType =
      typeFilter === "ALL" ||
      i.itemType?.toLowerCase() === typeFilter.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      i.itemTitle.toLowerCase().includes(q) ||
      i.itemType.toLowerCase().includes(q) ||
      i.originalId.toLowerCase().includes(q) ||
      i.originalCollection.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  const orderBinCount = binItems.filter((i) => i.originalCollection === "orders").length;
  const projectBinCount = binItems.filter((i) => i.originalCollection === "projects" || i.originalCollection === "lab_projects").length;
  const otherBinCount = binItems.length - orderBinCount - projectBinCount;

  if (!authReady || !isAdmin) {
    return (
      <main className="min-h-screen pt-44 pb-32 flex flex-col items-center justify-center bg-[#07070f] text-white">
        <HelixLoader size={48} color="#14b8a6" />
        <p className="mt-4 font-mono text-xs text-gray-400">Verifying Admin Permissions…</p>
      </main>
    );
  }

  return (
    <AdminLayout title="Recycle Bin | DevEngine Admin">
      <Head>
        <title>Recycle Bin & Recovery Vault | DevEngine Admin</title>
      </Head>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8 text-white space-y-7">
        {/* ── HEADER BAR ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-[11px] font-semibold tracking-wider text-rose-400 uppercase bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                System Recovery Vault
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                Soft-Delete Protection Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Recycle Bin
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Recover deleted orders, lab projects, and CMS records anytime or permanently purge them.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadBin}
              className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>Refresh</span>
            </button>

            {binItems.length > 0 && (
              <button
                onClick={() => setEmptyBinModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>Empty Entire Bin</span>
              </button>
            )}

            <Link
              href="/admin/dashboard"
              className="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-teal-500/10"
            >
              <span>Dashboard</span>
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
            </Link>
          </div>
        </div>

        {/* ── NOTIFICATION NOTICE ── */}
        {notice && (
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
              notice.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                {notice.type === "success" ? "check_circle" : "error"}
              </span>
              <span>{notice.message}</span>
            </div>
            <button
              onClick={() => setNotice(null)}
              className="text-gray-400 hover:text-white text-xs px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── COUNTER CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Total in Bin
                </span>
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">delete</span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                {binItems.length}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-rose-400 font-semibold">Items Held</span>
              <span className="text-gray-500">Recoverable anytime</span>
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Orders in Bin
                </span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                {orderBinCount}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-amber-400 font-semibold">Transactions</span>
              <span className="text-gray-500">Soft-deleted orders</span>
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Projects & Lab
                </span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">science</span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                {projectBinCount}
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-blue-400 font-semibold">Experiments & Code</span>
              <span className="text-gray-500">Archive & Lab items</span>
            </div>
          </div>

          <div className="rounded-2xl p-5 sm:p-6 bg-gradient-to-b from-white/[0.05] to-white/[0.015] border border-white/[0.08] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Data Vault
                </span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[15px]">verified_user</span>
                </div>
              </div>
              <div className="my-3 sm:my-3.5 flex items-baseline text-3xl sm:text-4xl lg:text-[42px] font-black text-white tracking-tight leading-none">
                <span>100%</span>
                <span className="text-xs font-medium text-emerald-400 ml-2">Safe</span>
              </div>
            </div>
            <div className="pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] sm:text-[11px]">
              <span className="text-emerald-400 font-semibold">Zero Data Loss</span>
              <span className="text-gray-500">Instant restoration</span>
            </div>
          </div>
        </div>

        {/* ── BATCH ACTION BAR (WHEN ITEMS ARE SELECTED) ── */}
        {selectedIds.size > 0 && (
          <div className="rounded-2xl p-4 bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 text-xs text-teal-300">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="font-bold">
                {selectedIds.size} of {filteredItems.length} item(s) selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchRestore}
                disabled={actionLoading === "batch-restore"}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">restore_from_trash</span>
                <span>Recover Selected ({selectedIds.size})</span>
              </button>

              <button
                onClick={handleBatchPurge}
                disabled={actionLoading === "batch-purge"}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>Delete Permanently ({selectedIds.size})</span>
              </button>

              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-400 hover:text-white text-xs font-medium transition cursor-pointer"
              >
                Deselect
              </button>
            </div>
          </div>
        )}

        {/* ── SEARCH & FILTER CONTROLS ── */}
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
              placeholder="Search items by title, ID, or source collection..."
              className="w-full h-10 bg-black/40 border border-white/[0.08] focus:border-rose-400/50 rounded-xl pl-9 pr-8 text-xs text-white placeholder-gray-500 focus:outline-none transition font-sans"
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

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-0.5">
            {[
              { id: "ALL", label: "All Items", count: binItems.length },
              { id: "Order", label: "Orders", count: orderBinCount },
              { id: "Lab Project", label: "Lab", count: binItems.filter((i) => i.itemType === "Lab Project").length },
              { id: "Project", label: "Projects", count: binItems.filter((i) => i.itemType === "Project").length },
            ].map((tab) => {
              const active = typeFilter.toLowerCase() === tab.id.toLowerCase();
              return (
                <button
                  key={tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={`h-10 px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    active
                      ? "bg-rose-500 text-white shadow-md shadow-rose-500/20"
                      : "bg-white/[0.03] hover:bg-white/[0.07] text-gray-400 hover:text-white border border-white/[0.06]"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      active ? "bg-black/20 text-white" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── BIN TABLE ── */}
        {loading ? (
          <div className="py-24 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.07]">
            <HelixLoader size={40} color="#14b8a6" />
            <p className="mt-3 font-mono text-xs text-gray-400">Inspecting Recycle Bin…</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-24 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.07] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-gray-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">auto_delete</span>
            </div>
            <p className="text-lg font-bold text-white tracking-tight">
              Recycle Bin is Empty
            </p>
            <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
              When you delete items from Orders, Lab, Services, or Projects, they are safely stored here so you can restore them anytime.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0c0c16] border border-white/[0.07] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] uppercase font-bold tracking-wider text-gray-400">
                    <th className="py-3.5 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-gray-700 bg-black/40 text-teal-500 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Item Details</th>
                    <th className="py-3.5 px-4 w-36">Item Type</th>
                    <th className="py-3.5 px-4 w-44">Source Module</th>
                    <th className="py-3.5 px-4 w-44">Deleted Timestamp</th>
                    <th className="py-3.5 px-4 text-right w-52">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-xs">
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isSelected ? "bg-teal-500/[0.04]" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded border-gray-700 bg-black/40 text-teal-500 focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Title & Original ID */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-white truncate max-w-[280px]">
                            {item.itemTitle}
                          </div>
                          <div className="font-mono text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                            <span>ID: {item.originalId}</span>
                            <span>•</span>
                            <span>By: {item.deletedBy}</span>
                          </div>
                        </td>

                        {/* Item Type */}
                        <td className="py-4 px-4">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            {item.itemType}
                          </span>
                        </td>

                        {/* Source Collection */}
                        <td className="py-4 px-4">
                          <code className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.08] text-gray-300 font-mono text-[11px]">
                            /{item.originalCollection}
                          </code>
                        </td>

                        {/* Deleted Date */}
                        <td className="py-4 px-4 text-gray-400 text-[11px]">
                          {item.deletedAt?.toDate
                            ? item.deletedAt.toDate().toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Recently"}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Inspect Payload */}
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white text-xs font-medium border border-white/[0.08] transition cursor-pointer"
                            >
                              Inspect
                            </button>

                            {/* Recover */}
                            <button
                              type="button"
                              onClick={() => handleRestoreSingle(item)}
                              disabled={actionLoading === item.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                restore_from_trash
                              </span>
                              <span>Recover</span>
                            </button>

                            {/* Purge */}
                            <button
                              type="button"
                              onClick={() => setPurgeTarget(item)}
                              disabled={actionLoading === item.id}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition cursor-pointer"
                              title="Delete Permanently"
                            >
                              <span className="material-symbols-outlined text-[17px]">
                                delete_forever
                              </span>
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

      {/* ── INSPECT PAYLOAD MODAL ── */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-[#0c0c16] border border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest bg-teal-400/10 px-2 py-0.5 rounded border border-teal-400/20">
                  RECOVERY INSPECTOR
                </span>
                <span className="text-gray-500">•</span>
                <code className="text-xs text-white font-mono">{previewItem.originalId}</code>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {previewItem.itemTitle}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto themed-scroll bg-black/50 p-4 rounded-2xl border border-white/[0.06]">
              <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(previewItem.data, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const it = previewItem;
                  setPreviewItem(null);
                  handleRestoreSingle(it);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <span className="material-symbols-outlined text-[16px]">restore_from_trash</span>
                <span>Recover Item</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SINGLE ITEM PERMANENT PURGE MODAL ── */}
      {purgeTarget && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0c0c16] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-rose-950/40 text-center space-y-4">
            <button
              onClick={() => setPurgeTarget(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Delete Permanently?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                This will permanently purge <strong className="text-white">&quot;{purgeTarget.itemTitle}&quot;</strong> from the database. It cannot be recovered again.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPurgeTarget(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeSingle}
                disabled={actionLoading === purgeTarget.id}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>{actionLoading === purgeTarget.id ? "Purging..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EMPTY BIN MODAL ── */}
      {emptyBinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#0c0c16] border border-rose-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-rose-950/40 text-center space-y-4">
            <button
              onClick={() => setEmptyBinModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              ✕
            </button>

            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">delete_sweep</span>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Empty Entire Recycle Bin?
              </h3>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                You are about to permanently purge all <strong className="text-white">{binItems.length} item(s)</strong> currently stored in the Recycle Bin. This action is irreversible.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEmptyBinModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white text-xs font-semibold border border-white/[0.08] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmptyBin}
                disabled={actionLoading === "empty-bin"}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/25 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                <span>{actionLoading === "empty-bin" ? "Emptying..." : "Yes, Empty Bin"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
