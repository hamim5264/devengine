import Head from "next/head";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { getStaffMembers } from "@/lib/services/staffService";
import {
  getAllLeaveRequests,
  reviewLeaveRequest,
} from "@/lib/services/staffEcoService";
import type { StaffMember } from "@/types/staff";
import type { LeaveRequest, LeaveRequestStatus } from "@/types/staffEcoSystem";
import { LEAVE_TYPE_LABELS } from "@/types/staffEcoSystem";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

export default function ManageLeavesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");

  // Review modal
  const [reviewingLeave, setReviewingLeave] = useState<LeaveRequest | null>(null);
  const [adminRemark, setAdminRemark] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    try {
      const [staff, allLeaves] = await Promise.all([
        getStaffMembers(),
        getAllLeaveRequests(),
      ]);
      setStaffList(staff);
      setLeaves(allLeaves);
    } catch (err) {
      console.error("Error loading leaves data:", err);
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
      setAdminUser(user);
      await loadData();
      setAuthReady(true);
    });
    return () => unsub();
  }, [router, loadData]);

  const handleReviewAction = async (decision: "approved" | "rejected") => {
    if (!reviewingLeave || !adminUser) return;
    setIsProcessing(true);
    try {
      await reviewLeaveRequest({
        leaveId: reviewingLeave.id,
        decision,
        adminRemark,
        adminEmail: adminUser.email,
      });

      // Update state locally
      setLeaves((prev) =>
        prev.map((l) =>
          l.id === reviewingLeave.id
            ? {
                ...l,
                status: decision as LeaveRequestStatus,
                adminRemark,
                reviewedBy: adminUser.email,
                reviewedAt: new Date().toISOString(),
              }
            : l
        )
      );
      setReviewingLeave(null);
      setAdminRemark("");
    } catch (err) {
      console.error("Leave review error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const rejectedLeaves = leaves.filter((l) => l.status === "rejected");

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (staffFilter !== "all") {
      const staffObj = staffList.find((s) => s.id === staffFilter);
      const matches =
        l.staffId === staffFilter ||
        (staffObj && (l.staffId === staffObj.uid || l.staffUid === staffObj.uid || l.staffEmail?.toLowerCase() === staffObj.email?.toLowerCase()));
      if (!matches) return false;
    }
    return true;
  });

  return (
    <AdminLayout title="Employee Leave Requests | Admin">
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
                Employee Leave Management
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Review employee absence applications, authorize planned leaves, and track time-off balances.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-400" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isRefreshing ? "Syncing..." : "Sync Leaves"}</span>
              </button>
            </div>
          </div>

          {/* ── Stats Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Applications
              </span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {leaves.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block">
                Pending Review
              </span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-1 block">
                {pendingLeaves.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">
                Approved
              </span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-1 block">
                {approvedLeaves.length}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
              <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block">
                Rejected
              </span>
              <span className="text-xl font-bold font-mono text-rose-300 mt-1 block">
                {rejectedLeaves.length}
              </span>
            </div>
          </div>

          {/* ── Filters ── */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all" className="bg-[#0e0e1a] text-white">All Statuses</option>
                  <option value="pending" className="bg-[#0e0e1a] text-white">Pending ({pendingLeaves.length})</option>
                  <option value="approved" className="bg-[#0e0e1a] text-white">Approved ({approvedLeaves.length})</option>
                  <option value="rejected" className="bg-[#0e0e1a] text-white">Rejected ({rejectedLeaves.length})</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                  Employee:
                </label>
                <select
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                  className="h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all" className="bg-[#0e0e1a] text-white">All Employees</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0e0e1a] text-white">
                      {s.name} ({s.staffType})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div className="rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/[0.06] text-gray-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date Range</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 font-mono">
                        No leave applications match the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-white block">{l.staffName}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{l.staffEmail}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-amber-300">
                          {LEAVE_TYPE_LABELS[l.leaveType] || l.leaveType}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-300 whitespace-nowrap">
                          {l.startDate} → {l.endDate}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-cyan-400">
                          {l.totalDays} {l.totalDays === 1 ? "day" : "days"}
                        </td>
                        <td className="py-3.5 px-4 text-gray-300 max-w-xs truncate">
                          {l.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          {l.status === "approved" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              Approved
                            </span>
                          ) : l.status === "rejected" ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Pending Review
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {l.status === "pending" ? (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingLeave(l);
                                setAdminRemark("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[11px] block max-w-xs truncate">
                              {l.adminRemark || "No remarks"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* ── Review Modal ── */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                Review Leave Application
              </h3>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <p className="text-gray-400">
                  <span className="text-gray-500">Applicant:</span> {reviewingLeave.staffName} (
                  {reviewingLeave.staffEmail})
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Leave Type:</span>{" "}
                  <strong className="text-white font-mono">
                    {LEAVE_TYPE_LABELS[reviewingLeave.leaveType] || reviewingLeave.leaveType}
                  </strong>
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Period:</span>{" "}
                  {reviewingLeave.startDate} to {reviewingLeave.endDate} ({reviewingLeave.totalDays} days)
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">Reason:</span> "{reviewingLeave.reason}"
                </p>
                {reviewingLeave.emergencyContact && (
                  <p className="text-gray-400">
                    <span className="text-gray-500">Emergency Phone:</span>{" "}
                    {reviewingLeave.emergencyContact}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Administrator Remarks / Explanation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Approved. Please hand over pending tasks."
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleReviewAction("rejected")}
                  className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleReviewAction("approved")}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  Approve Leave
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
