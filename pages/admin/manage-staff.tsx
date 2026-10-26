import AppOSPermissions from "@/components/appos/AppOSPermissions";
import { emptyAppOSAccess } from "@/lib/appos/catalog";
import type { AppOSAccess } from "@/types/appos";
import TaskAssignmentSheet from "@/components/admin/TaskAssignmentSheet";
import { EmployeeDialog, EmployeeIcon } from "@/components/staff/EmployeeUI";
import StaffAvatar from "@/components/staff/StaffAvatar";
import manageStyles from "@/components/staff/StaffManagement.module.css";
import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  getStaffMembers,
  subscribeStaffMembers,
  createStaffAccount,
  updateStaffMember,
  deleteStaffMember,
  generateStaffEmail,
  generateStaffPassword,
  uploadStaffAvatar,
  getStaffRoles,
  createStaffRole,
} from "@/lib/services/staffService";
import type {
  StaffMember,
  StaffRole,
  StaffStatus,
  EmploymentType,
  EmergencyContact,
  SalaryManagement,
} from "@/types/staff";
import {
  MODULE_CONFIG,
  getRoleLabel,
  getRoleBadgeColor,
  calculateStaffCompleteness,
} from "@/types/staff";
import { STUDIO_MODULES } from "@/lib/staffModules";
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
import AttachmentPicker from "@/components/common/AttachmentPicker";
import AttachmentList from "@/components/common/AttachmentList";
import type {
  EmployeeTask,
  TaskPriority,
  TaskStatus,
  EcoAttachment,
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
      <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider block">
        Employee Role
      </label>

      {/* Trigger Button */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="w-full min-h-[46px] bg-[var(--devengine-raised)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/60 rounded-xl px-3.5 py-1.5 flex items-center justify-between text-left transition-all cursor-pointer shadow-sm select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium shrink-0"
            style={{
              backgroundColor: selectedBadgeColor.hex ? `${selectedBadgeColor.hex}18` : "rgba(44, 236, 247, 0.12)",
              color: selectedBadgeColor.hex || "#2cecf7",
              borderColor: selectedBadgeColor.hex ? `${selectedBadgeColor.hex}40` : "rgba(44, 236, 247, 0.3)",
            }}
          >
            <span className="material-symbols-outlined text-xs">badge</span>
            {selectedLabel}
          </span>
          {selectedRole?.description && (
            <span className="text-[11px] text-[var(--devengine-muted)] font-mono truncate hidden sm:inline">
              — {selectedRole.description}
            </span>
          )}
        </div>
        <span
          className={`material-symbols-outlined text-[var(--devengine-muted)] text-base transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-[#2cecf7]" : ""
          }`}
        >
          expand_more
        </span>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 p-2.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-2xl shadow-2xl space-y-2 backdrop-blur-2xl">
          {/* Search Input */}
          <div className="relative">
            <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              search
            </span>
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search role or type custom name..."
              className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl pl-9 pr-3 text-xs text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] focus:outline-none font-mono transition-colors"
            />
          </div>

          {/* Role List */}
          <div className="max-h-56 overflow-y-auto themed-scroll space-y-1 pr-1">
            {filtered.map((role) => {
              const isSelected = role.key === selectedRoleKey;
              const color = getRoleBadgeColor(role.key, roles);

              return (
                <div
                  key={role.key}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    onSelectRole(role.key);
                    setIsOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectRole(role.key);
                      setIsOpen(false);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer select-none ${
                    isSelected
                      ? "bg-[#2cecf7]/12 border border-[#2cecf7]/40 shadow-sm"
                      : "hover:bg-[var(--devengine-raised)] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium shrink-0"
                      style={{
                        backgroundColor: color.hex ? `${color.hex}18` : "rgba(44, 236, 247, 0.12)",
                        color: color.hex || "#2cecf7",
                        borderColor: color.hex ? `${color.hex}40` : "rgba(44, 236, 247, 0.3)",
                      }}
                    >
                      <span className="material-symbols-outlined text-xs">badge</span>
                      {role.label}
                    </span>
                    {role.description ? (
                      <span className="text-[11px] text-[var(--devengine-muted)] truncate max-w-[220px]">
                        {role.description}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--devengine-muted)] font-mono truncate uppercase opacity-60">
                        {role.key}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[#2cecf7] text-base shrink-0">
                      check_circle
                    </span>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && !searchTerm.trim() && (
              <p className="text-xs text-[var(--devengine-muted)] font-mono text-center py-4">No roles found.</p>
            )}

            {/* Create new role option if no exact match */}
            {searchTerm.trim() && !exactMatch && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleCreate}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#2cecf7]/10 hover:bg-[#2cecf7]/20 border border-[#2cecf7]/30 text-[#2cecf7] text-xs font-mono transition-all cursor-pointer select-none ${
                  isCreatingRole ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {isCreatingRole ? (
                  <>
                    <HelixLoader size={14} color="#2cecf7" />
                    <span>Creating role &quot;{searchTerm.trim()}&quot;…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    <span>
                      Add new role: <strong className="text-[var(--devengine-text)] font-semibold">&quot;{searchTerm.trim()}&quot;</strong>
                    </span>
                  </>
                )}
              </div>
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
    <div className="space-y-2.5 p-3.5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider flex items-center gap-1.5">
          Profile Image
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--devengine-soft)] text-[var(--devengine-muted)] border border-[var(--devengine-border)]">File & Link</span>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
              mode === "upload"
                ? "bg-[#2cecf7] text-[#02040a] font-bold"
                : "text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
            }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium transition-all cursor-pointer ${
              mode === "url"
                ? "bg-[#2cecf7] text-[#02040a] font-bold"
                : "text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
            }`}
          >
            Image URL
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Preview circle */}
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-[var(--devengine-surface)] border border-[var(--devengine-border)] flex items-center justify-center flex-shrink-0 shadow-sm">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Avatar preview"
              className="w-full h-full object-cover"
              onError={() => onChange("")}
            />
          ) : (
            <span className="text-base font-bold text-[var(--devengine-text)]">{initial}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <HelixLoader size={16} color="#2cecf7" />
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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--devengine-surface)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-text)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 text-xs font-mono cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm text-[#2cecf7]">upload_file</span>
                  {uploading ? "Uploading…" : avatarUrl ? "Change Photo" : "Upload File"}
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="p-1.5 rounded-xl bg-[var(--devengine-surface)] hover:bg-rose-500/10 text-[var(--devengine-muted)] hover:text-rose-400 border border-[var(--devengine-border)] transition-colors cursor-pointer"
                    title="Remove Avatar"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-[var(--devengine-muted)] mt-1 font-mono">PNG, JPG, WEBP up to 10MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => onChange(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full h-9 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] font-mono focus:outline-none transition-colors"
              />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="p-2 rounded-xl bg-[var(--devengine-surface)] hover:bg-rose-500/10 text-[var(--devengine-muted)] hover:text-rose-400 border border-[var(--devengine-border)] transition-colors cursor-pointer shrink-0"
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

// ── Module & Sub-Module Checkbox Grid ──
interface ModuleGridProps {
  selected: string[];
  subModules: Record<string, string[]>;
  expandedModules: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onToggleModule: (key: string) => void;
  onToggleSubModule: (moduleKey: string, href: string) => void;
  onToggleAllSubModules: (moduleKey: string) => void;
  onToggleAll: () => void;
}

function ModuleGrid({
  selected,
  subModules,
  expandedModules,
  onToggleExpand,
  onToggleModule,
  onToggleSubModule,
  onToggleAllSubModules,
  onToggleAll,
}: ModuleGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-[var(--devengine-muted)] font-mono uppercase tracking-wider block font-bold">
            Module & Sub-module Access
          </span>
          <span className="text-[11px] text-[var(--devengine-muted)] opacity-75">
            Expand any module to customize granular permissions
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] font-bold text-[#2cecf7] hover:underline transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#2cecf7]/10"
        >
          {selected.length === ALL_MODULE_KEYS.length ? "Deselect All Modules" : "Select All Modules"}
        </button>
      </div>

      <div className="space-y-2.5">
        {ALL_MODULE_KEYS.map((key) => {
          const cfg = MODULE_CONFIG[key];
          const studioMod = STUDIO_MODULES.find((m) => m.key === key);
          const isChecked = selected.includes(key);
          const isExpanded = !!expandedModules[key];
          const items = studioMod ? studioMod.items : [];
          const allowedSubs = subModules[key] !== undefined
            ? subModules[key]
            : (isChecked ? items.map((i) => i.href) : []);
          const allSubsSelected = items.length > 0 && items.every((i) => allowedSubs.includes(i.href));
          const subCount = allowedSubs.length;

          return (
            <div
              key={key}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isChecked
                  ? "bg-[var(--devengine-surface)] border-[#2cecf7]/30 shadow-sm"
                  : "bg-[var(--devengine-surface)] border-[var(--devengine-border)] opacity-85 hover:opacity-100"
              }`}
            >
              {/* Module Header Row */}
              <div className="flex items-center justify-between p-3 sm:p-3.5 gap-3">
                {/* Left: Icon, Label, Description & Counter */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onToggleModule(key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onToggleModule(key);
                    }
                  }}
                  className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer select-none"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}
                  >
                    <span className="material-symbols-outlined text-lg">{cfg.icon}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isChecked ? "text-[var(--devengine-text)]" : "text-[var(--devengine-muted)]"}`}>
                        {cfg.label}
                      </span>
                      {isChecked && (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border"
                          style={{
                            backgroundColor: allSubsSelected ? "rgba(44, 236, 247, 0.12)" : "rgba(245, 158, 11, 0.12)",
                            borderColor: allSubsSelected ? "rgba(44, 236, 247, 0.35)" : "rgba(245, 158, 11, 0.35)",
                            color: allSubsSelected ? "#2cecf7" : "#f59e0b",
                          }}
                        >
                          {allSubsSelected ? `All ${items.length} options` : `${subCount}/${items.length} sub-modules`}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--devengine-muted)] block truncate opacity-75 mt-0.5">
                      {cfg.description}
                    </span>
                  </div>
                </div>

                {/* Right: Expand Button & Module Checkbox */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Expand/Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleExpand(key);
                    }}
                    title={isExpanded ? "Collapse sub-modules" : "Customize sub-module permissions"}
                    className={`h-7 px-2.5 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-all cursor-pointer ${
                      isExpanded
                        ? "bg-[#2cecf7]/15 border-[#2cecf7]/40 text-[#2cecf7]"
                        : "bg-[var(--devengine-raised)] border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:border-[#2cecf7]/30"
                    }`}
                  >
                    <span>{isExpanded ? "Hide" : "Expand"}</span>
                    <span className="material-symbols-outlined text-sm">
                      {isExpanded ? "expand_less" : "expand_more"}
                    </span>
                  </button>

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => onToggleModule(key)}
                    aria-label={`Toggle ${cfg.label} module`}
                    className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                      isChecked
                        ? "bg-[#2cecf7] border-[#2cecf7] shadow-sm shadow-[#2cecf7]/30"
                        : "border-[var(--devengine-border)] bg-[var(--devengine-raised)] hover:border-[#2cecf7]/40"
                    }`}
                  >
                    {isChecked && (
                      <span className="material-symbols-outlined text-[#02040a] text-sm font-bold">check</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Sub-modules Expandable Section */}
              {isExpanded && (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 pt-1 border-t border-[var(--devengine-border)]/60 bg-[var(--devengine-raised)]/40">
                  <div className="flex items-center justify-between py-2 border-b border-[var(--devengine-border)]/40 mb-2">
                    <span className="text-[11px] font-mono font-medium text-[var(--devengine-muted)] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">account_tree</span>
                      Sub-module options ({items.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleAllSubModules(key)}
                      className="text-[11px] font-semibold text-[#2cecf7] hover:underline cursor-pointer"
                    >
                      {allSubsSelected ? "Deselect All Sub-items" : "Select All Sub-items"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto themed-scroll pr-1">
                    {items.map((subItem) => {
                      const isSubChecked = allowedSubs.includes(subItem.href);
                      return (
                        <div
                          key={subItem.href}
                          role="button"
                          tabIndex={0}
                          onClick={() => onToggleSubModule(key, subItem.href)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onToggleSubModule(key, subItem.href);
                            }
                          }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                            isSubChecked
                              ? "bg-[#2cecf7]/12 border-[#2cecf7]/45 shadow-xs"
                              : "bg-[var(--devengine-surface)] border-[var(--devengine-border)] hover:border-[#2cecf7]/30"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isSubChecked
                                ? "bg-[#2cecf7] border-[#2cecf7]"
                                : "border-[var(--devengine-border)] bg-[var(--devengine-raised)]"
                            }`}
                          >
                            {isSubChecked && (
                              <span className="material-symbols-outlined text-[#02040a] text-[11px] font-bold">check</span>
                            )}
                          </div>
                          <span
                            className={`text-xs leading-snug break-words flex-1 ${
                              isSubChecked ? "text-[var(--devengine-text)] font-semibold" : "text-[var(--devengine-muted)]"
                            }`}
                          >
                            {subItem.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function ManageStaffPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<StaffRole[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

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
  const [createAppOS, setCreateAppOS] = useState<AppOSAccess>(emptyAppOSAccess);
  const [createSubModules, setCreateSubModules] = useState<Record<string, string[]>>({});
  const [createExpandedModules, setCreateExpandedModules] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);

  // Agreement and Shift options during creation
  const [createWithAgreement, setCreateWithAgreement] = useState(true);
  const [agreementSalary, setAgreementSalary] = useState(50000);
  const [agreementCurrency, setAgreementCurrency] = useState("BDT");
  const [agreementTypeChoice, setAgreementTypeChoice] = useState<AgreementType>("retainer");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("18:00");
  const [offDaysChoice, setOffDaysChoice] = useState<string[]>(["Friday", "Saturday"]);

  // Onboarding, Tenure & HR Details during creation
  const [createEmploymentType, setCreateEmploymentType] = useState<EmploymentType>("probation");
  const [createJoiningDate, setCreateJoiningDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [createProbationMonths, setCreateProbationMonths] = useState<number>(3);
  const [createNoticeDays, setCreateNoticeDays] = useState<number>(30);

  // Salary Breakdown Management
  const [createBasicSalary, setCreateBasicSalary] = useState<number>(35000);
  const [createHouseRent, setCreateHouseRent] = useState<number>(10000);
  const [createMedical, setCreateMedical] = useState<number>(5000);
  const [createPaymentMethod, setCreatePaymentMethod] = useState<string>("");
  const [createBankDetails, setCreateBankDetails] = useState<string>("");

  // Emergency Contact
  const [createEmergencyName, setCreateEmergencyName] = useState<string>("");
  const [createEmergencyRel, setCreateEmergencyRel] = useState<string>("");
  const [createEmergencyPhone, setCreateEmergencyPhone] = useState<string>("");

  // Calculated values for creation
  const grossCalculatedSalary = useMemo(() => {
    return (Number(createBasicSalary) || 0) + (Number(createHouseRent) || 0) + (Number(createMedical) || 0);
  }, [createBasicSalary, createHouseRent, createMedical]);

  const calculatedProbationEndDate = useMemo(() => {
    if (!createJoiningDate || createEmploymentType !== "probation") return "";
    try {
      const d = new Date(createJoiningDate);
      d.setMonth(d.getMonth() + Number(createProbationMonths || 3));
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  }, [createJoiningDate, createProbationMonths, createEmploymentType]);

  // Task assignment modal
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);
  const [taskAssigneeStaff, setTaskAssigneeStaff] = useState<StaffMember | null>(null);
  const [taskForm, setTaskForm] = useState<{
    title: string;
    description: string;
    priority: TaskPriority;
    category: string;
    startDate: string;
    startTime: string;
    dueDate: string;
    dueTime: string;
    estimatedHours: number;
    adminAttachments?: EcoAttachment[];
  }>({
    title: "",
    description: "",
    priority: "normal",
    category: "General",
    startDate: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    dueTime: "18:00",
    estimatedHours: 8,
    adminAttachments: [],
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
  const [editAppOS, setEditAppOS] = useState<AppOSAccess>(emptyAppOSAccess);
  const [editSubModules, setEditSubModules] = useState<Record<string, string[]>>({});
  const [editExpandedModules, setEditExpandedModules] = useState<Record<string, boolean>>({});
  const [editStatus, setEditStatus] = useState<StaffStatus>("active");
  const [editSuspensionReason, setEditSuspensionReason] = useState("");
  const [editError, setEditError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [suspensionTarget, setSuspensionTarget] = useState<StaffMember | null>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [suspensionError, setSuspensionError] = useState("");
  const [editEmploymentType, setEditEmploymentType] = useState<EmploymentType>("permanent");
  const [editJoiningDate, setEditJoiningDate] = useState<string>("");
  const [editProbationMonths, setEditProbationMonths] = useState<number>(3);
  const [editEmergencyName, setEditEmergencyName] = useState<string>("");
  const [editEmergencyRel, setEditEmergencyRel] = useState<string>("Spouse");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState<string>("");
  const [editBasicSalary, setEditBasicSalary] = useState<number>(0);
  const [editHouseRent, setEditHouseRent] = useState<number>(0);
  const [editMedical, setEditMedical] = useState<number>(0);
  const [editGrossSalary, setEditGrossSalary] = useState<number>(0);
  const [editCurrency, setEditCurrency] = useState<string>("BDT");
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>("bank_transfer");
  const [editBankDetails, setEditBankDetails] = useState<string>("");
  const [editNoticeDays, setEditNoticeDays] = useState<number>(30);
  const [editResignationStatus, setEditResignationStatus] = useState<string>("none");
  const [editLastWorkingDay, setEditLastWorkingDay] = useState<string>("");
  const [editResignationReason, setEditResignationReason] = useState<string>("");
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

  // ── Load staff and roles with live real-time subscription ──
  const loadData = useCallback(async () => {
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
    if (!authReady || !isAdmin) return;
    setLoading(true);
    getStaffRoles().then(setRoles).catch(console.error);

    // Live subscription: admin gets instant real-time updates when an employee updates profile
    const unsubscribe = subscribeStaffMembers((liveStaff) => {
      setStaff(liveStaff);
      setLoading(false);
      setSelectedDetailStaff((prev) => {
        if (!prev) return null;
        const fresh = liveStaff.find((s) => s.id === prev.id || s.uid === prev.uid);
        return fresh || prev;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [authReady, isAdmin]);

  // ── Open staff details from query parameter (e.g. from chat view profile) ──
  useEffect(() => {
    const targetId = typeof router.query.employeeId === 'string' ? router.query.employeeId : '';
    if (targetId && staff.length > 0 && !selectedDetailStaff) {
      const match = staff.find((s) => s.id === targetId || s.uid === targetId);
      if (match) {
        void openEmployeeDetailsModal(match);
      }
    }
  }, [router.query.employeeId, staff, selectedDetailStaff]);

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
    setCreateAppOS(emptyAppOSAccess());
    setCreateName("");
    setCreateEmail("");
    setCreatePassword(generateStaffPassword());
    setCreateAvatarUrl("");
    const firstRole = roles.length > 0 ? roles[0] : null;
    const defaultType = firstRole ? firstRole.key : "developer";
    setCreateType(defaultType);
    const initMods = firstRole?.defaultModules && firstRole.defaultModules.length > 0
      ? [...firstRole.defaultModules]
      : ["overview"];
    setCreateModules(initMods);
    const subMap: Record<string, string[]> = {};
    initMods.forEach((modKey) => {
      if (firstRole?.defaultSubModules && firstRole.defaultSubModules[modKey] && firstRole.defaultSubModules[modKey].length > 0) {
        subMap[modKey] = [...firstRole.defaultSubModules[modKey]];
      } else {
        const mod = STUDIO_MODULES.find((m) => m.key === modKey);
        if (mod) subMap[modKey] = mod.items.map((i) => i.href);
      }
    });
    setCreateSubModules(subMap);
    setCreateExpandedModules({});
    setCreatePaymentMethod("");
    setCreateBankDetails("");
    setCreateEmergencyName("");
    setCreateEmergencyRel("");
    setCreateEmergencyPhone("");
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
              phone: createEmergencyPhone.trim(),
              address: "",
              emergencyContact: createEmergencyName.trim()
                ? `${createEmergencyName.trim()} (${createEmergencyRel}) - ${createEmergencyPhone.trim()}`
                : "",
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
              monthlyRetainerAmount: grossCalculatedSalary || agreementSalary,
              fixedAmount: grossCalculatedSalary || agreementSalary,
              totalContractValue: (grossCalculatedSalary || agreementSalary) * 12,
              paymentFrequency: "Monthly",
              availabilityHoursPerWeek: 40,
            },
            deliverables: [],
            terms: {
              noticePeriodDays: createNoticeDays,
              bugFixPeriodDays: 30,
              confidentialityDurationYears: 3,
              paymentDuePeriodDays: 7,
              acceptancePeriodDays: 7,
              terminationNoticeDays: createNoticeDays,
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
        allowedSubModules: createSubModules,
        apposAccess: createAppOS,
        assignedOffDays: offDaysChoice,
        shiftHours: { start: shiftStart, end: shiftEnd, name: "Standard Shift" },
        agreementId,
        employmentType: createEmploymentType,
        joiningDate: createJoiningDate,
        probationPeriodMonths: createEmploymentType === "probation" ? Number(createProbationMonths) : undefined,
        probationEndDate: createEmploymentType === "probation" ? calculatedProbationEndDate : undefined,
        emergencyContact: createEmergencyName.trim()
          ? {
              name: createEmergencyName.trim(),
              relationship: createEmergencyRel.trim(),
              phone: createEmergencyPhone.trim(),
            }
          : undefined,
        salaryManagement: {
          basicSalary: Number(createBasicSalary) || 0,
          houseRent: Number(createHouseRent) || 0,
          medical: Number(createMedical) || 0,
          grossSalary: grossCalculatedSalary,
          currency: agreementCurrency,
          paymentMethod: createPaymentMethod,
          bankDetails: createBankDetails.trim(),
          noticePeriodDays: Number(createNoticeDays) || 30,
        },
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
      startDate: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
      dueTime: "18:00",
      estimatedHours: 8,
      adminAttachments: [],
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
        startDate: taskForm.startDate,
        startTime: taskForm.startTime,
        dueDate: taskForm.dueDate,
        dueTime: taskForm.dueTime,
        estimatedHours: taskForm.estimatedHours,
        adminAttachments: taskForm.adminAttachments || [],
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
    setEditAppOS(structuredClone(member.apposAccess || emptyAppOSAccess()));
    setEditName(member.name);
    setEditPassword(member.password || "");
    setEditAvatarUrl(member.avatarUrl || "");
    setEditType(member.staffType);
    setEditModules([...(member.allowedModules || [])]);
    const initialEditSub: Record<string, string[]> = {};
    (member.allowedModules || []).forEach((modKey) => {
      if (member.allowedSubModules && member.allowedSubModules[modKey] && member.allowedSubModules[modKey].length > 0) {
        initialEditSub[modKey] = [...member.allowedSubModules[modKey]];
      } else {
        const mod = STUDIO_MODULES.find((m) => m.key === modKey);
        if (mod) {
          initialEditSub[modKey] = mod.items.map((i) => i.href);
        }
      }
    });
    setEditSubModules(initialEditSub);
    setEditStatus(member.status);
    setEditSuspensionReason(member.suspensionReason || "");
    setEditError("");
    setEditEmploymentType(member.employmentType || "permanent");
    setEditJoiningDate(member.joiningDate || (member.createdAt ? member.createdAt.split("T")[0] : ""));
    setEditProbationMonths(member.probationPeriodMonths || 3);
    setEditEmergencyName(member.emergencyContact?.name || "");
    setEditEmergencyRel(member.emergencyContact?.relationship || "Spouse");
    setEditEmergencyPhone(member.emergencyContact?.phone || "");
    setEditBasicSalary(member.salaryManagement?.basicSalary || 0);
    setEditHouseRent(member.salaryManagement?.houseRent || 0);
    setEditMedical(member.salaryManagement?.medical || 0);
    setEditGrossSalary(member.salaryManagement?.grossSalary || 0);
    setEditCurrency(member.salaryManagement?.currency || "BDT");
    setEditPaymentMethod(member.salaryManagement?.paymentMethod || "bank_transfer");
    setEditBankDetails(member.salaryManagement?.bankDetails || "");
    setEditNoticeDays(member.salaryManagement?.noticePeriodDays || 30);
    setEditResignationStatus(member.resignationDetails?.status || "none");
    setEditLastWorkingDay(member.resignationDetails?.lastWorkingDay || "");
    setEditResignationReason(member.resignationDetails?.reason || "");
    setShowEditPass(false);
    setEditExpandedModules({});
    setShowEditModal(true);
  };

  // ── Save edit ──
  const handleSaveEdit = async () => {
    if (!editingStaff || saving) return;
    setEditError("");
    if (!editName.trim()) { setEditError("Enter the employee's full name."); return; }
    if (editStatus === "suspended" && !editSuspensionReason.trim()) { setEditError("Add a reason before suspending this employee."); return; }
    setSaving(true);
    try {
      const calculatedGross = Number(editGrossSalary) > 0 ? Number(editGrossSalary) : (Number(editBasicSalary) || 0) + (Number(editHouseRent) || 0) + (Number(editMedical) || 0);
      const changes: Partial<StaffMember> = {
          name: editName.trim() || editingStaff.name,
          password: editPassword,
          avatarUrl: editAvatarUrl,
          staffType: editType,
          allowedModules: editModules,
          allowedSubModules: editSubModules,
          apposAccess: editAppOS,
          status: editStatus,
          suspensionReason: editStatus === "suspended" ? editSuspensionReason.trim() : undefined,
          suspendedBy: editStatus === "suspended" ? auth.currentUser?.uid : undefined,
          suspendedAt: editStatus === "suspended" ? editingStaff.suspendedAt || new Date().toISOString() : undefined,
          employmentType: editEmploymentType,
          joiningDate: editJoiningDate,
          probationPeriodMonths: editEmploymentType === "probation" ? Number(editProbationMonths) : undefined,
          emergencyContact: editEmergencyName.trim()
            ? {
                name: editEmergencyName.trim(),
                relationship: editEmergencyRel.trim(),
                phone: editEmergencyPhone.trim(),
              }
            : undefined,
          salaryManagement: {
            basicSalary: Number(editBasicSalary) || 0,
            houseRent: Number(editHouseRent) || 0,
            medical: Number(editMedical) || 0,
            grossSalary: calculatedGross,
            currency: editCurrency,
            paymentMethod: editPaymentMethod,
            bankDetails: editBankDetails.trim(),
            noticePeriodDays: Number(editNoticeDays) || 30,
          },
          resignationDetails:
            editResignationStatus !== "none"
              ? {
                  status: editResignationStatus as any,
                  lastWorkingDay: editLastWorkingDay,
                  reason: editResignationReason.trim(),
                  resignedAt: editingStaff.resignationDetails?.resignedAt || new Date().toISOString(),
                }
              : undefined,
        };
      await updateStaffMember(editingStaff.id, changes, { email: editingStaff.email, oldPassword: editingStaff.password });
      const updated = { ...editingStaff, ...changes, updatedAt: new Date().toISOString() };
      setStaff(current => current.map(member => member.id === editingStaff.id ? updated : member));
      setSelectedDetailStaff(current => current?.id === editingStaff.id ? updated : current);
      setShowEditModal(false);
      setEditingStaff(null);
      setSuccessMessage(`${updated.name}'s profile and employment details have been saved.`);
    } catch (error) {
      console.error("Employee update failed:", error);
      setEditError(error instanceof Error ? error.message : "The employee could not be saved. Please retry.");
    } finally { setSaving(false); }
  };

  // ── Toggle suspend ──
  const handleToggleSuspend = async (member: StaffMember) => {
    if (member.status === "active") { setSuspensionTarget(member); setSuspensionReason(""); setSuspensionError(""); return; }
    setActionInProgress(member.id);
    try {
      await updateStaffMember(member.id, { status: "active" });
      setStaff(current => current.map(item => item.id === member.id ? { ...item, status: "active", suspensionReason: undefined, suspendedAt: undefined, suspendedBy: undefined } : item));
      setSuccessMessage(`${member.name}'s account has been reactivated.`);
    } catch (error) { setNotice({ type: "error", text: error instanceof Error ? error.message : "Failed to restore account access." }); }
    finally { setActionInProgress(null); }
  };
  const confirmSuspension = async () => {
    if (!suspensionTarget || actionInProgress) return;
    if (!suspensionReason.trim()) { setSuspensionError("Enter a reason for suspension."); return; }
    const target = suspensionTarget;
    setActionInProgress(target.id);
    try {
      await updateStaffMember(target.id, { status: "suspended", suspensionReason: suspensionReason.trim() });
      setStaff(current => current.map(item => item.id === target.id ? { ...item, status: "suspended", suspensionReason: suspensionReason.trim() } : item));
      setSuspensionTarget(null);
      setSuccessMessage(`${target.name}'s account has been suspended. The employee will be signed out.`);
    } catch (error) { setSuspensionError(error instanceof Error ? error.message : "Could not suspend the employee. Please retry."); }
    finally { setActionInProgress(null); }
  };

  // ── Delete ──
  const handleDelete = async (member: StaffMember) => {
    setDeleteError("");
    setActionInProgress(member.id);
    try {
      await deleteStaffMember(member.id);
      setDeleteTarget(null);
      setStaff(current => current.filter(item => item.id !== member.id));
      setSuccessMessage(`${member.name} was permanently removed from employees.`);
      await loadData();
    } catch {
      setDeleteError("Could not delete this employee. Please retry.");
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

  // ── Module & Sub-module toggles ──
  const handleToggleModule = (
    modules: string[],
    setModules: React.Dispatch<React.SetStateAction<string[]>>,
    subMods: Record<string, string[]>,
    setSubMods: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    key: string
  ) => {
    if (modules.includes(key)) {
      setModules(modules.filter((m) => m !== key));
      setSubMods((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setModules([...modules, key]);
      const mod = STUDIO_MODULES.find((m) => m.key === key);
      if (mod) {
        setSubMods((prev) => ({
          ...prev,
          [key]: mod.items.map((i) => i.href),
        }));
      }
    }
  };

  const handleToggleSubModule = (
    modules: string[],
    setModules: React.Dispatch<React.SetStateAction<string[]>>,
    subMods: Record<string, string[]>,
    setSubMods: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    moduleKey: string,
    href: string
  ) => {
    const mod = STUDIO_MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;

    if (!modules.includes(moduleKey)) {
      setModules((prev) => [...prev, moduleKey]);
    }

    setSubMods((prev) => {
      const currentSubs = prev[moduleKey] !== undefined ? [...prev[moduleKey]] : mod.items.map((i) => i.href);
      const updatedSubs = currentSubs.includes(href)
        ? currentSubs.filter((h) => h !== href)
        : [...currentSubs, href];
      return {
        ...prev,
        [moduleKey]: updatedSubs,
      };
    });
  };

  const handleToggleAllSubModulesForModule = (
    modules: string[],
    setModules: React.Dispatch<React.SetStateAction<string[]>>,
    subMods: Record<string, string[]>,
    setSubMods: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    moduleKey: string
  ) => {
    const mod = STUDIO_MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;

    const allHrefs = mod.items.map((i) => i.href);
    const currentSubs = subMods[moduleKey] !== undefined ? subMods[moduleKey] : allHrefs;
    const isAllSelected = allHrefs.length > 0 && allHrefs.every((h) => currentSubs.includes(h));

    if (isAllSelected) {
      setSubMods((prev) => ({
        ...prev,
        [moduleKey]: [],
      }));
    } else {
      if (!modules.includes(moduleKey)) {
        setModules((prev) => [...prev, moduleKey]);
      }
      setSubMods((prev) => ({
        ...prev,
        [moduleKey]: allHrefs,
      }));
    }
  };

  const toggleCreateExpand = (key: string) => {
    setCreateExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleEditExpand = (key: string) => {
    setEditExpandedModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleToggleAllGlobal = (
    modules: string[],
    setModules: React.Dispatch<React.SetStateAction<string[]>>,
    setSubMods: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  ) => {
    if (modules.length === ALL_MODULE_KEYS.length) {
      setModules([]);
      setSubMods({});
    } else {
      setModules([...ALL_MODULE_KEYS]);
      const allSubMap: Record<string, string[]> = {};
      STUDIO_MODULES.forEach((mod) => {
        allSubMap[mod.key] = mod.items.map((i) => i.href);
      });
      setSubMods(allSubMap);
    }
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
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

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
            <div className="relative w-full sm:max-w-md md:max-w-lg flex-1">
              <span className="material-symbols-outlined text-gray-400 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input data-admin-search
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search employees by name, email, or role…"
                className="transparent-input bg-transparent w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-9 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono text-gray-400">
                Showing {filteredStaff.length} of {staff.length} employees
              </span>
            </div>
          </div>

          {/* ── Table / Empty State ── */}
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-12">
              <HelixLoader size={44} color="#2cecf7" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 sm:gap-5">
              {filteredStaff.map((member) => {
                const typeColor = getRoleBadgeColor(member.staffType, roles);
                const roleLabel = getRoleLabel(member.staffType, roles);
                const initial = member.name.charAt(0).toUpperCase();

                return (
                  <div
                    key={member.id}
                    className={`${manageStyles.card} relative group flex flex-col justify-between border overflow-hidden`}
                  >
                    {/* Ambient Glow */}
                    <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-cyan-500/[0.04] blur-2xl pointer-events-none group-hover:bg-cyan-500/[0.09] transition-all duration-500" />

                    {/* Card Top: Avatar, Name & Status */}
                    <div className="flex items-center justify-between gap-3 relative z-10">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <StaffAvatar name={member.name} url={member.avatarUrl} />

                        {/* Employee Name & Contact */}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-white font-bold text-sm leading-tight truncate group-hover:text-cyan-300 transition-colors">
                            {member.name}
                          </h3>

                          {/* Email */}
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(member.email, `email-${member.id}`)}
                              className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-cyan-300 transition-colors cursor-pointer font-mono truncate max-w-full"
                              title="Click to copy email"
                            >
                              <span className="material-symbols-outlined text-[13px] text-cyan-400 shrink-0">
                                {copiedId === `email-${member.id}` ? "check" : "mail"}
                              </span>
                              <span className="truncate">{member.email}</span>
                            </button>
                          </div>

                          {/* Joined date */}
                          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                            <span>Joined {new Date(member.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badges: Active & Profile Completeness */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border font-medium ${
                            member.status === "active"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              member.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`}
                          />
                          <span>{member.status === "active" ? "Active" : "Suspended"}</span>
                        </span>

                        {(() => {
                          const completeness = calculateStaffCompleteness(member);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                                completeness.isComplete
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/25"
                              }`}
                              title={
                                completeness.isComplete
                                  ? "Account profile 100% complete"
                                  : `Profile incomplete (${completeness.missingFields.join(", ")})`
                              }
                            >
                              <span>{completeness.isComplete ? "✓ 100%" : `${completeness.percentage}% Setup`}</span>
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Card Middle: Role, Shift & Permissions Strip */}
                    <div className="grid grid-cols-2 gap-2 relative z-10">
                      {/* Role & Shift Box */}
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono font-medium ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}
                        >
                          <span className="material-symbols-outlined text-[12px]">badge</span>
                          <span className="truncate max-w-[80px]">{roleLabel}</span>
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono shrink-0">
                          <span className="material-symbols-outlined text-[13px] text-cyan-400">schedule</span>
                          <span>{member.shiftHours ? `${member.shiftHours.start} - ${member.shiftHours.end}` : "09:00 - 18:00"}</span>
                        </div>
                      </div>

                      {/* Modules & Off-Days Box */}
                      <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1">
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-gray-300 text-[10px] font-mono">
                            <span className="material-symbols-outlined text-[11px] text-cyan-400">vpn_key</span>
                            <span className="text-cyan-400 font-bold">{member.allowedModules.length}</span>
                            <span>Mods</span>
                          </span>
                          {member.agreementId && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono"
                              title="Employment Agreement Linked"
                            >
                              <span className="material-symbols-outlined text-[10px]">verified</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-[110px]" title={(member.assignedOffDays || ["Friday", "Saturday"]).join(", ")}>
                          Off: {(member.assignedOffDays || ["Fri, Sat"]).join(", ")}
                        </span>
                      </div>
                    </div>

                    {/* Card Bottom: Action Toolbar */}
                    <div data-employee-actions className="flex items-center justify-between gap-1.5 pt-2.5 border-t border-white/[0.06] relative z-10">
                      {/* View Details */}
                      <button
                        type="button"
                        onClick={() => openEmployeeDetailsModal(member)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold font-mono transition-all duration-200 cursor-pointer active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        <span>View Details</span>
                      </button>

                      {/* Assign Task */}
                      <button
                        type="button"
                        onClick={() => openAssignTaskModal(member)}
                        title="Assign Sprint Task"
                        className="h-8 w-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px]">assignment_add</span>
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(member)}
                        title="Edit Employee Profile"
                        className="h-8 w-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/10 hover:border-white/20 flex items-center justify-center transition-all cursor-pointer active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>

                      {/* Suspend / Reactivate */}
                      <button
                        type="button"
                        onClick={() => handleToggleSuspend(member)}
                        disabled={actionInProgress === member.id}
                        title={member.status === "active" ? "Suspend Employee" : "Reactivate Employee"}
                        className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95 ${
                          member.status === "active"
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {member.status === "active" ? "block" : "check_circle"}
                        </span>
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => { setDeleteError(""); setDeleteTarget(member); }}
                        disabled={actionInProgress === member.id}
                        title="Remove Employee"
                        className="h-8 w-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE STAFF MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {mounted && showCreateModal && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => {
              if (!creating) {
                setShowCreateModal(false);
                setCreatedCreds(null);
              }
            }}
          />
          <div className="relative w-full max-w-4xl lg:max-w-5xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2cecf7] text-xl">person_add</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">
                    {createdCreds ? "Account Created!" : "Create Employee Account"}
                  </h2>
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono">
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
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {createdCreds ? (
              /* ── Credentials Card ── */
              <div className="max-w-xl mx-auto space-y-5 py-4">
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <span className="material-symbols-outlined text-xl">check_circle</span>
                    <div>
                      <span className="text-sm font-bold block text-[var(--devengine-text)]">Account for {createdCreds.name} is ready</span>
                      <span className="text-[11px] text-[var(--devengine-muted)] font-mono">
                        Password has been securely saved to the admin panel.
                      </span>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider">Login Email</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-sm text-[var(--devengine-text)] font-mono">
                        {createdCreds.email}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCreds.email, "cred-email")}
                        className="w-9 h-9 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[#2cecf7] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-email" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider">Password</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-sm text-[#2cecf7] font-mono tracking-widest">
                        {createdCreds.password}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdCreds.password, "cred-pass")}
                        className="w-9 h-9 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[#2cecf7] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-pass" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Login URL */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider">Employee Portal URL</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[#2cecf7] font-mono truncate">
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
                        className="w-9 h-9 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[#2cecf7] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === "cred-url" ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[#2cecf7] text-base mt-0.5 shrink-0">info</span>
                  <p className="text-[11px] text-[var(--devengine-text)] leading-relaxed font-mono">
                    As an admin, you can always review, copy or update this password directly from the Staff Management table anytime.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatedCreds(null);
                  }}
                  className="w-full h-12 rounded-2xl text-sm font-bold text-[#02040a] bg-[#2cecf7] hover:bg-[#53f2fb] shadow-[0_0_20px_rgba(44,236,247,0.35)] transition-all cursor-pointer active:scale-[0.98]"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Create Form (2-Column Responsive Layout) ── */
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* Left Column: Personal Info & Credentials */}
                  <div className="space-y-5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="e.g. John Smith"
                        className="w-full h-11 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-4 text-sm text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] font-mono focus:outline-none transition-colors"
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
                      <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          Login Email
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2cecf7]/10 text-[#2cecf7] border border-[#2cecf7]/30 font-bold">
                            AUTO
                          </span>
                        </span>
                      </label>
                      <input
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        className="w-full h-11 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-4 text-sm text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] font-mono focus:outline-none transition-colors"
                        placeholder="Enter name above to auto-generate"
                      />
                      <p className="text-[10px] text-[var(--devengine-muted)] font-mono">
                        Auto-generated from first name, or you can customize it manually.
                      </p>
                    </div>

                    {/* Password (Visible & Editable for Admin) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                          Password
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            ADMIN VISIBLE
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowCreatePass(!showCreatePass)}
                          className="text-[11px] text-[#2cecf7] hover:underline font-mono flex items-center gap-1 cursor-pointer"
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
                          className="flex-1 h-11 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-4 text-sm text-[var(--devengine-text)] font-mono tracking-widest focus:outline-none transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setCreatePassword(generateStaffPassword())}
                          title="Regenerate random password"
                          className="w-11 h-11 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        >
                          <span className="material-symbols-outlined text-base">refresh</span>
                        </button>
                      </div>
                      <p className="text-[10px] text-[var(--devengine-muted)] font-mono">
                        You can edit, update, or view this password anytime as Admin.
                      </p>
                    </div>

                    {/* Shift Hours & Rostered Off-Days */}
                    <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                      <div className="flex items-center gap-2 text-[#2cecf7]">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        <span className="text-[11px] font-mono uppercase tracking-wider font-bold">
                          Workplace Shift & Schedule
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">Shift Start</label>
                          <input
                            type="time"
                            value={shiftStart}
                            onChange={(e) => setShiftStart(e.target.value)}
                            className="w-full h-10 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">Shift End</label>
                          <input
                            type="time"
                            value={shiftEnd}
                            onChange={(e) => setShiftEnd(e.target.value)}
                            className="w-full h-10 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
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
                                    ? "bg-[#2cecf7] text-[#02040a] font-bold border-[#2cecf7]"
                                    : "bg-[var(--devengine-surface)] border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Role & Permissions */}
                  <div className="space-y-5">
                    {/* Searchable Role Selector with Add Role Option */}
                    <RoleSelector
                      roles={roles}
                      selectedRoleKey={createType}
                      onSelectRole={(newKey) => {
                        setCreateType(newKey);
                        const chosenRole = roles.find((r) => r.key === newKey);
                        if (chosenRole && chosenRole.defaultModules && chosenRole.defaultModules.length > 0) {
                          setCreateModules([...chosenRole.defaultModules]);
                          const subMap: Record<string, string[]> = {};
                          chosenRole.defaultModules.forEach((modKey) => {
                            if (chosenRole.defaultSubModules && chosenRole.defaultSubModules[modKey] && chosenRole.defaultSubModules[modKey].length > 0) {
                              subMap[modKey] = [...chosenRole.defaultSubModules[modKey]];
                            } else {
                              const mod = STUDIO_MODULES.find((m) => m.key === modKey);
                              if (mod) subMap[modKey] = mod.items.map((i) => i.href);
                            }
                          });
                          setCreateSubModules(subMap);
                        }
                      }}
                      onAddNewRole={handleAddNewRoleInline}
                    />

                    {/* Module Access */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                      <ModuleGrid
                        selected={createModules}
                        subModules={createSubModules}
                        expandedModules={createExpandedModules}
                        onToggleExpand={toggleCreateExpand}
                        onToggleModule={(key) => handleToggleModule(createModules, setCreateModules, createSubModules, setCreateSubModules, key)}
                        onToggleSubModule={(moduleKey, href) => handleToggleSubModule(createModules, setCreateModules, createSubModules, setCreateSubModules, moduleKey, href)}
                        onToggleAllSubModules={(moduleKey) => handleToggleAllSubModulesForModule(createModules, setCreateModules, createSubModules, setCreateSubModules, moduleKey)}
                        onToggleAll={() => handleToggleAllGlobal(createModules, setCreateModules, setCreateSubModules)}
                      />
                      {(createModules.includes("appos") || createModules.includes("all")) && <AppOSPermissions value={createAppOS} onChange={setCreateAppOS} />}
                    </div>
                  </div>
                </div>

                {/* Full-width Section: Official Employment Agreement & Comprehensive HR File */}
                <div className="p-5 rounded-3xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--devengine-border)]">
                    <div className="flex items-center gap-2.5 text-[#2cecf7]">
                      <div className="w-8 h-8 rounded-xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">gavel</span>
                      </div>
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--devengine-text)]">
                          Official Employment Agreement & Comprehensive HR Management
                        </span>
                        <p className="text-[10px] text-[var(--devengine-muted)] font-mono">
                          Auto-generate binding legal contract, set probation / permanent tenure, salary structure & emergency file
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
                      <span className="text-[11px] font-mono text-[var(--devengine-muted)]">Attach Agreement</span>
                      <input
                        type="checkbox"
                        checked={createWithAgreement}
                        onChange={(e) => setCreateWithAgreement(e.target.checked)}
                        className="w-4 h-4 accent-[#2cecf7] cursor-pointer"
                      />
                    </label>
                  </div>

                  {createWithAgreement && (
                    <div className="space-y-5 pt-1">
                      {/* 3-Column Responsive HR Management Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Column 1: Employment Tenure & Probation */}
                        <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                            <span className="material-symbols-outlined text-base">badge</span>
                            <span>Tenure & Status</span>
                          </div>

                          <div>
                            <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                              Employment Type *
                            </label>
                            <div className="relative">
                              <select
                                value={createEmploymentType}
                                onChange={(e) => setCreateEmploymentType(e.target.value as EmploymentType)}
                                className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                              >
                                <option value="probation">Probation Period</option>
                                <option value="permanent">Permanent Employee</option>
                                <option value="contract">Contractual</option>
                                <option value="intern">Internship</option>
                              </select>
                              <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                expand_more
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Joining Date
                              </label>
                              <input
                                type="date"
                                value={createJoiningDate}
                                onChange={(e) => setCreateJoiningDate(e.target.value)}
                                className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Notice (Days)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={createNoticeDays}
                                onChange={(e) => setCreateNoticeDays(Number(e.target.value))}
                                className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          {createEmploymentType === "probation" && (
                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold text-amber-400">
                                  Probation Duration:
                                </span>
                                <div className="relative">
                                  <select
                                    value={createProbationMonths}
                                    onChange={(e) => setCreateProbationMonths(Number(e.target.value))}
                                    className="appearance-none bg-[var(--devengine-surface)] border border-amber-500/30 text-amber-300 rounded-lg px-2 py-0.5 text-[10px] font-mono focus:outline-none cursor-pointer pr-6"
                                  >
                                    <option value={1}>1 Month</option>
                                    <option value={3}>3 Months</option>
                                    <option value={6}>6 Months</option>
                                    <option value={12}>12 Months</option>
                                  </select>
                                  <span className="material-symbols-outlined text-amber-400 text-xs absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none">
                                    expand_more
                                  </span>
                                </div>
                              </div>
                              {calculatedProbationEndDate && (
                                <div className="text-[9px] text-[var(--devengine-muted)] font-mono">
                                  Probation End Target:{" "}
                                  <span className="text-amber-400 font-bold">{calculatedProbationEndDate}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Column 2: Salary Structure & Management */}
                        <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                              <span className="material-symbols-outlined text-base">payments</span>
                              <span>Salary Management</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-emerald-400">
                              Gross: {grossCalculatedSalary.toLocaleString()} {agreementCurrency}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Basic Salary
                              </label>
                              <input
                                type="number"
                                value={createBasicSalary}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCreateBasicSalary(val);
                                  setAgreementSalary(val + createHouseRent + createMedical);
                                }}
                                className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Currency
                              </label>
                              <div className="relative">
                                <select
                                  value={agreementCurrency}
                                  onChange={(e) => setAgreementCurrency(e.target.value)}
                                  className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                                >
                                  <option value="BDT">BDT (৳)</option>
                                  <option value="USD">USD ($)</option>
                                </select>
                                <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                  expand_more
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                House Rent
                              </label>
                              <input
                                type="number"
                                value={createHouseRent}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCreateHouseRent(val);
                                  setAgreementSalary(createBasicSalary + val + createMedical);
                                }}
                                className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Medical / Allowance
                              </label>
                              <input
                                type="number"
                                value={createMedical}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setCreateMedical(val);
                                  setAgreementSalary(createBasicSalary + createHouseRent + val);
                                }}
                                className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Payment Method
                              </label>
                              <div className="relative">
                                <select
                                  value={createPaymentMethod}
                                  onChange={(e) => setCreatePaymentMethod(e.target.value)}
                                  className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 pr-7 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                                >
                                  <option value="">-- Not Selected (Pending) --</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                  <option value="bkash">bKash</option>
                                  <option value="nagad">Nagad</option>
                                  <option value="cash">Cash</option>
                                  <option value="wire">Wire</option>
                                </select>
                                <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                  expand_more
                                </span>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                                Contract Model
                              </label>
                              <div className="relative">
                                <select
                                  value={agreementTypeChoice}
                                  onChange={(e) => setAgreementTypeChoice(e.target.value as AgreementType)}
                                  className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 pr-7 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                                >
                                  <option value="retainer">Monthly Retainer</option>
                                  <option value="hourly">Hourly Rate</option>
                                  <option value="fixed_completion">Fixed Completion</option>
                                </select>
                                <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                  expand_more
                                </span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                              Bank / MFS Account Details
                            </label>
                            <input
                              type="text"
                              value={createBankDetails}
                              onChange={(e) => setCreateBankDetails(e.target.value)}
                              placeholder="e.g. City Bank Acc #1234567 or leave blank for employee"
                              className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Column 3: Emergency Contact (HR Record) */}
                        <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                            <span className="material-symbols-outlined text-base">emergency</span>
                            <span>Emergency Contact</span>
                          </div>

                          <div>
                            <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                              Contact Person Name
                            </label>
                            <input
                              type="text"
                              value={createEmergencyName}
                              onChange={(e) => setCreateEmergencyName(e.target.value)}
                              placeholder="e.g. Sarah Smith"
                              className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                              Relationship
                            </label>
                            <div className="relative">
                              <select
                                value={createEmergencyRel}
                                onChange={(e) => setCreateEmergencyRel(e.target.value)}
                                className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                              >
                                <option value="">-- Not Selected (Pending) --</option>
                                <option value="Spouse">Spouse</option>
                                <option value="Parent">Parent (Father / Mother)</option>
                                <option value="Sibling">Sibling (Brother / Sister)</option>
                                <option value="Guardian">Guardian</option>
                                <option value="Relative / Friend">Relative / Friend</option>
                              </select>
                              <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                expand_more
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                              Emergency Phone Number
                            </label>
                            <input
                              type="tel"
                              value={createEmergencyPhone}
                              onChange={(e) => setCreateEmergencyPhone(e.target.value)}
                              placeholder="e.g. +880 1712 345678"
                              className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-[var(--devengine-border)] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreatedCreds(null);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={creating || !createName.trim() || !createPassword.trim() || createModules.length === 0}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#02040a] bg-[#2cecf7] hover:bg-[#53f2fb] shadow-[0_0_20px_rgba(44,236,247,0.35)] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <HelixLoader size={16} color="#02040a" />
                        <span>Creating Account…</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">person_add</span>
                        Create Employee Account
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EDIT STAFF MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {mounted && showEditModal && editingStaff && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => {
              if (!saving) setShowEditModal(false);
            }}
          />
          <div role="dialog" aria-modal="true" aria-label="Edit employee" className="relative w-full max-w-4xl lg:max-w-5xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-6 my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#2cecf7] text-xl">edit</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-[var(--devengine-text)]">Edit Employee</h2>
                  <p className="text-[11px] text-[var(--devengine-muted)] font-mono">{editingStaff.email}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Left Column: Info, Password & Status */}
                <div className="space-y-5">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider block">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full h-11 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-4 text-sm text-[var(--devengine-text)] placeholder:text-[var(--devengine-muted)] font-mono focus:outline-none transition-colors"
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
                      <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider flex items-center gap-1.5">
                        Password
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                          ADMIN EDITABLE
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowEditPass(!showEditPass)}
                        className="text-[11px] text-[#2cecf7] hover:underline font-mono flex items-center gap-1 cursor-pointer"
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
                        className="flex-1 h-11 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-4 text-sm text-[var(--devengine-text)] font-mono tracking-widest focus:outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setEditPassword(generateStaffPassword())}
                        title="Generate new password"
                        className="w-11 h-11 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                      >
                        <span className="material-symbols-outlined text-base">refresh</span>
                      </button>
                      {editPassword && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(editPassword, "edit-pass-copy")}
                          title="Copy password"
                          className="w-11 h-11 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-muted)] hover:text-[#2cecf7] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 flex items-center justify-center transition-all cursor-pointer active:scale-90"
                        >
                          <span className="material-symbols-outlined text-base">
                            {copiedId === "edit-pass-copy" ? "check" : "content_copy"}
                          </span>
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--devengine-muted)] font-mono">
                      Changing the password updates both Firestore and the employee&apos;s login credentials.
                    </p>
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider block">Account Status</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditStatus("active")}
                        className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          editStatus === "active"
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-[var(--devengine-raised)] border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
                        }`}
                      >
                        Active
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditStatus("suspended")}
                        className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                          editStatus === "suspended"
                            ? "bg-rose-500/15 border-rose-500/40 text-rose-400"
                            : "bg-[var(--devengine-raised)] border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
                        }`}
                      >
                        Suspended
                      </button>
                    </div>
                    {editStatus === "suspended" && <label className={manageStyles.field}>Reason for suspension *<textarea className="bg-transparent" maxLength={1000} value={editSuspensionReason} onChange={event => setEditSuspensionReason(event.target.value)} placeholder="Explain why access is suspended" /><small>This reason is shown to the employee when access is suspended.</small></label>}
                  </div>
                </div>

                {/* Right Column: Role & Permissions */}
                <div className="space-y-5">
                  {/* Searchable Role Selector with Add Role Option */}
                  <RoleSelector
                    roles={roles}
                    selectedRoleKey={editType}
                    onSelectRole={setEditType}
                    onAddNewRole={handleAddNewRoleInline}
                  />

                  {/* Module Access */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                    <ModuleGrid
                      selected={editModules}
                      subModules={editSubModules}
                      expandedModules={editExpandedModules}
                      onToggleExpand={toggleEditExpand}
                      onToggleModule={(key) => handleToggleModule(editModules, setEditModules, editSubModules, setEditSubModules, key)}
                      onToggleSubModule={(moduleKey, href) => handleToggleSubModule(editModules, setEditModules, editSubModules, setEditSubModules, moduleKey, href)}
                      onToggleAllSubModules={(moduleKey) => handleToggleAllSubModulesForModule(editModules, setEditModules, editSubModules, setEditSubModules, moduleKey)}
                      onToggleAll={() => handleToggleAllGlobal(editModules, setEditModules, setEditSubModules)}
                    />
                      {(editModules.includes("appos") || editModules.includes("all")) && <AppOSPermissions value={editAppOS} onChange={setEditAppOS} />}
                  </div>
                </div>
              </div>

              {/* Full-width Section: HR Profile, Tenure, Salary & Resignation Management */}
              <div className="p-5 rounded-3xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--devengine-border)]">
                  <div className="flex items-center gap-2.5 text-[#2cecf7]">
                    <div className="w-8 h-8 rounded-xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
                    </div>
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider font-bold text-[var(--devengine-text)]">
                        HR Management File & Employment Record
                      </span>
                      <p className="text-[10px] text-[var(--devengine-muted)] font-mono">
                        Update tenure classification, salary management, emergency contact, or record resignation status
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/admin/manage-certificates?issue=${encodeURIComponent(editingStaff?.id || "")}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--devengine-surface)] hover:bg-[#2cecf7]/10 border border-[var(--devengine-border)] hover:border-[#2cecf7]/40 text-xs font-mono text-[#2cecf7] transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">workspace_premium</span>
                    <span>Issue Certificate →</span>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1: Tenure, Probation & Resignation */}
                  <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                      <span className="material-symbols-outlined text-base">badge</span>
                      <span>Tenure & Separation</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Employment Type
                      </label>
                      <div className="relative">
                        <select
                          value={editEmploymentType}
                          onChange={(e) => setEditEmploymentType(e.target.value as EmploymentType)}
                          className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="probation">Probation Period</option>
                          <option value="permanent">Permanent Employee</option>
                          <option value="contract">Contractual</option>
                          <option value="intern">Internship</option>
                        </select>
                        <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          Joining Date
                        </label>
                        <input
                          type="date"
                          value={editJoiningDate}
                          onChange={(e) => setEditJoiningDate(e.target.value)}
                          className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          Notice (Days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editNoticeDays}
                          onChange={(e) => setEditNoticeDays(Number(e.target.value))}
                          className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--devengine-border)] space-y-2">
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block">
                        Resignation & Separation Status
                      </label>
                      <div className="relative">
                        <select
                          value={editResignationStatus}
                          onChange={(e) => setEditResignationStatus(e.target.value as any)}
                          className="w-full h-9 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="none">Active / Not Resigned</option>
                          <option value="pending">Resignation Pending Review</option>
                          <option value="approved">Resignation Approved (Notice Active)</option>
                          <option value="completed">Relieved & Clearance Completed</option>
                        </select>
                        <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>

                      {editResignationStatus !== "none" && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[9px] text-[var(--devengine-muted)] font-mono block mb-0.5">
                              Last Working Day / Relieving Date
                            </label>
                            <input
                              type="date"
                              value={editLastWorkingDay}
                              onChange={(e) => setEditLastWorkingDay(e.target.value)}
                              className="w-full h-9 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] text-[var(--devengine-muted)] font-mono block mb-0.5">
                              Resignation Reason
                            </label>
                            <input
                              type="text"
                              value={editResignationReason}
                              onChange={(e) => setEditResignationReason(e.target.value)}
                              placeholder="e.g. Higher studies, Personal reasons..."
                              className="w-full h-9 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-2.5 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Salary Structure & Management */}
                  <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                        <span className="material-symbols-outlined text-base">payments</span>
                        <span>Salary Management</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-400">
                        Gross: {(Number(editBasicSalary) + Number(editHouseRent) + Number(editMedical)).toLocaleString()} {editCurrency}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          Basic Salary
                        </label>
                        <input
                          type="number"
                          value={editBasicSalary}
                          onChange={(e) => setEditBasicSalary(Number(e.target.value))}
                          className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          Currency
                        </label>
                        <div className="relative">
                          <select
                            value={editCurrency}
                            onChange={(e) => setEditCurrency(e.target.value)}
                            className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                          >
                            <option value="BDT">BDT (৳)</option>
                            <option value="USD">USD ($)</option>
                          </select>
                          <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                            expand_more
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          House Rent
                        </label>
                        <input
                          type="number"
                          value={editHouseRent}
                          onChange={(e) => setEditHouseRent(Number(e.target.value))}
                          className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                          Medical Allowance
                        </label>
                        <input
                          type="number"
                          value={editMedical}
                          onChange={(e) => setEditMedical(Number(e.target.value))}
                          className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Payment Method
                      </label>
                      <div className="relative">
                        <select
                          value={editPaymentMethod}
                          onChange={(e) => setEditPaymentMethod(e.target.value)}
                          className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Not Selected (Pending) --</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="bkash">bKash</option>
                          <option value="nagad">Nagad</option>
                          <option value="cash">Cash</option>
                          <option value="wire">Wire</option>
                        </select>
                        <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Bank / MFS Account Details
                      </label>
                      <input
                        type="text"
                        value={editBankDetails}
                        onChange={(e) => setEditBankDetails(e.target.value)}
                        placeholder="e.g. City Bank Acc #1234567 or bKash 017xxxxxxxx"
                        className="w-full h-9 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Column 3: Emergency Contact File */}
                  <div className="p-4 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#2cecf7]">
                      <span className="material-symbols-outlined text-base">emergency</span>
                      <span>Emergency Contact</span>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        value={editEmergencyName}
                        onChange={(e) => setEditEmergencyName(e.target.value)}
                        placeholder="e.g. Sarah Smith"
                        className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Relationship
                      </label>
                      <div className="relative">
                        <select
                          value={editEmergencyRel}
                          onChange={(e) => setEditEmergencyRel(e.target.value)}
                          className="w-full h-10 appearance-none bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 pr-8 text-xs text-[var(--devengine-text)] font-mono focus:outline-none cursor-pointer"
                        >
                          <option value="">-- Not Selected (Pending) --</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent (Father / Mother)</option>
                          <option value="Sibling">Sibling (Brother / Sister)</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Relative / Friend">Relative / Friend</option>
                        </select>
                        <span className="material-symbols-outlined text-[var(--devengine-muted)] text-base absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-[var(--devengine-muted)] font-mono block mb-1">
                        Emergency Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editEmergencyPhone}
                        onChange={(e) => setEditEmergencyPhone(e.target.value)}
                        placeholder="e.g. +880 1712 345678"
                        className="w-full h-10 bg-[var(--devengine-raised)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl px-3 text-xs text-[var(--devengine-text)] font-mono focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {editError && <div role="alert" className={manageStyles.inlineError}>{editError}</div>}
              {/* Bottom Actions Bar */}
              <div className="pt-4 border-t border-[var(--devengine-border)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={saving}
                onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] text-xs font-mono text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#02040a] bg-[#2cecf7] hover:bg-[#53f2fb] shadow-[0_0_20px_rgba(44,236,247,0.35)] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <HelixLoader size={16} color="#02040a" />
                      <span>Saving…</span>
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
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGN TASK MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {mounted && showAssignTaskModal && taskAssigneeStaff && <TaskAssignmentSheet
        employee={taskAssigneeStaff}
        value={taskForm}
        onChange={setTaskForm}
        onSubmit={handleAssignTaskSubmit}
        busy={assigningTask}
        onClose={() => setShowAssignTaskModal(false)}
      />}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW EMPLOYEE TASKS & PROGRESS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {mounted && showTasksModal && tasksStaff && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            onClick={() => setShowTasksModal(false)}
          />
          <div className="relative w-full max-w-3xl rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll my-auto">
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

                    {task.adminAttachments && task.adminAttachments.length > 0 && (
                      <AttachmentList
                        attachments={task.adminAttachments}
                        title="Admin Brief & Attachments"
                      />
                    )}

                    {task.submissionAttachments && task.submissionAttachments.length > 0 && (
                      <AttachmentList
                        attachments={task.submissionAttachments}
                        title="Employee Submitted Files"
                      />
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
        </div>,
        document.body
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EMPLOYEE EXECUTIVE DETAILS MODAL (VIEW DETAILS)
      ═══════════════════════════════════════════════════════════════════ */}
      {mounted && selectedDetailStaff && createPortal(
        <div className="fixed inset-0 z-[9999] overflow-y-auto p-4 sm:p-6 pt-24 sm:pt-28 pb-12 flex justify-center items-start themed-scroll">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => setSelectedDetailStaff(null)}
          />
          <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] shadow-2xl themed-scroll my-auto">
            {/* Header Banner */}
            <div className="relative p-6 sm:p-7 bg-gradient-to-br from-cyan-600/15 via-[var(--devengine-surface)] to-purple-600/10 border-b border-[var(--devengine-border)]">
              <button
                type="button"
                onClick={() => setSelectedDetailStaff(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[var(--devengine-raised)] hover:bg-[var(--devengine-hover)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center transition cursor-pointer"
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                        Employee HR Dossier
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
                      {(selectedDetailStaff.resignationDetails?.status === "resigned" || selectedDetailStaff.resignation?.status === "resigned") && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                          Resigned
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold text-[var(--devengine-text)] mt-1">
                      {selectedDetailStaff.name}
                    </h2>
                    <p className="text-xs font-mono text-[var(--devengine-muted)] mt-0.5">
                      Joined on {selectedDetailStaff.joiningDate ? selectedDetailStaff.joiningDate : new Date(selectedDetailStaff.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
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
            <div className="p-6 sm:p-7 space-y-5">
              {/* 1. Admin Credentials & System Identity */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-sm">key</span>
                    <span>Admin Security Credentials</span>
                  </span>
                  <span className="text-[10px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                    Admin Eyes Only
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Email */}
                  <div className="p-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
                    <span className="text-[10px] text-[var(--devengine-muted)] uppercase tracking-wider block">Login Email</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--devengine-text)] truncate">{selectedDetailStaff.email}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedDetailStaff.email, `det-email-${selectedDetailStaff.id}`)}
                        className="text-[var(--devengine-muted)] hover:text-cyan-400 p-1 rounded transition"
                        title="Copy email"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copiedId === `det-email-${selectedDetailStaff.id}` ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="p-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] space-y-1">
                    <span className="text-[10px] text-[var(--devengine-muted)] uppercase tracking-wider block">Password</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-cyan-400 select-all font-mono font-bold">
                        {revealedPasswords[selectedDetailStaff.id]
                          ? (selectedDetailStaff.password || "Not recorded")
                          : "••••••••••••"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => togglePasswordReveal(selectedDetailStaff.id)}
                          className="text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] p-1 rounded transition"
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
                            className="text-[var(--devengine-muted)] hover:text-cyan-400 p-1 rounded transition"
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

              {/* 2. HR Tenure & Status */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-sm">badge</span>
                    <span>HR Employment & Tenure Details</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase font-semibold">
                    {selectedDetailStaff.employmentType || "permanent"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Employment Type</span>
                    <span className="text-[var(--devengine-text)] font-semibold capitalize mt-0.5 block">
                      {selectedDetailStaff.employmentType || "Permanent"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Joining Date</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block">
                      {selectedDetailStaff.joiningDate || "Not recorded"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Probation Status</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block">
                      {selectedDetailStaff.employmentType === "probation"
                        ? `${selectedDetailStaff.probationPeriodMonths || 3} mo (Ends: ${selectedDetailStaff.probationEndDate || "Pending"})`
                        : "Completed / N/A"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Notice Period</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block">
                      {selectedDetailStaff.salaryManagement?.noticePeriodDays || 30} Days
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Salary & Compensation Management */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">payments</span>
                    <span>Salary Structure & Payout Method</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                    Gross: {selectedDetailStaff.salaryManagement?.currency || "BDT"} {(selectedDetailStaff.salaryManagement?.grossSalary || selectedDetailStaff.salaryManagement?.basicSalary || 0).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Basic Salary</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block">
                      {selectedDetailStaff.salaryManagement?.currency || "BDT"} {(selectedDetailStaff.salaryManagement?.basicSalary || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">House & Medical</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block">
                      +{( (selectedDetailStaff.salaryManagement?.houseRent || 0) + (selectedDetailStaff.salaryManagement?.medical || 0) ).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Payout Mode</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block capitalize">
                      {selectedDetailStaff.salaryManagement?.paymentMethod || "Bank Transfer"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)]">
                    <span className="text-[10px] text-[var(--devengine-muted)] block">Account / MFS</span>
                    <span className="text-[var(--devengine-text)] font-semibold mt-0.5 block truncate" title={selectedDetailStaff.salaryManagement?.bankDetails || "Not configured"}>
                      {selectedDetailStaff.salaryManagement?.bankDetails || "Not configured"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Emergency Contact & Resignation Record */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Emergency Contact */}
                <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2.5">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-400 text-sm">emergency</span>
                    <span>Emergency Contact</span>
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Contact Name:</span>
                      <span className="text-[var(--devengine-text)] font-semibold">
                        {selectedDetailStaff.emergencyContact?.name || "Not provided"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Relationship:</span>
                      <span className="text-[var(--devengine-text)] font-semibold">
                        {selectedDetailStaff.emergencyContact?.relationship || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Emergency Phone:</span>
                      <span className="text-cyan-400 font-semibold">
                        {selectedDetailStaff.emergencyContact?.phone || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resignation & Offboarding Status */}
                <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2.5">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-sm">output</span>
                    <span>Resignation / Relieving Status</span>
                  </span>
                  <div className="space-y-1.5 text-xs font-mono">
                    {(() => {
                      const res = selectedDetailStaff.resignationDetails || selectedDetailStaff.resignation;
                      const isResigned = res?.status === "resigned";
                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--devengine-muted)]">Status:</span>
                            <span className={`font-semibold ${isResigned ? "text-amber-400" : "text-emerald-400"}`}>
                              {isResigned ? "Resigned / Offboarding" : "Active In Service"}
                            </span>
                          </div>
                          {isResigned ? (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[var(--devengine-muted)]">Last Working Day:</span>
                                <span className="text-[var(--devengine-text)] font-semibold">
                                  {res?.lastWorkingDay || "TBD"}
                                </span>
                              </div>
                              <div className="pt-1">
                                <Link
                                  href={`/admin/manage-certificates?search=${encodeURIComponent(selectedDetailStaff.email)}`}
                                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline"
                                >
                                  <span className="material-symbols-outlined text-sm">workspace_premium</span>
                                  <span>Issue Experience / Relieving Certificate →</span>
                                </Link>
                              </div>
                            </>
                          ) : (
                            <p className="text-[11px] text-[var(--devengine-muted)] italic pt-1">
                              Employee is currently in good standing. No resignation on record.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* 5. Shift Schedule & Official Agreement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Working Timetable */}
                <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2.5">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-purple-400 text-sm">schedule</span>
                    <span>Shift Timetable & Roster</span>
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Shift Timings:</span>
                      <span className="text-[var(--devengine-text)] font-semibold">
                        {selectedDetailStaff.shiftHours
                          ? `${selectedDetailStaff.shiftHours.start} - ${selectedDetailStaff.shiftHours.end}`
                          : "09:00 AM - 06:00 PM"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Off-Days:</span>
                      <span className="text-cyan-400 font-semibold">
                        {(selectedDetailStaff.assignedOffDays || ["Friday", "Saturday"]).join(", ")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Employment Agreement */}
                <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2.5">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">verified_user</span>
                    <span>Official Agreement</span>
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--devengine-muted)]">Status:</span>
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

              {/* 6. System Module Permissions */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-cyan-400 text-sm">lock_open</span>
                    <span>Authorized Modules ({selectedDetailStaff.allowedModules.length})</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDetailStaff.allowedModules.map((key) => {
                    const cfg = MODULE_CONFIG[key];
                    if (!cfg) return null;
                    const studioMod = STUDIO_MODULES.find((m) => m.key === key);
                    const totalItems = studioMod ? studioMod.items.length : 0;
                    const subs = selectedDetailStaff.allowedSubModules?.[key];
                    const count = subs !== undefined ? subs.length : totalItems;
                    return (
                      <span
                        key={key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono bg-[var(--devengine-surface)] border border-[var(--devengine-border)]"
                        style={{ color: cfg.color }}
                      >
                        <span className="material-symbols-outlined text-sm">{cfg.icon}</span>
                        <span>{cfg.label}</span>
                        {totalItems > 0 && (
                          <span
                            className="text-[10px] px-1.5 py-0.2 rounded-full font-sans font-bold"
                            style={{
                              backgroundColor: count === totalItems ? "rgba(44, 236, 247, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: count === totalItems ? "#2cecf7" : "#f59e0b",
                            }}
                          >
                            {count === totalItems ? "All" : `${count}/${totalItems}`}
                          </span>
                        )}
                      </span>
                    );
                  })}
                  {selectedDetailStaff.allowedModules.length === 0 && (
                    <span className="text-xs text-[var(--devengine-muted)] italic">No module permissions assigned.</span>
                  )}
                </div>
              </div>

              {/* 7. Active Tasks Preview */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--devengine-text)] uppercase tracking-wider font-mono flex items-center gap-1.5">
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
                  <div className="py-4 text-center text-xs text-[var(--devengine-muted)] font-mono">
                    Loading task status...
                  </div>
                ) : detailStaffTasks.length === 0 ? (
                  <div className="py-3 text-xs text-[var(--devengine-muted)] font-mono italic">
                    No active tasks assigned to this employee.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailStaffTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] flex items-center justify-between gap-3 text-xs font-mono"
                      >
                        <div className="min-w-0">
                          <p className="text-[var(--devengine-text)] font-semibold truncate">{t.title}</p>
                          <p className="text-[10px] text-[var(--devengine-muted)] mt-0.5">
                            Due: {t.dueDate} • Priority: <span className="uppercase text-purple-400">{t.priority}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
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
              <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--devengine-border)]">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const member = selectedDetailStaff;
                      setSelectedDetailStaff(null);
                      openEditModal(member);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-hover)] border border-[var(--devengine-border)] text-xs font-mono font-semibold text-[var(--devengine-text)] transition cursor-pointer"
                  >
                    Edit Profile & HR
                  </button>
                  <Link
                    href={`/admin/manage-certificates?search=${encodeURIComponent(selectedDetailStaff.email)}`}
                    className="px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-mono font-semibold text-cyan-400 transition inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">workspace_premium</span>
                    <span>Issue Certificate</span>
                  </Link>
                  <Link
                    href={`/admin/manage-attendance`}
                    className="px-3.5 py-2 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-xs font-mono font-semibold text-violet-300 transition"
                  >
                    Attendance
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailStaff(null)}
                  className="px-5 py-2 rounded-xl bg-[#2cecf7] hover:bg-[#53f2fb] text-[#02040a] font-bold text-xs font-mono transition cursor-pointer shadow-[0_0_20px_rgba(44,236,247,0.35)]"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {suspensionTarget && <EmployeeDialog title={`Suspend ${suspensionTarget.name}?`} description="The employee will lose workspace access and be signed out. Their records will be preserved." icon="block" onClose={() => !actionInProgress && setSuspensionTarget(null)}>
        <form onSubmit={event => { event.preventDefault(); void confirmSuspension(); }}>
          <label className={manageStyles.field}>Reason for suspension *<textarea className="bg-transparent" required maxLength={1000} value={suspensionReason} onChange={event => setSuspensionReason(event.target.value)} placeholder="Explain why access is suspended" /><small>The employee will see this reason.</small></label>
          {suspensionError && <div role="alert" className={manageStyles.inlineError}>{suspensionError}</div>}
          <div className={manageStyles.dialogActions}><button className={manageStyles.button} type="button" disabled={!!actionInProgress} onClick={() => setSuspensionTarget(null)}>Cancel</button><button className={manageStyles.primary} type="submit" disabled={!!actionInProgress}>{actionInProgress ? "Suspending…" : "Suspend employee"}</button></div>
        </form>
      </EmployeeDialog>}
      {deleteTarget && <EmployeeDialog title="Permanently delete employee?" description="This action cannot be undone." icon="person_remove" onClose={() => { if (!actionInProgress) setDeleteTarget(null); }}>
        <div className={manageStyles.success}><StaffAvatar name={deleteTarget.name} url={deleteTarget.avatarUrl} /><div><strong>{deleteTarget.name}</strong><p>{deleteTarget.email}</p></div></div>
        <p style={{ color: "var(--devengine-muted)", lineHeight: 1.8, marginTop: 20 }}>This permanently removes the employee account record. Choose Cancel to keep this employee.</p>
        {deleteError && <p role="alert" style={{ color: "#ed7084" }}>{deleteError}</p>}
        <div className={manageStyles.dialogActions}>
          <button className={manageStyles.button} disabled={!!actionInProgress} onClick={() => setDeleteTarget(null)}>Cancel</button>
          <button
            type="button"
            disabled={!!actionInProgress}
            onClick={() => handleDelete(deleteTarget)}
            style={{
              backgroundColor: "#ef4444",
              borderColor: "#dc2626",
              color: "#ffffff",
              borderRadius: "9999px",
              padding: "10px 24px",
              fontWeight: 600,
              fontSize: "13px",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "#ffffff" }}>delete_forever</span>
            {actionInProgress ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </EmployeeDialog>}
      {successMessage && <EmployeeDialog title="Saved successfully" icon="task_alt" onClose={() => setSuccessMessage("")}><div className={manageStyles.success}><EmployeeIcon>check_circle</EmployeeIcon><p>{successMessage}</p></div><div className={manageStyles.dialogActions}><button className={manageStyles.primary} onClick={() => setSuccessMessage("")}>Done</button></div></EmployeeDialog>}
    </AdminLayout>
  );
}
