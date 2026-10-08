import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getTodayDateString,
  getStaffWorkUpdates,
  submitDailyWorkUpdate,
} from "@/lib/services/staffEcoService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type { DailyWorkUpdate } from "@/types/staffEcoSystem";

export default function StaffWorkUpdatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);

  const [workUpdates, setWorkUpdates] = useState<DailyWorkUpdate[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Editor Modal
  const [showEditor, setShowEditor] = useState(false);
  const [editDate, setEditDate] = useState(getTodayDateString());
  const [form, setForm] = useState({
    tasksCompleted: "",
    tasksInProgress: "",
    blockers: "",
    hoursWorked: 8,
    projectLinks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadUpdates = async (staff: StaffMember) => {
    try {
      const updates = await getStaffWorkUpdates(staff.id, 50);
      setWorkUpdates(updates);

      // Check if today already has an update
      const today = getTodayDateString();
      const todayUpdate = updates.find((u) => u.date === today);
      if (todayUpdate) {
        setForm({
          tasksCompleted: todayUpdate.tasksCompleted || "",
          tasksInProgress: todayUpdate.tasksInProgress || "",
          blockers: todayUpdate.blockers || "",
          hoursWorked: todayUpdate.hoursWorked || 8,
          projectLinks: todayUpdate.projectLinks || "",
        });
      }
    } catch (err) {
      console.error("Error loading work updates:", err);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/staff");
        return;
      }
      const staff = await getStaffByUid(user.uid);
      if (!staff || staff.status !== "active") {
        router.replace("/staff");
        return;
      }
      setStaffData(staff);
      await loadUpdates(staff);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  const handleOpenEditor = (targetDate: string = getTodayDateString()) => {
    setEditDate(targetDate);
    const existing = workUpdates.find((u) => u.date === targetDate);
    if (existing) {
      setForm({
        tasksCompleted: existing.tasksCompleted || "",
        tasksInProgress: existing.tasksInProgress || "",
        blockers: existing.blockers || "",
        hoursWorked: existing.hoursWorked || 8,
        projectLinks: existing.projectLinks || "",
      });
    } else {
      setForm({
        tasksCompleted: "",
        tasksInProgress: "",
        blockers: "",
        hoursWorked: 8,
        projectLinks: "",
      });
    }
    setShowEditor(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffData || !form.tasksCompleted.trim()) return;
    setIsSubmitting(true);
    setSuccessMsg("");
    try {
      const updated = await submitDailyWorkUpdate({
        staffId: staffData.id,
        staffUid: staffData.uid,
        staffName: staffData.name,
        staffEmail: staffData.email,
        staffType: staffData.staffType,
        date: editDate,
        tasksCompleted: form.tasksCompleted,
        tasksInProgress: form.tasksInProgress,
        blockers: form.blockers,
        hoursWorked: Number(form.hoursWorked) || 0,
        projectLinks: form.projectLinks,
      });

      setWorkUpdates((prev) => {
        const filtered = prev.filter((u) => u.id !== updated.id);
        return [updated, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });

      setSuccessMsg("Daily work update saved successfully!");
      setTimeout(() => {
        setShowEditor(false);
        setSuccessMsg("");
      }, 1200);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authReady || !staffData) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const today = getTodayDateString();
  const todayEntry = workUpdates.find((u) => u.date === today);
  const totalHoursLogged = workUpdates.reduce((sum, u) => sum + (u.hoursWorked || 0), 0);

  const filteredUpdates = workUpdates.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.date.includes(q) ||
      u.tasksCompleted.toLowerCase().includes(q) ||
      (u.tasksInProgress && u.tasksInProgress.toLowerCase().includes(q)) ||
      (u.blockers && u.blockers.toLowerCase().includes(q))
    );
  });

  return (
    <StaffLayout title="Daily Work Updates | Employee Portal">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-6xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                Daily Work Updates
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Keep the administration and engineering leads updated with your daily output and tasks.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenEditor(today)}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold transition-all shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2 cursor-pointer w-fit"
            >
              <span className="material-symbols-outlined text-base">
                {todayEntry ? "edit" : "add_task"}
              </span>
              {todayEntry ? "Edit Today's Report" : "Submit Today's Report"}
            </button>
          </div>

          {/* ── Today's Banner ── */}
          <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-2xl">assignment_turned_in</span>
              </div>
              <div>
                <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block">
                  Today's Status ({today})
                </span>
                <div className="flex items-center gap-3 mt-1">
                  {todayEntry ? (
                    <span className="text-base font-bold font-mono text-cyan-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      Report Logged ({todayEntry.hoursWorked} hrs)
                    </span>
                  ) : (
                    <span className="text-base font-bold font-mono text-amber-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      Pending Report Submission
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-gray-400 block text-[10px] uppercase">Total Logs</span>
                <span className="text-white font-bold text-base">{workUpdates.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center">
                <span className="text-cyan-400 block text-[10px] uppercase">Hours Logged</span>
                <span className="text-cyan-300 font-bold text-base">{totalHoursLogged}h</span>
              </div>
            </div>
          </div>

          {/* ── Search Bar ── */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search tasks, dates, blockers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 bg-[#0c0c16]/95 border border-white/[0.08] rounded-xl pl-10 pr-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* ── Timeline of Submissions ── */}
          <div className="space-y-4">
            {filteredUpdates.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08]">
                <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">
                  description
                </span>
                <p className="text-sm text-gray-400 font-medium">No work updates match your query.</p>
                <p className="text-xs text-gray-600 mt-1">Submit your daily reports to track progress.</p>
              </div>
            ) : (
              filteredUpdates.map((update) => (
                <div
                  key={update.id}
                  className="p-5 sm:p-6 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-4 relative"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold font-mono text-white">
                        {update.date}
                      </span>
                      {update.date === today && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          Today
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/20">
                        {update.hoursWorked} Hours
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleOpenEditor(update.date)}
                        className="text-xs font-mono text-gray-400 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-xs">edit</span>
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Tasks Completed */}
                  <div>
                    <h4 className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 block mb-1.5">
                      Tasks Completed
                    </h4>
                    <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-mono bg-black/20 p-3 rounded-xl border border-white/[0.03]">
                      {update.tasksCompleted}
                    </p>
                  </div>

                  {/* In Progress & Blockers */}
                  {(update.tasksInProgress || update.blockers) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {update.tasksInProgress && (
                        <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-[10px] font-mono uppercase text-gray-400 block mb-1">
                            In Progress / Next
                          </span>
                          <p className="text-gray-300">{update.tasksInProgress}</p>
                        </div>
                      )}
                      {update.blockers && (
                        <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15">
                          <span className="text-[10px] font-mono uppercase text-rose-400 block mb-1">
                            Blockers
                          </span>
                          <p className="text-rose-200">{update.blockers}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Links */}
                  {update.projectLinks && (
                    <div className="text-xs font-mono">
                      <span className="text-gray-500 text-[10px] uppercase block mb-1">Related Links:</span>
                      <a
                        href={update.projectLinks.startsWith("http") ? update.projectLinks : `https://${update.projectLinks}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline truncate block"
                      >
                        {update.projectLinks}
                      </a>
                    </div>
                  )}

                  {/* Admin Feedback */}
                  {update.adminFeedback && (
                    <div className="p-3.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-violet-500/20 text-xs text-violet-200">
                      <div className="flex items-center gap-1.5 text-violet-400 font-semibold mb-1">
                        <span className="material-symbols-outlined text-sm">chat</span>
                        Administrator Feedback
                      </div>
                      <p>{update.adminFeedback}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </main>
      </div>

      {/* ── Editor Modal ── */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl bg-[#0e0e1a] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-base">edit_note</span>
                </div>
                <h3 className="text-base font-bold text-white font-['Space_Grotesk']">
                  Work Update for {editDate}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditor(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Tasks Completed *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="• Fixed auth issue&#10;• Deployed staging build&#10;• Tested API endpoints"
                  value={form.tasksCompleted}
                  onChange={(e) => setForm({ ...form, tasksCompleted: e.target.value })}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Tasks In Progress / Next Up
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Preparing release notes"
                    value={form.tasksInProgress}
                    onChange={(e) => setForm({ ...form, tasksInProgress: e.target.value })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Hours Worked
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    value={form.hoursWorked}
                    onChange={(e) => setForm({ ...form, hoursWorked: parseFloat(e.target.value) || 0 })}
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Blockers / Impediments (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Any blockers or pending approvals..."
                  value={form.blockers}
                  onChange={(e) => setForm({ ...form, blockers: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Project / PR / Figma Links (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/..."
                  value={form.projectLinks}
                  onChange={(e) => setForm({ ...form, projectLinks: e.target.value })}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono text-xs"
                />
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                  {successMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Daily Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
}
