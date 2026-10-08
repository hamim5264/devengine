import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  getStaffMembers,
  createStaffAccount,
  updateStaffMember,
  deleteStaffMember,
  generateStaffEmail,
  generateStaffPassword,
  uploadStaffAvatar,
  getStaffRoles,
  createStaffRole,
} from "@/lib/services/staffService";
import type { StaffMember, StaffRole, StaffStatus } from "@/types/staff";
import {
  MODULE_CONFIG,
  getRoleLabel,
  getRoleBadgeColor,
} from "@/types/staff";
import {
  createEmployeeTask,
  getEmployeeTasks,
  adminReviewTask,
  deleteEmployeeTask,
} from "@/lib/services/employeeTaskService";
import {
  createAgreement,
  generateNextAgreementNumber,
} from "@/lib/services/agreementService";
import type {
  EmployeeTask,
  TaskPriority,
  TaskStatus,
} from "@/types/staffEcoSystem";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/types/staffEcoSystem";
import type { AgreementType } from "@/types/agreement";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const ALL_MODULE_KEYS = Object.keys(MODULE_CONFIG);

// ── Searchable Role Selector Component ──
interface RoleSelectorProps {
  roles: StaffRole[];
  selectedRoleKey: string;
  onSelectRole: (roleKey: string) => void;
  onAddNewRole: (label: string) => Promise<string | void>;
}

function RoleSelector({
  roles,
  selectedRoleKey,
  onSelectRole,
  onAddNewRole,
}: RoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = roles.filter(
    (r) =>
      r.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.key.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exactMatch = roles.some(
    (r) => r.label.toLowerCase().trim() === searchTerm.toLowerCase().trim()
  );

  const selectedRole = roles.find((r) => r.key === selectedRoleKey);
  const selectedBadgeColor = getRoleBadgeColor(selectedRoleKey, roles);
  const selectedLabel = getRoleLabel(selectedRoleKey, roles);

  const handleCreate = async () => {
    if (!searchTerm.trim()) return;
    setIsCreatingRole(true);
    try {
      const newKey = await onAddNewRole(searchTerm.trim());
      if (newKey) {
        onSelectRole(newKey);
      }
      setSearchTerm("");
      setIsOpen(false);
    } finally {
      setIsCreatingRole(false);
    }
  };

  return (
    <div className="relative space-y-1.5" ref={wrapperRef}>
      <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block">
        Employee Role
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 bg-black/40 border border-white/[0.1] hover:border-white/[0.2] rounded-xl px-3.5 flex items-center justify-between text-left transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium ${selectedBadgeColor.bg} ${selectedBadgeColor.text} ${selectedBadgeColor.border}`}
          >
            <span className="material-symbols-outlined text-xs">badge</span>
            {selectedLabel}
          </span>
          {selectedRole?.description && (
            <span className="text-[11px] text-gray-500 font-mono truncate hidden sm:inline">
              — {selectedRole.description}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined text-gray-400 text-sm transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 p-2 bg-[#0d0d1b] border border-white/[0.12] rounded-2xl shadow-2xl space-y-2 backdrop-blur-2xl">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined text-gray-400 text-sm absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search or enter new role..."
              className="w-full h-9 bg-black/50 border border-white/[0.1] rounded-xl pl-9 pr-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
            />
          </div>

          {/* Role List */}
          <div className="max-h-52 overflow-y-auto themed-scroll space-y-1 pr-1">
            {filtered.map((role) => {
              const isSelected = role.key === selectedRoleKey;
              const color = getRoleBadgeColor(role.key, roles);

              return (
                <button
                  key={role.key}
                  type="button"
                  onClick={() => {
                    onSelectRole(role.key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-cyan-500/15 border border-cyan-500/30"
                      : "hover:bg-white/[0.04] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-mono font-medium ${color.bg} ${color.text} ${color.border}`}
                    >
                      <span className="material-symbols-outlined text-xs">badge</span>
                      {role.label}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono truncate">
                      {role.key}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-cyan-400 text-sm">check</span>
                  )}
                </button>
              );
            })}

            {filtered.length === 0 && !searchTerm.trim() && (
              <p className="text-xs text-gray-500 font-mono text-center py-3">No roles found.</p>
            )}

            {/* Create new role option if no exact match */}
            {searchTerm.trim() && !exactMatch && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreatingRole}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-all cursor-pointer text-left"
              >
                {isCreatingRole ? (
                  <>
                    <HelixLoader size={14} color="#38f2ff" />
                    <span>Creating role &quot;{searchTerm.trim()}&quot;…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>
                      Add new role: <strong className="text-white">&quot;{searchTerm.trim()}&quot;</strong>
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Avatar Input Component (File Upload + Image Link) ──
interface AvatarInputProps {
  avatarUrl: string;
  onChange: (url: string) => void;
  staffName: string;
}

function AvatarInput({ avatarUrl, onChange, staffName }: AvatarInputProps) {
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, WEBP).");
      return;
    }

    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadStaffAvatar(file, staffName || "staff");
      onChange(url);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to upload profile image.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const initial = staffName.trim() ? staffName.trim().charAt(0).toUpperCase() : "S";

  return (
    <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
          Profile Image
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-gray-400">File & Link</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
              mode === "upload"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
              mode === "url"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Image URL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Preview circle */}
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/[0.12] flex items-center justify-center flex-shrink-0 shadow-md">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
              onError={() => onChange("")}
            />
          ) : (
            <span className="text-lg font-bold text-white">{initial}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <HelixLoader size={16} color="#38f2ff" />
            </div>
          )}
        </div>

        {/* Inputs */}
        <div className="flex-1 min-w-0">
          {mode === "upload" ? (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="staff-avatar-upload"
              />
              <div className="flex items-center gap-2">
                <label
                  htmlFor="staff-avatar-upload"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-gray-200 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono cursor-pointer transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm text-cyan-400">upload_file</span>
                  {uploading ? "Uploading…" : avatarUrl ? "Change Photo" : "Upload File"}
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="p-1.5 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Remove Avatar"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">PNG, JPG, WEBP up to 10MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
              />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="p-2 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                  title="Clear URL"
                >
                  <span className="material-symbols-outlined text-sm">clear</span>
                </button>
              )}
            </div>
          )}
          {uploadError && (
            <p className="text-[10px] text-rose-400 font-mono mt-1">{uploadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ManageStaffPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);

  // Notice
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Credentials reveal after creation
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; password: string; avatarUrl?: string } | null>(null);

  // Password visibility tracking in table
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  // Password visibility in modals
  const [showCreatePass, setShowCreatePass] = useState(true);
  const [showEditPass, setShowEditPass] = useState(false);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createAvatarUrl, setCreateAvatarUrl] = useState("");
  const [createType, setCreateType] = useState<string>("developer");
  const [createModules, setCreateModules] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Agreement and Shift options during creation
  const [createWithAgreement, setCreateWithAgreement] = useState(true);
  const [agreementSalary, setAgreementSalary] = useState(50000);
  const [agreementCurrency, setAgreementCurrency] = useState("BDT");
  const [agreementTypeChoice, setAgreementTypeChoice] = useState<AgreementType>("retainer");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [offDaysChoice, setOffDaysChoice] = useState<string[]>(["Friday", "Saturday"]);

  // Task assignment modal
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [taskAssigneeStaff, setTaskAssigneeStaff] = useState<StaffMember | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    category: string;
    dueDate: string;
    dueTime: string;
    estimatedHours: number;
  }>({
    title: "",
    description: "",
    priority: "normal",
    category: "General",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    dueTime: "18:00",
    estimatedHours: 8,
  });
  const [assigningTask, setAssigningTask] = useState(false);

  // View employee tasks modal
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [tasksStaff, setTasksStaff] = useState<StaffMember | null>(null);
  const [staffTasksList, setStaffTasksList] = useState<EmployeeTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editType, setEditType] = useState<string>("developer");
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<StaffStatus>("active");
  const [saving, setSaving] = useState(false);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Action in progress
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Employee Comprehensive Details Modal
  const [selectedDetailStaff, setSelectedDetailStaff] = useState<StaffMember | null>(null);
  const [detailStaffTasks, setDetailStaffTasks] = useState<EmployeeTask[]>([]);
  const [loadingDetailTasks, setLoadingDetailTasks] = useState(false);

  const openEmployeeDetailsModal = async (member: StaffMember) => {
    setSelectedDetailStaff(member);
    setLoadingDetailTasks(true);
    try {
      const list = await getEmployeeTasks(member.id);
      setDetailStaffTasks(list);
    } catch (err) {
      console.error("Failed to load tasks for employee details:", err);
    } finally {
      setLoadingDetailTasks(false);
    }
  };

  // ── Auth ──
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // ── Load staff and roles ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [staffData, rolesData] = await Promise.all([
        getStaffMembers(),
        getStaffRoles(),
      ]);
      setStaff(staffData);
      setRoles(rolesData);
    } catch {
      setNotice({ type: "error", text: "Failed to load employee and roles data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady && isAdmin) loadData();
  }, [authReady, isAdmin, loadData]);

  // ── Auto-generate email when name changes in create form ──
  useEffect(() => {
    if (createName.trim()) {
      setCreateEmail(generateStaffEmail(createName));
    } else {
      setCreateEmail("");
    }
  }, [createName]);

  // ── Open create modal ──
  const openCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword(generateStaffPassword());
    setCreateAvatarUrl("");
    setCreateType(roles.length > 0 ? roles[0].key : "developer");
    setCreateModules(["overview"]);
    setCreatedCreds(null);
    setShowCreatePass(true);
    setShowCreateModal(true);
  };

  // ── Quick add custom role inline from selector ──
  const handleAddNewRoleInline = async (label: string): Promise<string | void> => {
    try {
      const newRole = await createStaffRole({ label });
      setNotice({ type: "success", text: `Role "${label}" added to system.` });
      // Refresh roles
      const updatedRoles = await getStaffRoles();
      setRoles(updatedRoles);
      return newRole.key;
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to create role." });
    }
  };

  // ── Create staff ──
  const handleCreate = async () => {
    if (!createName.trim()) {
      setNotice({ type: "error", text: "Please enter an employee name." });
      return;
    }
    if (!createPassword.trim()) {
      setNotice({ type: "error", text: "Please enter or generate a password." });
      return;
    }
    if (createModules.length === 0) {
      setNotice({ type: "error", text: "Please select at least one module." });
      return;
    }

    setCreating(true);
    try {
      let agreementId = "";
      if (createWithAgreement) {
        try {
          const agrNum = await generateNextAgreementNumber();
          const today = new Date().toISOString().split("T")[0];
          agreementId = await createAgreement({
            agreementNumber: agrNum,
            version: "1.0",
            status: "active",
            agreementType: agreementTypeChoice,
            agreementTypeLabel:
              agreementTypeChoice === "retainer"
                ? "Employment & Retainer Agreement"
                : "Professional Contributor Agreement",
            project: {
              projectId: "devengine_internal",
              projectName: "DevEngine Operations & Engineering",
              projectType: "Employment",
              startDate: today,
              expectedCompletionDate: "",
              agreementEffectiveDate: today,
              projectStatus: "Active",
              description: `Official employment agreement for ${createName.trim()} (${createType}).`,
            },
            developer: {
              fullName: createName.trim(),
              email: createEmail,
              role: createType,
              phone: "",
              address: "",
            },
            devengine: {
              companyName: "DevEngine Systems Inc.",
              ceoName: "Hamim Leon",
              ceoTitle: "Chief Executive Officer",
              companyEmail: "hamim.leon@gmail.com",
              companyWebsite: "https://thedevengine.vercel.app",
              companyAddress: "Dhaka, Bangladesh",
            },
            compensation: {
              model: agreementTypeChoice,
              currency: agreementCurrency,
              monthlyRetainerAmount: agreementSalary,
              fixedAmount: agreementSalary,
              totalContractValue: agreementSalary * 12,
              paymentFrequency: "Monthly",
              availabilityHoursPerWeek: 40,
            },
            deliverables: [],
            terms: {
              noticePeriodDays: 30,
              bugFixPeriodDays: 30,
              confidentialityDurationYears: 3,
              paymentDuePeriodDays: 7,
              acceptancePeriodDays: 7,
              terminationNoticeDays: 30,
              disputeResolutionMethod: "Amicable Negotiation, followed by Arbitral Conciliation",
              governingLaw: "Laws of the People's Republic of Bangladesh",
              jurisdiction: "Competent Courts of Dhaka, Bangladesh",
              nonSolicitationYears: 2,
            },
            createdBy: "hamim.leon@gmail.com",
            createdAt: today,
            updatedBy: "hamim.leon@gmail.com",
            updatedAt: today,
          } as any);
        } catch (agrErr) {
          console.warn("Failed to auto-generate agreement:", agrErr);
        }
      }

      await createStaffAccount({
        name: createName.trim(),
        email: createEmail,
        password: createPassword,
        avatarUrl: createAvatarUrl,
        staffType: createType,
        allowedModules: createModules,
        assignedOffDays: offDaysChoice,
        shiftHours: { start: shiftStart, end: shiftEnd, name: "Standard Shift" },
        agreementId,
      });

      setCreatedCreds({
        name: createName.trim(),
        email: createEmail,
        password: createPassword,
        avatarUrl: createAvatarUrl,
      });
      setNotice({
        type: "success",
        text: `Employee account "${createName.trim()}" created successfully${
          agreementId ? " with official agreement attached" : ""
        }!`,
      });
      await loadData();
    } catch (err: any) {
      const msg =
        err?.code === "auth/email-already-in-use"
          ? "This email is already registered. Try modifying the name."
          : err?.message || "Failed to create employee account.";
      setNotice({ type: "error", text: msg });
    } finally {
      setCreating(false);
    }
  };

  // ── Open task assignment modal ──
  const openAssignTaskModal = (member: StaffMember) => {
    setTaskAssigneeStaff(member);
    setTaskForm({
      title: "",
      description: "",
      priority: "normal",
      category: "General",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      dueTime: "18:00",
      estimatedHours: 8,
    });
    setShowAssignTaskModal(true);
  };

  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskAssigneeStaff || !taskForm.title.trim()) return;
    setAssigningTask(true);
    try {
      await createEmployeeTask({
        title: taskForm.title.trim(),
        description: taskForm.description,
        assignedToStaffId: taskAssigneeStaff.id,
        assignedToStaffUid: taskAssigneeStaff.uid,
        assignedToName: taskAssigneeStaff.name,
        assignedToEmail: taskAssigneeStaff.email,
        priority: taskForm.priority,
        category: taskForm.category,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        estimatedHours: taskForm.estimatedHours,
      });
      setNotice({ type: "success", text: `Task assigned to ${taskAssigneeStaff.name} successfully!` });
      setShowAssignTaskModal(false);
    } catch (err) {
      console.error("Assign task error:", err);
      setNotice({ type: "error", text: "Failed to assign task." });
    } finally {
      setAssigningTask(false);
    }
  };

  // ── Open view employee tasks modal ──
  const openEmployeeTasksModal = async (member: StaffMember) => {
    setTasksStaff(member);
    setShowTasksModal(true);
    setLoadingTasks(true);
    try {
      const list = await getEmployeeTasks(member.id);
      setStaffTasksList(list);
    } catch (err) {
      console.error("Load employee tasks error:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAdminFeedbackSubmit = async (taskId: string, newStatus?: TaskStatus) => {
    const feedback = feedbackInputs[taskId] || "";
    setProcessingTaskId(taskId);
    try {
      await adminReviewTask(taskId, feedback, newStatus);
      if (tasksStaff) {
        const updated = await getEmployeeTasks(tasksStaff.id);
        setStaffTasksList(updated);
      }
      setNotice({ type: "success", text: "Task review submitted successfully!" });
    } catch (err) {
      console.error("Review task error:", err);
    } finally {
      setProcessingTaskId(null);
    }
  };

  // ── Open edit modal ──
  const openEditModal = (member: StaffMember) => {
    setEditingStaff(member);
    setEditName(member.name);
    setEditPassword(member.password || "");
    setEditAvatarUrl(member.avatarUrl || "");
    setEditType(member.staffType);
    setEditModules([...member.allowedModules]);
    setEditStatus(member.status);
    setShowEditPass(false);
    setShowEditModal(true);
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editingStaff) return;
    setSaving(true);
    try {
      await updateStaffMember(
        editingStaff.id,
        {
          name: editName.trim() || editingStaff.name,
          password: editPassword,
          avatarUrl: editAvatarUrl,
          staffType: editType,
          allowedModules: editModules,
          status: editStatus,
        },
        {
          email: editingStaff.email,
          oldPassword: editingStaff.password,
        }
      );
      setNotice({ type: "success", text: `Employee "${editingStaff.name}" updated successfully.` });
      setShowEditModal(false);
      setEditingStaff(null);
      await loadData();
    } catch {
      setNotice({ type: "error", text: "Failed to update employee." });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle suspend ──
  const handleToggleSuspend = async (member: StaffMember) => {
    setActionInProgress(member.id);
    try {
      const newStatus: StaffStatus = member.status === "active" ? "suspended" : "active";
      await updateStaffMember(member.id, { status: newStatus });
      setNotice({
        type: "success",
        text: `${member.name} has been ${newStatus === "active" ? "reactivated" : "suspended"}.`,
      });
      await loadData();
    } catch {
      setNotice({ type: "error", text: "Failed to update status." });
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Delete ──
  const handleDelete = async (member: StaffMember) => {
    if (!window.confirm(`Are you sure you want to permanently remove "${member.name}"?`))
      return;
    setActionInProgress(member.id);
    try {
      await deleteStaffMember(member.id);
      setNotice({ type: "success", text: `"${member.name}" removed from employees.` });
      await loadData();
    } catch {
      setNotice({ type: "error", text: "Failed to remove employee." });
    } finally {
      setActionInProgress(null);
    }
  };

  // ── Copy to clipboard ──
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  // ── Toggle password reveal in table ──
  const togglePasswordReveal = (memberId: string) => {
    setRevealedPasswords((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  // ── Module toggle ──
  const toggleModule = (modules: string[], key: string, setter: (v: string[]) => void) => {
    setter(modules.includes(key) ? modules.filter((m) => m !== key) : [...modules, key]);
  };

  const toggleAllModules = (modules: string[], setter: (v: string[]) => void) => {
    setter(modules.length === ALL_MODULE_KEYS.length ? [] : [...ALL_MODULE_KEYS]);
  };

  // ── Filter ──
  const filteredStaff = staff.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const roleLabel = getRoleLabel(s.staffType, roles).toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.staffType.toLowerCase().includes(q) ||
      roleLabel.includes(q)
    );
  });

  // ── Metrics ──
  const metrics = {
    total: staff.length,
    active: staff.filter((s) => s.status === "active").length,
    suspended: staff.filter((s) => s.status === "suspended").length,
    rolesCount: new Set(staff.map((s) => s.staffType)).size,
  };

  // ── Loading / Auth gate ──
  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#38f2ff" />
      </div>
    );
  }

  // ── Module Checkbox Grid ──
  const ModuleGrid = ({
    selected,
    onToggle,
    onToggleAll,
  }: {
    selected: string[];
    onToggle: (key: string) => void;
    onToggleAll: () => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Module Access</span>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
        >
          {selected.length === ALL_MODULE_KEYS.length ? "Deselect All" : "Select All"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ALL_MODULE_KEYS.map((key) => {
          const cfg = MODULE_CONFIG[key];
          const isChecked = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => onToggle(key)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                isChecked
                  ? "bg-white/[0.06] border-cyan-500/40"
                  : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${cfg.color}18`, color: cfg.color }}
              >
                <span className="material-symbols-outlined text-base">{cfg.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-xs font-bold block ${isChecked ? "text-white" : "text-gray-300"}`}>
                  {cfg.label}
                </span>
                <span className="text-[10px] text-gray-500 block truncate">{cfg.description}</span>
              </div>
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isChecked
                    ? "bg-cyan-500 border-cyan-500"
                    : "border-gray-600"
                }`}
              >
                {isChecked && (
                  <span className="material-symbols-outlined text-white text-xs">check</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <AdminLayout title="Employee Management | DevEngine Admin">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ── Page Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-400 text-xl">group</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                    Employee Management
                  </h1>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Create accounts, assign modules, track passwords & manage team access
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/manage-staff-roles"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base text-cyan-400">badge</span>
                Manage Roles
              </Link>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-95 shadow-lg"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                  boxShadow: "0 0 20px rgba(6,182,212,0.3)",
                }}
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                Add Employee
              </button>
            </div>
          </div>

          {/* ── Notice ── */}
          {notice && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-mono border backdrop-blur-xl shadow-xl transition-all ${
                notice.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : notice.type === "info"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">
                  {notice.type === "error" ? "error" : "check_circle"}
                </span>
                <span>{notice.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* ── Metric Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Employees</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{metrics.total}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Active</span>
              <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{metrics.active}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider">Suspended</span>
              <p className="text-2xl font-bold font-mono text-rose-300 mt-1">{metrics.suspended}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Roles in Use</span>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">{metrics.rolesCount}</p>
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">{roles.length} total defined</p>
            </div>
          </div>

          {/* ── Operations Ecosystem Quick Hub ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/manage-attendance"
              className="p-4 rounded-2xl bg-violet-500/5 hover:bg-violet-500/10 border border-violet-500/20 hover:border-violet-500/35 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">alarm_on</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Employee Attendance & Roster</span>
                  <span className="text-[10px] text-gray-400 font-mono">Daily check-ins & missed dates</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all text-base">
                arrow_forward
              </span>
            </Link>

            <Link
              href="/admin/manage-work-updates"
              className="p-4 rounded-2xl bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/35 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Daily Work Updates</span>
                  <span className="text-[10px] text-gray-400 font-mono">Task reports & engineering logs</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all text-base">
                arrow_forward
              </span>
            </Link>

            <Link
              href="/admin/manage-leaves"
              className="p-4 rounded-2xl bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/35 transition-all flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">beach_access</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Leave Applications</span>
                  <span className="text-[10px] text-gray-400 font-mono">Review & approve time off</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-gray-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all text-base">
                arrow_forward
              </span>
            </Link>
          </div>

          {/* ── Search Bar ── */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined text-gray-400 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees by name, email, or role…"
                className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">
                Showing {filteredStaff.length} of {staff.length} employees
              </span>
            </div>
          </div>

          {/* ── Table / Empty State ── */}
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-12">
              <HelixLoader size={44} color="#38f2ff" />
              <p className="text-xs font-mono text-gray-400 tracking-wider uppercase">Loading Employees…</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <span className="material-symbols-outlined text-3xl">group_add</span>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                  {searchQuery ? "No matching employees found" : "No employees yet"}
                </h3>
                <p className="text-sm text-gray-400">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Create your first employee account to grant team members controlled access to admin modules."}
                </p>
              </div>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                    boxShadow: "0 0 20px rgba(6,182,212,0.3)",
                  }}
                >
                  <span className="material-symbols-outlined text-base">person_add</span>
                  Add Employee
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#0b0c16] border border-white/10 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
                      <th className="py-3.5 px-5 w-[30%]">Employee & Contact</th>
                      <th className="py-3.5 px-4 w-[18%]">Role & Shift</th>
                      <th className="py-3.5 px-4 w-[18%]">Permissions</th>
                      <th className="py-3.5 px-4 w-[14%]">Status</th>
                      <th className="py-3.5 px-5 w-[20%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-xs">
                    {filteredStaff.map((member) => {
                      const typeColor = getRoleBadgeColor(member.staffType, roles);
                      const roleLabel = getRoleLabel(member.staffType, roles);
                      const initial = member.name.charAt(0).toUpperCase();

                      return (
                        <tr
                          key={member.id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* 1. Employee & Contact */}
                          <td className="py-4 px-5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                {member.avatarUrl ? (
                                  <img
                                    src={member.avatarUrl}
                                    alt={member.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-white">{initial}</span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <span className="text-white font-semibold text-sm block truncate">
                                  {member.name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-mono">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(member.email, `email-${member.id}`)}
                                    className="inline-flex items-center gap-1 text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer"
                                    title="Click to copy email"
                                  >
                                    <span className="material-symbols-outlined text-[13px] text-cyan-400">
                                      {copiedId === `email-${member.id}` ? "check" : "mail"}
                                    </span>
                                    <span className="truncate max-w-[150px]">{member.email}</span>
                                  </button>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-[11px] text-gray-500">
                                    Joined {new Date(member.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Role & Shift */}
                          <td className="py-4 px-4 align-middle">
                            <div className="space-y-1">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-xs font-mono font-medium ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}
                              >
                                <span className="material-symbols-outlined text-xs">badge</span>
                                <span>{roleLabel}</span>
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                                <span className="material-symbols-outlined text-[13px] text-cyan-400">schedule</span>
                                <span>{member.shiftHours ? `${member.shiftHours.start} - ${member.shiftHours.end}` : "09:00 - 18:00"}</span>
                              </div>
                            </div>
                          </td>

                          {/* 3. Permissions */}
                          <td className="py-4 px-4 align-middle">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 text-xs font-mono">
                                  <span className="text-cyan-400 font-semibold">{member.allowedModules.length}</span>
                                  <span>Modules</span>
                                </span>
                                {member.agreementId && (
                                  <span
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono"
                                    title="Employment Agreement Linked"
                                  >
                                    <span className="material-symbols-outlined text-[11px]">verified</span>
                                    <span>Agreement</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 font-mono truncate max-w-[170px]">
                                Off: {(member.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                              </div>
                            </div>
                          </td>

                          {/* 4. Status */}
                          <td className="py-4 px-4 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wider border whitespace-nowrap ${
                                member.status === "active"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  member.status === "active" ? "bg-emerald-400" : "bg-rose-400"
                                }`}
                              />
                              <span>{member.status === "active" ? "Active" : "Suspended"}</span>
                            </span>
                          </td>

                          {/* 5. Actions */}
                          <td className="py-4 px-5 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => openEmployeeDetailsModal(member)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition cursor-pointer active:scale-95"
                              >
                                <span className="material-symbols-outlined text-[15px]">visibility</span>
                                <span>View Details</span>
                              </button>

                              {/* Assign Task */}
                              <button
                                type="button"
                                onClick={() => openAssignTaskModal(member)}
                                title="Assign Task"
                                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-purple-500/10 text-gray-400 hover:text-purple-300 border border-white/10 hover:border-purple-500/30 flex items-center justify-center transition cursor-pointer active:scale-95"
                              >
                                <span className="material-symbols-outlined text-base">assignment_add</span>
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => openEditModal(member)}
                                title="Edit Employee"
                                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center transition cursor-pointer active:scale-95"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>

                              {/* Suspend / Reactivate */}
                              <button
                                type="button"
                                onClick={() => handleToggleSuspend(member)}
                                disabled={actionInProgress === member.id}
                                title={member.status === "active" ? "Suspend Employee" : "Reactivate Employee"}
                                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition cursor-pointer disabled:opacity-50 active:scale-95 ${
                                  member.status === "active"
                                    ? "bg-white/[0.04] hover:bg-amber-500/10 text-gray-400 hover:text-amber-300 border-white/10 hover:border-amber-500/30"
                                    : "bg-white/[0.04] hover:bg-emerald-500/10 text-gray-400 hover:text-emerald-300 border-white/10 hover:border-emerald-500/30"
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {member.status === "active" ? "block" : "check_circle"}
                                </span>
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => handleDelete(member)}
                                disabled={actionInProgress === member.id}
                                title="Remove Employee"
                                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer disabled:opacity-50 active:scale-95"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
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
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE STAFF MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!creating) {
                setShowCreateModal(false);
                setCreatedCreds(null);
              }
            }}
          />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">person_add</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">
                    {createdCreds ? "Account Created!" : "Create Employee Account"}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {createdCreds ? "Save and share credentials with the employee" : "Set up a new team member with custom role & permissions"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setCreatedCreds(null);
                }}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {createdCreds ? (
              /* ── Credentials Card ── */
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    <div>
                      <span className="text-sm font-bold block">Account for {createdCreds.name} is ready</span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        Password has been securely saved to the admin panel.
                      </span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Login Email</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-white font-mono">
                        {createdCreds.email}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCreds.email, "cred-email")}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-email" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Password</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-sm text-cyan-300 font-mono tracking-widest">
                        {createdCreds.password}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCreds.password, "cred-pass")}
                        className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-pass" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Login URL */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Employee Portal URL</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-cyan-300 font-mono truncate">
                        {typeof window !== "undefined" ? `${window.location.origin}/employee` : "/employee"}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            typeof window !== "undefined" ? `${window.location.origin}/employee` : "/employee",
                            "cred-url"
                          )
                        }
                        className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-url" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-cyan-400 text-base mt-0.5 shrink-0">info</span>
                  <p className="text-[11px] text-cyan-200 leading-relaxed font-mono">
                    As an admin, you can always review, copy or update this password directly from the Staff Management table anytime.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedCreds(null);
                  }}
                  className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                    boxShadow: "0 0 20px rgba(6,182,212,0.25)",
                  }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Create Form ── */
              <div className="space-y-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
                  />
                </div>

                {/* Avatar / Profile Image */}
                <AvatarInput
                  avatarUrl={createAvatarUrl}
                  onChange={setCreateAvatarUrl}
                  staffName={createName}
                />

                {/* Login Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      Login Email
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                        AUTO
                      </span>
                    </span>
                  </label>
                  <input
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full h-11 bg-black/30 border border-white/[0.08] rounded-xl px-4 text-sm text-gray-200 font-mono focus:outline-none focus:border-cyan-400"
                    placeholder="Enter name above to auto-generate"
                  />
                  <p className="text-[10px] text-gray-500 font-mono">
                    Auto-generated from first name, or you can customize it manually.
                  </p>
                </div>

                {/* Password (Visible & Editable for Admin) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                      Password
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                        ADMIN VISIBLE
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCreatePass(!showCreatePass)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {showCreatePass ? "visibility_off" : "visibility"}
                      </span>
                      {showCreatePass ? "Hide" : "Show"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type={showCreatePass ? "text" : "password"}
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Enter or generate password"
                      className="flex-1 h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setCreatePassword(generateStaffPassword())}
                      title="Regenerate random password"
                      className="w-11 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">refresh</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono">
                    You can edit, update, or view this password anytime as Admin.
                  </p>
                </div>

                {/* Searchable Role Selector with Add Role Option */}
                <RoleSelector
                  roles={roles}
                  selectedRoleKey={createType}
                  onSelectRole={setCreateType}
                  onAddNewRole={handleAddNewRoleInline}
                />

                {/* Module Access */}
                <ModuleGrid
                  selected={createModules}
                  onToggle={(key) => toggleModule(createModules, key, setCreateModules)}
                  onToggleAll={() => toggleAllModules(createModules, setCreateModules)}
                />

                {/* Shift Hours & Rostered Off-Days */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span className="material-symbols-outlined text-[16px]">schedule</span>
                    <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                      Workplace Shift & Schedule
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">Shift Start</label>
                      <input
                        type="time"
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                        className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-mono block mb-1">Shift End</label>
                      <input
                        type="time"
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                        className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 font-mono block mb-1">
                      Assigned Off-Days (Rostered)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                        const selected = offDaysChoice.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setOffDaysChoice((prev) =>
                                selected ? prev.filter((d) => d !== day) : [...prev, day]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                              selected
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                : "bg-black/30 border-white/[0.08] text-gray-400 hover:text-white"
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Auto-Generate Employment Agreement Option */}
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-purple-300">
                      <span className="material-symbols-outlined text-[18px]">gavel</span>
                      <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                        Attach Official Employment Agreement
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={createWithAgreement}
                      onChange={(e) => setCreateWithAgreement(e.target.checked)}
                      className="w-4 h-4 accent-purple-500 cursor-pointer"
                    />
                  </div>

                  {createWithAgreement && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">
                          Salary / Retainer
                        </label>
                        <input
                          type="number"
                          value={agreementSalary}
                          onChange={(e) => setAgreementSalary(Number(e.target.value))}
                          className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Currency</label>
                        <select
                          value={agreementCurrency}
                          onChange={(e) => setAgreementCurrency(e.target.value)}
                          className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                        >
                          <option value="BDT">BDT (৳)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 font-mono block mb-1">Contract Model</label>
                        <select
                          value={agreementTypeChoice}
                          onChange={(e) => setAgreementTypeChoice(e.target.value as AgreementType)}
                          className="w-full h-9 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white font-mono focus:outline-none focus:border-purple-400"
                        >
                          <option value="retainer">Monthly Retainer</option>
                          <option value="hourly">Hourly Rate</option>
                          <option value="fixed_completion">Fixed Completion</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Create Button */}
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !createName.trim() || !createPassword.trim() || createModules.length === 0}
                  className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{
                    background: creating ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                    boxShadow: creating ? "none" : "0 0 20px rgba(6,182,212,0.25)",
                  }}
                >
                  {creating ? (
                    <>
                      <HelixLoader size={18} color="#38f2ff" />
                      <span className="text-gray-300">Creating Account…</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">person_add</span>
                      Create Employee Account
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EDIT STAFF MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showEditModal && editingStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              if (!saving) setShowEditModal(false);
            }}
          />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-violet-400 text-xl">edit</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">Edit Employee</h2>
                  <p className="text-[11px] text-gray-400 font-mono">{editingStaff.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
                />
              </div>

              {/* Avatar / Profile Image */}
              <AvatarInput
                avatarUrl={editAvatarUrl}
                onChange={setEditAvatarUrl}
                staffName={editName}
              />

              {/* Password (Admin Can View and Edit) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    Password
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      ADMIN EDITABLE
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEditPass(!showEditPass)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xs">
                      {showEditPass ? "visibility_off" : "visibility"}
                    </span>
                    {showEditPass ? "Hide" : "Show Password"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showEditPass ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="flex-1 h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white font-mono tracking-widest focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEditPassword(generateStaffPassword())}
                    title="Generate new password"
                    className="w-11 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white border border-white/[0.08] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                  </button>
                  {editPassword && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(editPassword, "edit-pass-copy")}
                      title="Copy password"
                      className="w-11 h-11 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-gray-400 hover:text-cyan-300 border border-white/[0.08] flex items-center justify-center transition-all cursor-pointer active:scale-90"
                    >
                      <span className="material-symbols-outlined text-base">
                        {copiedId === "edit-pass-copy" ? "check" : "content_copy"}
                      </span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-mono">
                  Changing the password updates both Firestore and the employee&apos;s login credentials.
                </p>
              </div>

              {/* Searchable Role Selector with Add Role Option */}
              <RoleSelector
                roles={roles}
                selectedRoleKey={editType}
                onSelectRole={setEditType}
                onAddNewRole={handleAddNewRoleInline}
              />

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">Account Status</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditStatus("active")}
                    className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      editStatus === "active"
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400"
                        : "bg-white/[0.02] border-white/[0.08] text-gray-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("suspended")}
                    className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                      editStatus === "suspended"
                        ? "bg-rose-500/10 border-rose-500/40 text-rose-400"
                        : "bg-white/[0.02] border-white/[0.08] text-gray-400 hover:bg-white/[0.04]"
                    }`}
                  >
                    Suspended
                  </button>
                </div>
              </div>

              {/* Module Access */}
              <ModuleGrid
                selected={editModules}
                onToggle={(key) => toggleModule(editModules, key, setEditModules)}
                onToggleAll={() => toggleAllModules(editModules, setEditModules)}
              />

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  background: saving ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                  boxShadow: saving ? "none" : "0 0 20px rgba(6,182,212,0.25)",
                }}
              >
                {saving ? (
                  <>
                    <HelixLoader size={18} color="#38f2ff" />
                    <span className="text-gray-300">Saving…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGN TASK MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAssignTaskModal && taskAssigneeStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !assigningTask && setShowAssignTaskModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">assignment</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Assign Task / Deliverable</h2>
                  <p className="text-xs text-cyan-400 font-mono">Assignee: {taskAssigneeStaff.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignTaskModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignTaskSubmit} className="space-y-4">
              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Task Title (Required)
                </label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  placeholder="e.g. Build Payment Gateway Webhooks Integration"
                  className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                  Task Description & Requirements
                </label>
                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Specify task deliverables, expectations, API docs..."
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as TaskPriority })}
                    className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    placeholder="e.g. Frontend, Backend, QA"
                    className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                    className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Due Time
                  </label>
                  <input
                    type="time"
                    value={taskForm.dueTime}
                    onChange={(e) => setTaskForm({ ...taskForm, dueTime: e.target.value })}
                    className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                    className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl px-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignTaskModal(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningTask || !taskForm.title.trim()}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-xs font-mono font-bold text-white transition-all shadow-lg shadow-cyan-600/20 disabled:opacity-50"
                >
                  {assigningTask ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW EMPLOYEE TASKS & PROGRESS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showTasksModal && tasksStaff && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowTasksModal(false)}
          />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-400 text-xl">checklist</span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Tasks & Deadlines: {tasksStaff.name}</h2>
                  <p className="text-xs text-neutral-400 font-mono">
                    {staffTasksList.length} Total Tasks • {staffTasksList.filter((t) => t.status === "completed").length} Completed
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTasksModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {loadingTasks ? (
              <div className="py-16 flex flex-col items-center justify-center gap-2">
                <HelixLoader size={36} color="#a855f7" />
                <span className="text-xs text-neutral-400 font-mono">Loading employee tasks...</span>
              </div>
            ) : staffTasksList.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 font-mono bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
                No tasks currently assigned to {tasksStaff.name}. Use the &ldquo;Assign Task&rdquo; button to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {staffTasksList.map((task) => (
                  <div
                    key={task.id}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            task.priority === "urgent"
                              ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                              : task.priority === "high"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {task.priority}
                        </span>
                        {task.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/5 text-neutral-400">
                            {task.category}
                          </span>
                        )}
                        <span className="text-xs text-neutral-400 font-mono">
                          Due: {task.dueDate} {task.dueTime ? `@ ${task.dueTime}` : ""}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold ${
                          task.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : task.status === "in_progress"
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                            : task.status === "in_review"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/30"
                            : "bg-white/5 text-neutral-400 border border-white/10"
                        }`}
                      >
                        {TASK_STATUS_LABELS[task.status] || task.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">{task.title}</h4>
                      {task.description && (
                        <p className="text-xs text-neutral-300 mt-1 leading-relaxed">{task.description}</p>
                      )}
                    </div>

                    {/* Progress Bar & Logged Hours */}
                    <div>
                      <div className="flex justify-between text-[11px] text-neutral-400 mb-1 font-mono">
                        <span>Progress: {task.progressPercent || 0}%</span>
                        <span>
                          Hours: {task.actualHours || 0}h logged / {task.estimatedHours || 0}h est.
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                          style={{ width: `${task.progressPercent || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Employee Notes & Submission Link */}
                    {(task.employeeNotes || task.submissionUrl) && (
                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-neutral-300 space-y-1 font-mono">
                        {task.employeeNotes && (
                          <div>
                            <span className="text-neutral-500 font-bold block text-[10px]">Employee Notes:</span>
                            <p className="text-neutral-200 mt-0.5">{task.employeeNotes}</p>
                          </div>
                        )}
                        {task.submissionUrl && (
                          <div className="pt-1">
                            <a
                              href={task.submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <span className="material-symbols-outlined text-sm">link</span>
                              <span>Open Deliverable Submission Link</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Admin Review & Feedback Box */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      {task.adminFeedback && (
                        <div className="text-[11px] text-purple-300 font-mono">
                          <span className="text-neutral-400">Current Feedback:</span> “{task.adminFeedback}”
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Write admin feedback or requested changes..."
                          value={feedbackInputs[task.id] || ""}
                          onChange={(e) =>
                            setFeedbackInputs({ ...feedbackInputs, [task.id]: e.target.value })
                          }
                          className="flex-1 h-9 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-purple-400 font-mono"
                        />
                        <button
                          type="button"
                          disabled={processingTaskId === task.id}
                          onClick={() => handleAdminFeedbackSubmit(task.id)}
                          className="px-3 h-9 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-mono font-medium transition-all"
                        >
                          Send Feedback
                        </button>
                        <button
                          type="button"
                          disabled={processingTaskId === task.id}
                          onClick={() => handleAdminFeedbackSubmit(task.id, "completed")}
                          className="px-3 h-9 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium transition-all"
                        >
                          Mark Completed
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EMPLOYEE EXECUTIVE DETAILS MODAL (VIEW DETAILS)
      ═══════════════════════════════════════════════════════════════════ */}
      {selectedDetailStaff && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setSelectedDetailStaff(null)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.1] shadow-2xl space-y-6 themed-scroll">
            {/* Header Banner */}
            <div className="relative p-6 sm:p-7 bg-gradient-to-br from-cyan-600/20 via-[#0c0c16] to-purple-600/15 border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => setSelectedDetailStaff(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-400/40 flex items-center justify-center flex-shrink-0 shadow-lg">
                    {selectedDetailStaff.avatarUrl ? (
                      <img
                        src={selectedDetailStaff.avatarUrl}
                        alt={selectedDetailStaff.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {selectedDetailStaff.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                        Employee Dossier
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          selectedDetailStaff.status === "active"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedDetailStaff.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                          }`}
                        />
                        {selectedDetailStaff.status === "active" ? "Active" : "Suspended"}
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                      {selectedDetailStaff.name}
                    </h2>
                    <p className="text-xs font-mono text-gray-400 mt-0.5">
                      Joined on {new Date(selectedDetailStaff.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Role Pill */}
                <div className="sm:text-right">
                  {(() => {
                    const c = getRoleBadgeColor(selectedDetailStaff.staffType, roles);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${c.bg} ${c.text} ${c.border}`}>
                        <span className="material-symbols-outlined text-sm">badge</span>
                        {getRoleLabel(selectedDetailStaff.staffType, roles)}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-7 space-y-6 pt-0">
              {/* 1. Admin Credentials & System Identity */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-sm">key</span>
                    <span>Admin Security Credentials</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Admin Eyes Only
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Email */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Login Email</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white truncate">{selectedDetailStaff.email}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedDetailStaff.email, `det-email-${selectedDetailStaff.id}`)}
                        className="text-gray-400 hover:text-cyan-300 p-1 rounded transition"
                        title="Copy email"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === `det-email-${selectedDetailStaff.id}` ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Password</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-cyan-300 select-all font-mono font-bold">
                        {revealedPasswords[selectedDetailStaff.id]
                          ? (selectedDetailStaff.password || "Not recorded")
                          : "••••••••••••"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordReveal(selectedDetailStaff.id)}
                          className="text-gray-400 hover:text-white p-1 rounded transition"
                          title="Toggle visibility"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {revealedPasswords[selectedDetailStaff.id] ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                        {selectedDetailStaff.password && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(selectedDetailStaff.password || "", `det-pwd-${selectedDetailStaff.id}`)}
                            className="text-gray-400 hover:text-cyan-300 p-1 rounded transition"
                            title="Copy password"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {copiedId === `det-pwd-${selectedDetailStaff.id}` ? "check" : "content_copy"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Shift Schedule & Official Agreement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Working Timetable */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-purple-400 text-sm">schedule</span>
                    <span>Shift Timetable & Roster</span>
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Shift Timings:</span>
                      <span className="text-white font-semibold">
                        {selectedDetailStaff.shiftHours
                          ? `${selectedDetailStaff.shiftHours.start} - ${selectedDetailStaff.shiftHours.end}`
                          : "09:00 AM - 06:00 PM"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Off-Days:</span>
                      <span className="text-cyan-300 font-semibold">
                        {(selectedDetailStaff.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employment Agreement */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">verified_user</span>
                    <span>Official Agreement</span>
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Status:</span>
                      <span className="text-emerald-400 font-semibold">
                        {selectedDetailStaff.agreementId ? "Active Agreement Attached" : "Standard Retainer"}
                      </span>
                    </div>
                    <div className="pt-1">
                      <Link
                        href={selectedDetailStaff.agreementId ? `/admin/agreements` : `/admin/agreements`}
                        className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">description</span>
                        <span>Manage Agreement Documents →</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. System Module Permissions */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-sm">lock_open</span>
                    <span>Authorized Modules ({selectedDetailStaff.allowedModules.length})</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDetailStaff.allowedModules.map((key) => {
                    const cfg = MODULE_CONFIG[key];
                    if (!cfg) return null;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono bg-white/[0.04] border border-white/[0.08]"
                        style={{ color: cfg.color }}
                      >
                        <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                        {cfg.label}
                      </span>
                    );
                  })}
                  {selectedDetailStaff.allowedModules.length === 0 && (
                    <span className="text-xs text-gray-500 italic">No module permissions assigned.</span>
                  )}
                </div>
              </div>

              {/* 4. Active Tasks Preview */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-purple-400 text-sm">task_alt</span>
                    <span>Assigned Tasks & Sprints</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const member = selectedDetailStaff;
                      setSelectedDetailStaff(null);
                      openAssignTaskModal(member);
                    }}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono font-semibold flex items-center gap-1"
                  >
                    <span>+ Assign New Task</span>
                  </button>
                </div>

                {loadingDetailTasks ? (
                  <div className="py-4 text-center text-xs text-gray-400 font-mono">
                    Loading task status...
                  </div>
                ) : detailStaffTasks.length === 0 ? (
                  <div className="py-3 text-xs text-gray-500 font-mono italic">
                    No active tasks assigned to this employee.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailStaffTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="min-w-0">
                          <p className="text-white font-semibold truncate">{t.title}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Due: {t.dueDate} • Priority: <span className="uppercase text-purple-400">{t.priority}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.05] text-cyan-300">
                            {t.progressPercent}%
                          </span>
                          <span className="capitalize px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20">
                            {t.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const member = selectedDetailStaff;
                      setSelectedDetailStaff(null);
                      openEditModal(member);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-xs font-mono font-semibold text-white transition cursor-pointer"
                  >
                    Edit Profile
                  </button>
                  <Link
                    href={`/admin/manage-attendance`}
                    className="px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-xs font-mono font-semibold text-violet-300 transition"
                  >
                    View Attendance
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailStaff(null)}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90 text-slate-950 font-bold text-xs font-mono transition cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
