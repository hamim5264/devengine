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
import {
  getAllEmployeeTasks,
  createEmployeeTask,
  updateEmployeeTask,
  deleteEmployeeTask,
} from "@/lib/services/employeeTaskService";
import type { StaffMember } from "@/types/staff";
import type {
  DailyWorkUpdate,
  EmployeeTask,
  TaskPriority,
  TaskStatus,
} from "@/types/staffEcoSystem";
import {
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
} from "@/types/staffEcoSystem";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const TASK_CATEGORIES = [
  "Frontend",
  "Backend",
  "Full Stack",
  "UI/UX Design",
  "Bug Fix",
  "QA Testing",
  "DevOps",
  "Database",
  "General",
];

export default function ManageWorkUpdatesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);

  // Active Main Tab: "tasks" | "reports"
  const [activeTab, setActiveTab] = useState<"tasks" | "reports">("tasks");

  // Data lists
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [updates, setUpdates] = useState<DailyWorkUpdate[]>([]);
  const [tasks, setTasks] = useState<EmployeeTask[]>([]);

  // Filters for Tasks
  const [taskStaffFilter, setTaskStaffFilter] = useState<string>("all");
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all");
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all");

  // Filters for Daily Reports
  const [selectedStaffId, setSelectedStaffId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");

  // Feedback modal for Work Reports
  const [activeUpdate, setActiveUpdate] = useState<DailyWorkUpdate | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Task Modal State (Add & Edit) ──
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [taskForm, setTaskForm] = useState<{
    assignedToStaffId: string;
    title: string;
    description: string;
    category: string;
    priority: TaskPriority;
    dueDate: string;
    dueTime: string;
    estimatedHours: number;
    status: TaskStatus;
    progressPercent: number;
    adminFeedback: string;
  }>({
    assignedToStaffId: "",
    title: "",
    description: "",
    category: "Frontend",
    priority: "normal",
    dueDate: "",
    dueTime: "18:00",
    estimatedHours: 4,
    status: "todo",
    progressPercent: 0,
    adminFeedback: "",
  });

  // Load all data
  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    try {
      const [staff, allUpdates, allTasks] = await Promise.all([
        getStaffMembers(),
        getAllWorkUpdates(),
        getAllEmployeeTasks(),
      ]);
      setStaffList(staff);
      setUpdates(allUpdates);
      setTasks(allTasks);

      // Default first staff for task form if not set
      if (staff.length > 0 && !taskForm.assignedToStaffId) {
        setTaskForm((prev) => ({ ...prev, assignedToStaffId: staff[0].id }));
      }
    } catch (err) {
      console.error("Error loading data in manage-work-updates:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [taskForm.assignedToStaffId]);

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

  // ── Task Actions ──
  const handleOpenCreateTask = (preselectedStaffId?: string) => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 3);
    const dueDateStr = nextWeek.toISOString().split("T")[0];

    const defaultStaff = preselectedStaffId || (staffList[0]?.id || "");
    setEditingTask(null);
    setTaskForm({
      assignedToStaffId: defaultStaff,
      title: "",
      description: "",
      category: "Frontend",
      priority: "normal",
      dueDate: dueDateStr,
      dueTime: "18:00",
      estimatedHours: 6,
      status: "todo",
      progressPercent: 0,
      adminFeedback: "",
    });
    setShowTaskModal(true);
  };

  const handleOpenEditTask = (task: EmployeeTask) => {
    setEditingTask(task);
    setTaskForm({
      assignedToStaffId: task.assignedToStaffId,
      title: task.title,
      description: task.description || "",
      category: task.category || "General",
      priority: task.priority || "normal",
      dueDate: task.dueDate || "",
      dueTime: task.dueTime || "18:00",
      estimatedHours: task.estimatedHours || 0,
      status: task.status || "todo",
      progressPercent: task.progressPercent || 0,
      adminFeedback: task.adminFeedback || "",
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim() || !taskForm.assignedToStaffId || !taskForm.dueDate) return;

    const assignedStaff = staffList.find((s) => s.id === taskForm.assignedToStaffId);
    if (!assignedStaff) return;

    setIsSubmittingTask(true);
    try {
      if (editingTask) {
        // Update existing task
        await updateEmployeeTask(editingTask.id, {
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          assignedToStaffId: assignedStaff.id,
          assignedToStaffUid: assignedStaff.uid,
          assignedToName: assignedStaff.name,
          assignedToEmail: assignedStaff.email,
          category: taskForm.category,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          dueTime: taskForm.dueTime,
          estimatedHours: Number(taskForm.estimatedHours) || 0,
          status: taskForm.status,
          progressPercent: Number(taskForm.progressPercent) || 0,
          adminFeedback: taskForm.adminFeedback.trim(),
        });
      } else {
        // Create new task
        await createEmployeeTask({
          title: taskForm.title.trim(),
          description: taskForm.description.trim(),
          assignedToStaffId: assignedStaff.id,
          assignedToStaffUid: assignedStaff.uid,
          assignedToName: assignedStaff.name,
          assignedToEmail: assignedStaff.email,
          priority: taskForm.priority,
          category: taskForm.category,
          dueDate: taskForm.dueDate,
          dueTime: taskForm.dueTime,
          estimatedHours: Number(taskForm.estimatedHours) || 0,
        });
      }

      // Reload tasks list
      const updatedTasks = await getAllEmployeeTasks();
      setTasks(updatedTasks);
      setShowTaskModal(false);
      setEditingTask(null);
    } catch (err) {
      console.error("Failed to save task:", err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to permanently remove this task?")) return;
    setIsDeletingTask(true);
    try {
      await deleteEmployeeTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (editingTask && editingTask.id === taskId) {
        setShowTaskModal(false);
        setEditingTask(null);
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateEmployeeTask(taskId, {
        status: newStatus,
        progressPercent: newStatus === "completed" ? 100 : undefined,
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                progressPercent: newStatus === "completed" ? 100 : t.progressPercent,
              }
            : t
        )
      );
    } catch (err) {
      console.error("Failed to quick update status:", err);
    }
  };

  // ── Work Report Feedback Actions ──
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

  // Filtered Tasks
  const filteredTasks = tasks.filter((task) => {
    if (taskStaffFilter !== "all" && task.assignedToStaffId !== taskStaffFilter) return false;
    if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) return false;
    if (taskPriorityFilter !== "all" && task.priority !== taskPriorityFilter) return false;
    return true;
  });

  // Filtered Daily Updates
  const filteredUpdates = updates.filter((item) => {
    if (selectedStaffId !== "all" && item.staffId !== selectedStaffId) return false;
    if (selectedDate && item.date !== selectedDate) return false;
    return true;
  });

  const totalHoursLogged = updates.reduce((sum, u) => sum + (u.hoursWorked || 0), 0);
  const activeTasksCount = tasks.filter((t) => t.status !== "completed").length;
  const completedTasksCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <AdminLayout title="Employee Work Updates & Tasks | Admin">
      <Head>
        <title>Employee Work Updates & Tasks | DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">assignment</span>
                </span>
                <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                  Employee Tasks & Work Updates
                </h1>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Assign and track sprint tasks, deadlines, and review daily engineering work logs.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={isRefreshing}
                className="py-2.5 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] text-gray-300 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`}
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

              <button
                type="button"
                onClick={() => handleOpenCreateTask()}
                className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <span className="material-symbols-outlined text-[16px]">add_task</span>
                <span>Assign New Task</span>
              </button>
            </div>
          </div>

          {/* ── Top Metric Capsules ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Active Sprints
              </span>
              <span className="text-xl font-bold font-mono text-white block">
                {activeTasksCount}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 block">
                {completedTasksCount} Completed
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Total Tasks
              </span>
              <span className="text-xl font-bold font-mono text-white block">
                {tasks.length}
              </span>
              <span className="text-[10px] font-mono text-purple-400 block">
                Across {staffList.length} Team Members
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Hours Logged
              </span>
              <span className="text-xl font-bold font-mono text-white block">
                {totalHoursLogged}h
              </span>
              <span className="text-[10px] font-mono text-emerald-400 block">
                Verified work logs
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">
                Work Reports
              </span>
              <span className="text-xl font-bold font-mono text-white block">
                {updates.length}
              </span>
              <span className="text-[10px] font-mono text-amber-400 block">
                {updates.filter((u) => !u.reviewedByAdmin).length} Pending Review
              </span>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
            <button
              type="button"
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "tasks"
                  ? "bg-white/[0.08] text-white border border-white/[0.12]"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-cyan-400">task_alt</span>
              <span>Assigned Tasks & Sprints</span>
              <span className="px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/20">
                {tasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reports")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
                activeTab === "reports"
                  ? "bg-white/[0.08] text-white border border-white/[0.12]"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-purple-400">history_edu</span>
              <span>Daily Work Reports</span>
              <span className="px-2 py-0.2 rounded-full bg-purple-500/10 text-purple-300 font-mono text-[10px] border border-purple-500/20">
                {updates.length}
              </span>
            </button>
          </div>

          {/* ═════════════════════════════════════════════════════════════════
              TAB 1: ASSIGNED TASKS & SPRINTS
          ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "tasks" && (
            <div className="space-y-4">
              {/* Task Filters */}
              <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {/* Employee Filter */}
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                      Filter by Employee:
                    </label>
                    <select
                      value={taskStaffFilter}
                      onChange={(e) => setTaskStaffFilter(e.target.value)}
                      className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="all" className="bg-[#0e0e1a]">All Employees ({tasks.length})</option>
                      {staffList.map((s) => {
                        const count = tasks.filter((t) => t.assignedToStaffId === s.id).length;
                        return (
                          <option key={s.id} value={s.id} className="bg-[#0e0e1a]">
                            {s.name} ({count} tasks)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                      Status:
                    </label>
                    <select
                      value={taskStatusFilter}
                      onChange={(e) => setTaskStatusFilter(e.target.value)}
                      className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="all" className="bg-[#0e0e1a]">All Statuses</option>
                      <option value="todo" className="bg-[#0e0e1a]">To Do</option>
                      <option value="in_progress" className="bg-[#0e0e1a]">In Progress</option>
                      <option value="in_review" className="bg-[#0e0e1a]">Under Review</option>
                      <option value="completed" className="bg-[#0e0e1a]">Completed</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                      Priority:
                    </label>
                    <select
                      value={taskPriorityFilter}
                      onChange={(e) => setTaskPriorityFilter(e.target.value)}
                      className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="all" className="bg-[#0e0e1a]">All Priorities</option>
                      <option value="low" className="bg-[#0e0e1a]">Low</option>
                      <option value="normal" className="bg-[#0e0e1a]">Normal</option>
                      <option value="high" className="bg-[#0e0e1a]">High</option>
                      <option value="urgent" className="bg-[#0e0e1a]">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-gray-400">
                    Showing <strong className="text-white">{filteredTasks.length}</strong> tasks
                  </span>
                </div>
              </div>

              {/* Task Cards Grid */}
              {filteredTasks.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.08] space-y-3">
                  <span className="material-symbols-outlined text-4xl text-gray-600 block">
                    task
                  </span>
                  <p className="text-sm text-gray-400 font-medium">
                    No tasks found matching current filters.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleOpenCreateTask(taskStaffFilter !== "all" ? taskStaffFilter : undefined)}
                    className="py-2 px-4 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
                  >
                    + Assign Task Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map((task) => {
                    const priorityColor =
                      task.priority === "urgent"
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : task.priority === "high"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : task.priority === "low"
                        ? "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        : "bg-sky-500/10 text-sky-400 border-sky-500/30";

                    const statusBadge =
                      task.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : task.status === "in_progress"
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                        : task.status === "in_review"
                        ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        : "bg-neutral-500/10 text-neutral-400 border-neutral-500/30";

                    return (
                      <div
                        key={task.id}
                        className="p-5 rounded-2xl bg-[#0c0c16] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-3.5 relative flex flex-col justify-between"
                      >
                        {/* Top: Category & Priority & Quick Actions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/10 text-[10px] font-mono text-gray-300">
                                {task.category || "General"}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${priorityColor}`}>
                                {task.priority}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase font-semibold ${statusBadge}`}>
                                {TASK_STATUS_LABELS[task.status] || task.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Edit Task Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditTask(task)}
                                title="Edit Task"
                                className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/10 flex items-center justify-center transition cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">edit</span>
                              </button>

                              {/* Delete Task Button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete Task"
                                className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">delete</span>
                              </button>
                            </div>
                          </div>

                          {/* Task Title */}
                          <h3 className="text-sm font-bold text-white leading-snug">
                            {task.title}
                          </h3>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Mid: Assignee Capsule */}
                        <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold shrink-0">
                              {task.assignedToName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-white truncate block text-[11px]">
                                {task.assignedToName}
                              </span>
                              <span className="text-[10px] text-gray-500 truncate block font-mono">
                                {task.assignedToEmail}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] text-gray-400">
                            <span className="block text-[10px] text-gray-500 uppercase">Deadline</span>
                            <span className="text-cyan-300 font-semibold">{task.dueDate}</span>
                          </div>
                        </div>

                        {/* Progress Bar & Status Quick Select */}
                        <div className="space-y-2 pt-1 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-gray-400">Progress:</span>
                            <span className="text-white font-bold">{task.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, task.progressPercent || 0)}%` }}
                            />
                          </div>

                          {/* Employee Notes / Submission Link */}
                          {task.submissionUrl && (
                            <div className="text-[11px] font-mono pt-1">
                              <span className="text-gray-500">Deliverable: </span>
                              <a
                                href={task.submissionUrl.startsWith("http") ? task.submissionUrl : `https://${task.submissionUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:underline"
                              >
                                {task.submissionUrl}
                              </a>
                            </div>
                          )}

                          {/* Quick Status Bar */}
                          <div className="flex items-center justify-between gap-2 pt-1.5">
                            <span className="text-[10px] text-gray-500 font-mono">Change Status:</span>
                            <div className="flex items-center gap-1">
                              {(["todo", "in_progress", "in_review", "completed"] as TaskStatus[]).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleQuickStatusChange(task.id, st)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ${
                                    task.status === st
                                      ? "bg-cyan-500 text-slate-950 font-bold"
                                      : "bg-white/[0.04] text-gray-400 hover:text-white"
                                  }`}
                                >
                                  {st === "in_progress" ? "Progress" : st === "in_review" ? "Review" : st.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════
              TAB 2: DAILY WORK REPORTS & LOGS
          ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "reports" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="p-4 rounded-2xl bg-[#0c0c16] border border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div>
                    <label className="text-[10px] font-mono text-gray-400 uppercase block mb-1">
                      Filter by Employee:
                    </label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
                    >
                      <option value="all" className="bg-[#0e0e1a]">All Employees</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id} className="bg-[#0e0e1a]">
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
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate("")}
                      className="mt-5 text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Clear Date
                    </button>
                  )}
                </div>
              </div>

              {/* Updates Feed */}
              <div className="space-y-4">
                {filteredUpdates.length === 0 ? (
                  <div className="p-12 text-center rounded-2xl bg-[#0c0c16] border border-white/[0.08]">
                    <span className="material-symbols-outlined text-4xl text-gray-600 block mb-2">
                      description
                    </span>
                    <p className="text-sm text-gray-400 font-medium">No work updates found matching filters.</p>
                  </div>
                ) : (
                  filteredUpdates.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 sm:p-6 rounded-2xl bg-[#0c0c16] border border-white/[0.08] hover:border-white/[0.15] transition-all space-y-4"
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
            </div>
          )}
        </main>
      </div>

      {/* ═════════════════════════════════════════════════════════════════
          CREATE / EDIT TASK MODAL (POP UP SHEET)
      ═════════════════════════════════════════════════════════════════ */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0d18] border border-white/[0.12] p-6 sm:p-7 shadow-2xl relative space-y-5 themed-scroll">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">
                    {editingTask ? "edit_note" : "add_task"}
                  </span>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-['Space_Grotesk']">
                    {editingTask ? "Edit Sprint Task" : "Assign New Sprint Task"}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {editingTask ? "Update deliverables, progress, and deadlines" : "Assign work deliverable to your team member"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTask} className="space-y-4">
              {/* 1. Assign to Employee */}
              <div>
                <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                  Assign To Team Member *
                </label>
                <select
                  required
                  value={taskForm.assignedToStaffId}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedToStaffId: e.target.value })}
                  className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-mono"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#0e0e1a]">
                      {s.name} — {s.staffType} ({s.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Task Title */}
              <div>
                <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                  Task Title / Sprint Objective *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement user authentication token refresh"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-600"
                />
              </div>

              {/* 3. Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                    Category
                  </label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-mono"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-[#0e0e1a]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                    Priority Level
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                    className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer font-mono"
                  >
                    <option value="low" className="bg-[#0e0e1a]">Low Priority</option>
                    <option value="normal" className="bg-[#0e0e1a]">Normal Priority</option>
                    <option value="high" className="bg-[#0e0e1a]">High Priority</option>
                    <option value="urgent" className="bg-[#0e0e1a]">🚨 Urgent</option>
                  </select>
                </div>
              </div>

              {/* 4. Due Date, Due Time & Estimated Hours */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                    Deadline Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                    Deadline Time
                  </label>
                  <input
                    type="time"
                    value={taskForm.dueTime}
                    onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                    className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-2.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                    className="w-full h-11 bg-black/50 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              {/* 5. If editing: Status & Progress slider */}
              {editingTask && (
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                        Task Progress Status
                      </label>
                      <select
                        value={taskForm.status}
                        onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as TaskStatus })}
                        className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      >
                        <option value="todo" className="bg-[#0e0e1a]">To Do</option>
                        <option value="in_progress" className="bg-[#0e0e1a]">In Progress</option>
                        <option value="in_review" className="bg-[#0e0e1a]">Under Review</option>
                        <option value="completed" className="bg-[#0e0e1a]">Completed</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 mb-1.5">
                        <span>Progress %:</span>
                        <span className="text-cyan-300 font-bold">{taskForm.progressPercent}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={taskForm.progressPercent}
                        onChange={(e) => setTaskForm({ ...taskForm, progressPercent: Number(e.target.value) })}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                      Admin Feedback / Notes
                    </label>
                    <input
                      type="text"
                      placeholder="Optional feedback or guidelines for the employee..."
                      value={taskForm.adminFeedback}
                      onChange={(e) => setTaskForm({ ...taskForm, adminFeedback: e.target.value })}
                      className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* 6. Description / Deliverables */}
              <div>
                <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1.5">
                  Detailed Scope & Deliverables
                </label>
                <textarea
                  rows={3}
                  placeholder="Outline key deliverables, design files, repository branch, or expectations..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full bg-black/50 border border-white/[0.1] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-600 resize-none leading-relaxed"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                {editingTask ? (
                  <button
                    type="button"
                    disabled={isDeletingTask}
                    onClick={() => handleDeleteTask(editingTask.id)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                    <span>{isDeletingTask ? "Deleting..." : "Delete Task"}</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskModal(false);
                      setEditingTask(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTask}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[15px]">
                      {editingTask ? "save" : "check"}
                    </span>
                    <span>{isSubmittingTask ? "Saving..." : editingTask ? "Update Task" : "Assign Task"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          FEEDBACK MODAL FOR DAILY REPORTS
      ═════════════════════════════════════════════════════════════════ */}
      {activeUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-[#0c0d18] border border-white/[0.12] p-6 shadow-2xl relative">
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
                <label className="text-[11px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                  Administrator Remarks / Review Feedback
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Great progress on the API integration. Please coordinate with Design for the final assets."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder:text-gray-600 resize-none font-mono"
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
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition cursor-pointer disabled:opacity-50"
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
