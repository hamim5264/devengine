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

  // Live timer tick
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Update Task Modal
  const [selectedTask, setSelectedTask] = useState<EmployeeTask | null>(null);
  const [viewingTask, setViewingTask] = useState<EmployeeTask | null>(null);
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null);

  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editNotes, setEditNotes] = useState("");
  const [editSubmissionUrl, setEditSubmissionUrl] = useState("");
  const [editActualHours, setEditActualHours] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Time & Status Calculation Helper
  const parseTaskDateTime = (dateStr?: string, timeStr?: string, defaultTime: string = "00:00") => {
    if (!dateStr) return null;
    const time = timeStr && timeStr.trim() ? timeStr : defaultTime;
    const d = new Date(`${dateStr}T${time}:00`);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatCountdown = (targetDate: Date, fromDate: Date) => {
    const diff = targetDate.getTime() - fromDate.getTime();
    if (diff <= 0) return "00:00:00";
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${hours.toString().padStart(2, "0")}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  };

  const formatOverdue = (targetDate: Date, fromDate: Date) => {
    const diff = fromDate.getTime() - targetDate.getTime();
    if (diff <= 0) return "Just now";
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }
    return `${hours}h ${minutes}m`;
  };

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

  // Handle Start Task Now
  const handleStartTask = async (task: EmployeeTask) => {
    try {
      setStartingTaskId(task.id);
      await updateEmployeeTask(task.id, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      });
      if (staffData) {
        await fetchTasks(staffData.id);
      }
    } catch (err) {
      console.error("Failed to start task:", err);
      alert("Failed to start task.");
    } finally {
      setStartingTaskId(null);
    }
  };

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
              const startDt = parseTaskDateTime(task.startDate || task.assignedDate, task.startTime, "09:00");
              const dueDt = parseTaskDateTime(task.dueDate, task.dueTime, "18:00");

              const isBeforeStart = Boolean(startDt && now < startDt && task.status !== "in_progress" && task.status !== "completed");
              const isReadyToStart = Boolean(startDt && now >= startDt && task.status === "todo");
              const isOverdue = Boolean(dueDt && now > dueDt && task.status !== "completed");

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl border p-5 backdrop-blur-sm flex flex-col justify-between transition-all duration-200 ${
                    isOverdue
                      ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/20"
                      : isBeforeStart
                      ? "border-amber-500/20 bg-neutral-900/60"
                      : "border-white/10 bg-neutral-900/60 hover:border-white/20"
                  }`}
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

                    {/* Schedule Timer Strips */}
                    {isBeforeStart && startDt && (
                      <div className="mt-3.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>Starts in:</span>
                          </span>
                          <span className="font-bold text-amber-200 font-mono tracking-wider">
                            {formatCountdown(startDt, now)}
                          </span>
                        </div>
                        <div className="text-[10px] text-amber-400/80 mt-1 flex items-center justify-between">
                          <span>Scheduled Start:</span>
                          <span className="font-medium text-amber-100">
                            {task.startDate || task.assignedDate} {task.startTime ? `@ ${task.startTime}` : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {isReadyToStart && (
                      <div className="mt-3.5 p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5 font-semibold text-cyan-300">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                          <span>Ready to Begin</span>
                        </span>
                        <span className="text-[10px] text-cyan-400/80 font-mono">Work Unlocked</span>
                      </div>
                    )}

                    {isOverdue && dueDt && (
                      <div className="mt-3.5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300">
                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            <span>OVERDUE BY:</span>
                          </span>
                          <span className="font-bold text-rose-100 font-mono tracking-wider">
                            {formatOverdue(dueDt, now)}
                          </span>
                        </div>
                        <div className="text-[10px] text-rose-300/80 mt-1 flex items-center justify-between">
                          <span>Deadline Was:</span>
                          <span className="font-semibold text-rose-200">
                            {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Timeline Info */}
                    <div className="mt-4 space-y-1.5 text-xs text-neutral-400">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="material-symbols-outlined text-[13px]">play_circle</span>
                          <span>Start:</span>
                        </span>
                        <span className="font-medium text-neutral-300">
                          {task.startDate || task.assignedDate} {task.startTime ? `@ ${task.startTime}` : ""}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1 text-gray-400">
                          <span className="material-symbols-outlined text-[13px]">event_busy</span>
                          <span>Deadline:</span>
                        </span>
                        <span
                          className={`font-medium ${
                            isOverdue ? "text-rose-400 font-bold" : "text-neutral-300"
                          }`}
                        >
                          {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ""}
                        </span>
                      </div>

                      {task.estimatedHours ? (
                        <div className="flex items-center justify-between text-[11px]">
                          <span>Est. / Logged Hours:</span>
                          <span className="text-neutral-300 font-mono">
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

                  {/* Action Buttons depending on timing state */}
                  <div className="mt-5 pt-3 border-t border-white/5">
                    {isBeforeStart ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingTask(task)}
                          className="w-full py-2.5 px-3 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-neutral-200 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px] text-cyan-400">visibility</span>
                          <span>View Task Details</span>
                        </button>
                        <div className="text-center text-[10px] text-amber-400/90 font-mono flex items-center justify-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">lock</span>
                          <span>Execution locked until start time</span>
                        </div>
                      </div>
                    ) : isReadyToStart ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartTask(task)}
                          disabled={startingTaskId === task.id}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                          <span>{startingTaskId === task.id ? "Starting..." : "Start Now"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingTask(task)}
                          title="View Details"
                          className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-neutral-300 text-xs transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                      </div>
                    ) : task.status === "completed" ? (
                      <button
                        type="button"
                        onClick={() => setViewingTask(task)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">task_alt</span>
                        <span>Completed • View Details</span>
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(task)}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-purple-600/25 border border-purple-500/30 hover:bg-purple-600/35 text-purple-200 font-medium text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit_note</span>
                          <span>Update Progress</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingTask(task)}
                          title="View Details"
                          className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-neutral-300 text-xs transition cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">visibility</span>
                        </button>
                      </div>
                    )}
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

        {/* View Task Details Modal (Available before task unlocks and anytime) */}
        {viewingTask && (() => {
          const vStartDt = parseTaskDateTime(viewingTask.startDate || viewingTask.assignedDate, viewingTask.startTime, "09:00");
          const vDueDt = parseTaskDateTime(viewingTask.dueDate, viewingTask.dueTime, "18:00");
          const vIsBeforeStart = Boolean(vStartDt && now < vStartDt && viewingTask.status !== "in_progress" && viewingTask.status !== "completed");
          const vIsReadyToStart = Boolean(vStartDt && now >= vStartDt && viewingTask.status === "todo");
          const vIsOverdue = Boolean(vDueDt && now > vDueDt && viewingTask.status !== "completed");

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/10 shadow-2xl p-6 sm:p-7 relative space-y-5 themed-scroll">
                <button
                  type="button"
                  onClick={() => setViewingTask(null)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>

                {/* Header */}
                <div className="flex items-start gap-3 pr-8">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                    <span className="material-symbols-outlined text-xl">description</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border ${getPriorityBadge(viewingTask.priority)}`}>
                        {TASK_PRIORITY_LABELS[viewingTask.priority]}
                      </span>
                      {viewingTask.category && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-white/5 border border-white/10 text-neutral-300">
                          {viewingTask.category}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${getStatusBadge(viewingTask.status)}`}>
                        {TASK_STATUS_LABELS[viewingTask.status]}
                      </span>
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-white mt-1.5 leading-snug">
                      {viewingTask.title}
                    </h2>
                  </div>
                </div>

                {/* Timing Status Banner */}
                {vIsBeforeStart && vStartDt && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>Execution Locked • Starts in:</span>
                      </span>
                      <span className="font-bold text-amber-100 font-mono tracking-wider text-sm">
                        {formatCountdown(vStartDt, now)}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-400/80">
                      You can read all work details and prepare. The &quot;Start Now&quot; button unlocks on {viewingTask.startDate || viewingTask.assignedDate} @ {viewingTask.startTime || "09:00"}.
                    </p>
                  </div>
                )}

                {vIsReadyToStart && (
                  <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span>Work is Unlocked & Ready!</span>
                      </span>
                      <p className="text-[10px] text-cyan-400/80 mt-0.5">
                        You can begin working right now. Click Start Now below.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleStartTask(viewingTask);
                        setViewingTask(null);
                      }}
                      disabled={startingTaskId === viewingTask.id}
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-lg shadow-cyan-500/25 transition cursor-pointer"
                    >
                      {startingTaskId === viewingTask.id ? "Starting..." : "Start Now"}
                    </button>
                  </div>
                )}

                {vIsOverdue && vDueDt && (
                  <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span>TASK OVERDUE BY:</span>
                      </span>
                      <span className="font-bold text-rose-100 font-mono tracking-wider text-sm">
                        {formatOverdue(vDueDt, now)}
                      </span>
                    </div>
                    <p className="text-[11px] text-rose-300/80">
                      The official deadline has passed ({viewingTask.dueDate} @ {viewingTask.dueTime || "18:00"}). Please update and complete deliverables as soon as possible.
                    </p>
                  </div>
                )}

                {/* Schedules & Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                      Start Schedule
                    </span>
                    <span className="text-xs font-bold text-white mt-1 block">
                      {viewingTask.startDate || viewingTask.assignedDate}
                    </span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      @ {viewingTask.startTime || "09:00"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                      Target Deadline
                    </span>
                    <span className={`text-xs font-bold mt-1 block ${vIsOverdue ? "text-rose-400" : "text-white"}`}>
                      {viewingTask.dueDate}
                    </span>
                    <span className="text-[10px] text-pink-400 font-mono">
                      @ {viewingTask.dueTime || "18:00"}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                      Estimated Hours
                    </span>
                    <span className="text-xs font-bold text-cyan-300 mt-1 block">
                      {viewingTask.estimatedHours || 0} Hours
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Logged: {viewingTask.actualHours || 0}h
                    </span>
                  </div>
                </div>

                {/* Detailed Scope */}
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
                    Scope of Work & Deliverables
                  </h4>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto font-sans">
                    {viewingTask.description || "No specific scope details provided. Please consult with your engineering lead."}
                  </div>
                </div>

                {/* Admin Feedback */}
                {viewingTask.adminFeedback && (
                  <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    <span className="font-semibold block text-[10px] uppercase tracking-wider text-purple-400">
                      Administrator Guidance:
                    </span>
                    <p className="mt-1 text-xs leading-relaxed">
                      {viewingTask.adminFeedback}
                    </p>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setViewingTask(null)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition cursor-pointer"
                  >
                    Close
                  </button>

                  {!vIsBeforeStart && (
                    <button
                      type="button"
                      onClick={() => {
                        const t = viewingTask;
                        setViewingTask(null);
                        handleOpenEdit(t);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition cursor-pointer"
                    >
                      Update Progress
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </StaffLayout>
  );
}
