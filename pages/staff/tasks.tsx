import Head from "next/head";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getStaffByUid } from "@/lib/services/staffService";
import {
  getEmployeeTasks,
  updateEmployeeTask,
} from "@/lib/services/employeeTaskService";
import StaffLayout from "@/components/StaffLayout";
import HelixLoader from "@/components/HelixLoader";
import type { StaffMember } from "@/types/staff";
import type {
  EmployeeTask,
  TaskPriority,
  TaskStatus,
} from "@/types/staffEcoSystem";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/types/staffEcoSystem";

export default function StaffTasksPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [staffData, setStaffData] = useState<StaffMember | null>(null);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Update Task Modal
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [editSubmissionUrl, setEditSubmissionUrl] = useState("");
  const [editActualHours, setEditActualHours] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  const fetchTasks = async (staffId: string) => {
    try {
      setLoading(true);
      const data = await getEmployeeTasks(staffId);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setLoading(false);
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
      await fetchTasks(staff.id);
      setAuthReady(true);
    });
    return () => unsub();
  }, [router]);

  // Open modal
  const handleOpenEdit = (task: EmployeeTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditProgress(task.progressPercent || 0);
    setEditNotes(task.employeeNotes || "");
    setEditSubmissionUrl(task.submissionUrl || "");
    setEditActualHours(task.actualHours || 0);
    setUpdateSuccess(false);
  };

  // Submit update
  const handleSaveUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setIsUpdating(true);
    try {
      await updateEmployeeTask(selectedTask.id, {
        status: editStatus,
        progressPercent: Number(editProgress),
        employeeNotes: editNotes,
        submissionUrl: editSubmissionUrl,
        actualHours: Number(editActualHours) || 0,
      });

      setUpdateSuccess(true);
      // Refresh local state
      if (staffData) {
        await fetchTasks(staffData.id);
      }
      setTimeout(() => {
        setSelectedTask(null);
        setUpdateSuccess(false);
      }, 1000);
    } catch (err) {
      console.error("Failed to update task:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = t.title.toLowerCase().includes(q);
        const inDesc = t.description?.toLowerCase().includes(q);
        const inCategory = t.category?.toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inCategory) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const inReview = tasks.filter((t) => t.status === "in_review").length;
    const todo = tasks.filter((t) => t.status === "todo").length;

    const todayStr = new Date().toISOString().split("T")[0];
    const overdue = tasks.filter(
      (t) => t.status !== "completed" && t.dueDate && t.dueDate < todayStr
    ).length;

    return {
      total,
      completed,
      inProgress,
      inReview,
      todo,
      overdue,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [tasks]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#a855f7" />
      </div>
    );
  }

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "urgent":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "high":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "normal":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "low":
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_progress":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "in_review":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "blocked":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "todo":
      default:
        return "bg-white/5 text-neutral-300 border-white/10";
    }
  };

  return (
    <StaffLayout title="Tasks & Deadlines | Employee Portal">
      <Head>
        <title>Tasks & Deadlines | DevEngine Portal</title>
      </Head>

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">assignment</span>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                My Assigned Tasks
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Review assigned sprints, mark progress, log actual hours, and submit work deliverables
            </p>
          </div>

          <button
            onClick={() => staffData && fetchTasks(staffData.id)}
            disabled={loading}
            className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-medium text-neutral-200 transition-all flex items-center gap-1.5"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
            <span>Refresh Tasks</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">Total Tasks</span>
            <span className="text-xl font-bold text-white mt-1 block">{stats.total}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">In Progress</span>
            <span className="text-xl font-bold text-cyan-400 mt-1 block">{stats.inProgress}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">In Review</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">{stats.inReview}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">Completed</span>
            <span className="text-xl font-bold text-emerald-400 mt-1 block">{stats.completed}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">Overdue</span>
            <span className="text-xl font-bold text-rose-400 mt-1 block">{stats.overdue}</span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-white/5 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-neutral-400 block">Completion Rate</span>
            <span className="text-xl font-bold text-emerald-300 mt-1 block">{stats.rate}%</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 rounded-2xl bg-neutral-900/40 border border-white/5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5 text-xs">
            {["all", "todo", "in_progress", "in_review", "completed"].map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  statusFilter === tab
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {tab === "all" ? "All Tasks" : tab.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search and Priority Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined text-[16px] text-neutral-400 absolute left-2.5 top-2.5">
                search
              </span>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 w-48 sm:w-60"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-300 focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Tasks List */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <HelixLoader size={36} color="#a855f7" />
            <p className="text-xs text-neutral-400">Loading assigned tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center rounded-2xl bg-neutral-900/30 border border-white/5 p-8">
            <span className="material-symbols-outlined text-4xl text-neutral-600 block mb-2">
              task_alt
            </span>
            <h3 className="text-sm font-semibold text-white">No tasks found</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
              {tasks.length === 0
                ? "You currently have no tasks assigned by the administrator."
                : "No tasks matched your current filter criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => {
              const todayStr = new Date().toISOString().split("T")[0];
              const isOverdue =
                task.status !== "completed" && task.dueDate && task.dueDate < todayStr;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5 backdrop-blur-sm flex flex-col justify-between hover:border-white/20 transition-all duration-200"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${getPriorityBadge(
                            task.priority
                          )}`}
                        >
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 border border-white/10 text-neutral-400">
                            {task.category}
                          </span>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium border ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="mt-3">
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-xs text-neutral-400 mt-1.5 line-clamp-3 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Due Date & Assignment info */}
                    <div className="mt-4 space-y-1.5 text-xs text-neutral-400">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-[11px]">
                          <span className="material-symbols-outlined text-[14px]">event</span>
                          <span>Deadline:</span>
                        </span>
                        <span
                          className={`font-medium ${
                            isOverdue ? "text-rose-400 font-bold" : "text-neutral-200"
                          }`}
                        >
                          {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ""}
                          {isOverdue && " (Overdue)"}
                        </span>
                      </div>

                      {task.estimatedHours ? (
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Est. / Logged Hours:</span>
                          <span className="text-neutral-300">
                            {task.actualHours || 0}h / {task.estimatedHours}h
                          </span>
                        </div>
                      ) : null}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
                        <span>Progress</span>
                        <span className="font-semibold text-white">{task.progressPercent || 0}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, task.progressPercent || 0)}%` }}
                        />
                      </div>
                    </div>

                    {/* Admin Feedback banner if present */}
                    {task.adminFeedback && (
                      <div className="mt-3 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                        <span className="font-semibold block text-[10px] uppercase tracking-wider text-purple-400">
                          Admin Feedback:
                        </span>
                        <p className="mt-0.5 text-[11px] leading-relaxed">
                          {task.adminFeedback}
                        </p>
                      </div>
                    )}

                    {/* Employee submission link preview */}
                    {task.submissionUrl && (
                      <div className="mt-2.5 text-xs">
                        <a
                          href={task.submissionUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-cyan-400 hover:underline text-[11px]"
                        >
                          <span className="material-symbols-outlined text-[13px]">link</span>
                          <span>View Deliverable Link</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="mt-5 pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleOpenEdit(task)}
                      className="w-full py-2 px-3 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600/30 text-purple-300 font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      <span>Update Status & Progress</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Update Task Modal */}
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl p-6 relative">
              <button
                onClick={() => setSelectedTask(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-center gap-2 mb-4">
                <span className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">task</span>
                </span>
                <h3 className="text-base font-bold text-white">Update Task Progress</h3>
              </div>

              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-semibold text-white">{selectedTask.title}</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Due: {selectedTask.dueDate} {selectedTask.dueTime ? `@ ${selectedTask.dueTime}` : ""}
                </p>
              </div>

              <form onSubmit={handleSaveUpdate} className="space-y-4">
                {/* Status Picker */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1.5">
                    Current Status
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["todo", "in_progress", "in_review", "completed", "blocked"] as TaskStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setEditStatus(st);
                            if (st === "completed" && editProgress < 100) {
                              setEditProgress(100);
                            }
                          }}
                          className={`py-2 px-2.5 rounded-xl text-xs font-medium border text-center transition-all ${
                            editStatus === st
                              ? "bg-purple-600 text-white border-purple-500 shadow-md"
                              : "bg-black/30 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {TASK_STATUS_LABELS[st]}
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Progress Slider */}
                <div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5">
                    <span>Progress:</span>
                    <span className="font-bold text-cyan-400">{editProgress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Number(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                {/* Actual Hours Logged */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Actual Hours Worked on this Task
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editActualHours}
                    onChange={(e) => setEditActualHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                    placeholder="e.g. 4.5"
                  />
                </div>

                {/* Progress Notes */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Employee Notes & Updates (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Describe what you worked on, changes made, or current blockers..."
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Submission / Deliverable Link */}
                <div>
                  <label className="text-xs font-medium text-neutral-300 block mb-1">
                    Deliverable URL / Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={editSubmissionUrl}
                    onChange={(e) => setEditSubmissionUrl(e.target.value)}
                    placeholder="https://github.com/.../pull/12 or Figma / Google Drive link"
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
                  />
                </div>

                {updateSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
                    Task progress updated successfully!
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-neutral-300 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white transition-all disabled:opacity-50"
                  >
                    {isUpdating ? "Saving..." : "Save Updates"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </StaffLayout>
  );
}
