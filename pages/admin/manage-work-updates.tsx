import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { getStaffMembers } from "@/lib/services/staffService";
import {
  getAllWorkUpdates,
  addAdminFeedbackToWorkUpdate,
} from "@/lib/services/staffEcoService";
import type { StaffMember } from "@/types/staff";
import type { DailyWorkUpdate } from "@/types/staffEcoSystem";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageWorkUpdatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [updates, setUpdates] = useState<DailyWorkUpdate[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Feedback modal
  const [activeUpdate, setActiveUpdate] = useState<DailyWorkUpdate | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (staffIdFilter?: string, dateFilter?: string, forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    try {
      const staff = await getStaffMembers();
      setStaffList(staff);

      const params: any = {};
      if (staffIdFilter && staffIdFilter !== "all") params.staffId = staffIdFilter;
      if (dateFilter) params.date = dateFilter;

      const data = await getAllWorkUpdates(params);
      setUpdates(data);
    } catch (err) {
      console.error("Error loading work updates:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/admin/login");
        return;
      }
      await loadData();
      setAuthReady(true);
    });
    return () => unsub();
  }, [router, loadData]);

  const handleFilterChange = async (staffId: string, date: string) => {
    setSelectedStaffId(staffId);
    setSelectedDate(date);
    await loadData(staffId, date);
  };

  const handleOpenFeedback = (item: DailyWorkUpdate) => {
    setActiveUpdate(item);
    setFeedbackText(item.adminFeedback || "");
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUpdate) return;
    setIsSubmittingFeedback(true);
    try {
      await addAdminFeedbackToWorkUpdate(activeUpdate.id, feedbackText);
      setUpdates((prev) =>
        prev.map((u) =>
          u.id === activeUpdate.id
            ? { ...u, adminFeedback: feedbackText, reviewedByAdmin: true }
            : u
        )
      );
      setActiveUpdate(null);
    } catch (err) {
      console.error("Failed to add feedback:", err);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const totalHours = updates.reduce((sum, u) => sum + (u.hoursWorked || 0), 0);
  const reviewedCount = updates.filter((u) => u.reviewedByAdmin).length;

  return (
    <AdminLayout title="Staff Work Updates | Admin">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                Staff Daily Work Updates
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Monitor engineering task progression, track logged hours, and provide feedback.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadData(selectedStaffId, selectedDate, true)}
                disabled={isRefreshing}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-400" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isRefreshing ? "Syncing..." : "Sync Updates"}</span>
              </button>
            </div>
          </div>

          {/* ── Stats Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Reports
              </span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {updates.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                Total Hours Logged
              </span>
              <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                {totalHours}h
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Reviewed Reports
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                {reviewedCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Pending Feedback
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {updates.length - reviewedCount}
              </span>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                  Filter by Staff:
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => handleFilterChange(e.target.value, selectedDate)}
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="all" className="bg-[#0e0e1a] text-white">All Staff Members</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0e0e1a] text-white">
                      {s.name} ({s.staffType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                  Filter by Date:
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleFilterChange(selectedStaffId, e.target.value)}
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {selectedDate && (
                <button
                  type="button"
                  onClick={() => handleFilterChange(selectedStaffId, "")}
                  className="mt-5 text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* ── Updates Feed ── */}
          <div className="space-y-4">
            {updates.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
                <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">
                  description
                </span>
                <p className="text-sm text-gray-400 font-medium">No work updates found matching filters.</p>
              </div>
            ) : (
              updates.map((item) => (
                <div
                  key={item.id}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                        {item.staffName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{item.staffName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-gray-400">
                            {item.staffType}
                          </span>
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono">{item.staffEmail}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-white px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08]">
                        {item.date}
                      </span>
                      <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        {item.hoursWorked} hrs
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenFeedback(item)}
                        className="py-1.5 px-3 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm text-cyan-400">chat</span>
                        {item.adminFeedback ? "Edit Feedback" : "Add Feedback"}
                      </button>
                    </div>
                  </div>

                  {/* Tasks Completed */}
                  <div>
                    <span className="text-[10px] font-mono uppercase text-cyan-400 block mb-1 tracking-wider">
                      Tasks Completed
                    </span>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-black/20 p-3 rounded-xl border border-white/[0.03]">
                      {item.tasksCompleted}
                    </p>
                  </div>

                  {/* In progress & Blockers */}
                  {(item.tasksInProgress || item.blockers) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {item.tasksInProgress && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
                            In Progress / Next
                          </span>
                          <p className="text-gray-300">{item.tasksInProgress}</p>
                        </div>
                      )}
                      {item.blockers && (
                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                          <span className="text-[10px] font-mono uppercase text-rose-400 block mb-1">
                            Blockers Reported
                          </span>
                          <p className="text-rose-200">{item.blockers}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  {item.projectLinks && (
                    <div className="text-xs font-mono">
                      <span className="text-gray-500 text-[10px] uppercase block mb-1">Submitted Links:</span>
                      <a
                        href={item.projectLinks.startsWith("http") ? item.projectLinks : `https://${item.projectLinks}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline truncate block"
                      >
                        {item.projectLinks}
                      </a>
                    </div>
                  )}

                  {/* Existing Admin Feedback */}
                  {item.adminFeedback && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs text-violet-200">
                      <div className="flex items-center gap-1.5 text-violet-400 font-semibold mb-1">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        Administrator Feedback Given:
                      </div>
                      <p>{item.adminFeedback}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* ── Feedback Modal ── */}
      {activeUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Provide Feedback to {activeUpdate.staffName}
              </h3>
              <button
                type="button"
                onClick={() => setActiveUpdate(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveFeedback} className="mt-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-gray-300">
                <span className="text-gray-500 block text-[10px] uppercase font-mono">Report Date:</span>
                <span className="font-mono text-cyan-300">{activeUpdate.date} ({activeUpdate.hoursWorked} hrs)</span>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Administrator Remarks / Review Feedback
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Great progress on the API integration. Please coordinate with Design for the final assets."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setActiveUpdate(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingFeedback}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingFeedback ? "Saving..." : "Save Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
