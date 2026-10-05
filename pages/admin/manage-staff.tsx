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
        Staff Role
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
      setNotice({ type: "error", text: "Failed to load staff and roles data." });
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
      setNotice({ type: "error", text: "Please enter a staff name." });
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
      await createStaffAccount({
        name: createName.trim(),
        email: createEmail,
        password: createPassword,
        avatarUrl: createAvatarUrl,
        staffType: createType,
        allowedModules: createModules,
      });
      setCreatedCreds({
        name: createName.trim(),
        email: createEmail,
        password: createPassword,
        avatarUrl: createAvatarUrl,
      });
      setNotice({ type: "success", text: `Staff account "${createName.trim()}" created successfully!` });
      await loadData();
    } catch (err: any) {
      const msg =
        err?.code === "auth/email-already-in-use"
          ? "This email is already registered. Try modifying the name."
          : err?.message || "Failed to create staff account.";
      setNotice({ type: "error", text: msg });
    } finally {
      setCreating(false);
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
      setNotice({ type: "success", text: `Staff "${editingStaff.name}" updated successfully.` });
      setShowEditModal(false);
      setEditingStaff(null);
      await loadData();
    } catch {
      setNotice({ type: "error", text: "Failed to update staff member." });
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
      setNotice({ type: "success", text: `"${member.name}" removed from staff.` });
      await loadData();
    } catch {
      setNotice({ type: "error", text: "Failed to remove staff member." });
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
    <AdminLayout title="Staff Management | DevEngine Admin">
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
                    Staff Management
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
                Add Staff Member
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
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Staff</span>
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
                  <span className="text-xs font-bold text-white block">Staff Attendance & Roster</span>
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
                placeholder="Search staff by name, email, or role…"
                className="w-full h-10 bg-black/40 border border-white/[0.1] rounded-xl pl-10 pr-4 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
              />
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-mono text-gray-400">
                Showing {filteredStaff.length} of {staff.length} staff
              </span>
            </div>
          </div>

          {/* ── Table / Empty State ── */}
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-12">
              <HelixLoader size={44} color="#38f2ff" />
              <p className="text-xs font-mono text-gray-400 tracking-wider uppercase">Loading Staff…</p>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <span className="material-symbols-outlined text-3xl">group_add</span>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                  {searchQuery ? "No matching staff found" : "No staff members yet"}
                </h3>
                <p className="text-sm text-gray-400">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Create your first staff account to grant team members controlled access to admin modules."}
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
                  Add Staff Member
                </button>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] overflow-hidden shadow-2xl backdrop-blur-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
                      <th className="py-4 px-5 min-w-[220px]">Staff Member</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[210px]">Email</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[170px]">Password (Admin)</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[140px]">Role</th>
                      <th className="py-4 px-5 min-w-[180px]">Module Access</th>
                      <th className="py-4 px-5 whitespace-nowrap min-w-[110px]">Status</th>
                      <th className="py-4 px-5 text-right whitespace-nowrap min-w-[130px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-xs font-mono">
                    {filteredStaff.map((member) => {
                      const typeColor = getRoleBadgeColor(member.staffType, roles);
                      const roleLabel = getRoleLabel(member.staffType, roles);
                      const isPasswordRevealed = !!revealedPasswords[member.id];
                      const initial = member.name.charAt(0).toUpperCase();

                      return (
                        <tr key={member.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Staff Member (Avatar + Name) */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/[0.1] flex items-center justify-center flex-shrink-0 shadow-sm">
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
                              <div>
                                <span className="text-white font-bold text-sm block">{member.name}</span>
                                <span className="text-[10px] text-gray-500 block mt-0.5">
                                  Joined {new Date(member.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(member.email, `email-${member.id}`)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-cyan-500/15 text-gray-300 hover:text-cyan-200 border border-white/[0.08] hover:border-cyan-500/30 transition-all text-[11px] font-mono cursor-pointer active:scale-95"
                              title="Click to copy email"
                            >
                              <span className="material-symbols-outlined text-[13px] text-cyan-400 shrink-0">
                                {copiedId === `email-${member.id}` ? "check" : "mail"}
                              </span>
                              <span className="truncate max-w-[160px]">{member.email}</span>
                              {copiedId === `email-${member.id}` && (
                                <span className="text-[10px] text-emerald-400 font-bold shrink-0">Copied!</span>
                              )}
                            </button>
                          </td>

                          {/* Password (Admin Visible & Copyable) */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {member.password ? (
                              <div className="inline-flex items-center gap-1.5 bg-black/40 border border-white/[0.08] px-2.5 py-1 rounded-xl">
                                <span className="font-mono text-xs text-cyan-300 min-w-[70px] select-all">
                                  {isPasswordRevealed ? member.password : "••••••••"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => togglePasswordReveal(member.id)}
                                  className="text-gray-400 hover:text-white transition-colors p-0.5 cursor-pointer"
                                  title={isPasswordRevealed ? "Hide password" : "Show password"}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {isPasswordRevealed ? "visibility_off" : "visibility"}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(member.password || "", `pwd-${member.id}`)}
                                  className="text-gray-400 hover:text-cyan-300 transition-colors p-0.5 cursor-pointer"
                                  title="Copy password"
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {copiedId === `pwd-${member.id}` ? "check" : "content_copy"}
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-gray-500 italic">Not recorded</span>
                            )}
                          </td>

                          {/* Role */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-medium whitespace-nowrap ${typeColor.bg} ${typeColor.text} ${typeColor.border}`}
                            >
                              <span className="material-symbols-outlined text-sm">badge</span>
                              {roleLabel}
                            </span>
                          </td>

                          {/* Modules */}
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1.5">
                              {member.allowedModules.map((key) => {
                                const cfg = MODULE_CONFIG[key];
                                if (!cfg) return null;
                                return (
                                  <span
                                    key={key}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/[0.08]"
                                    style={{ color: cfg.color }}
                                  >
                                    <span className="material-symbols-outlined text-[11px]">{cfg.icon}</span>
                                    {cfg.label}
                                  </span>
                                );
                              })}
                              {member.allowedModules.length === 0 && (
                                <span className="text-[10px] text-gray-500 italic">No modules</span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border whitespace-nowrap ${
                                member.status === "active"
                                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  member.status === "active"
                                    ? "bg-emerald-400 animate-pulse"
                                    : "bg-rose-400"
                                }`}
                              />
                              {member.status === "active" ? "Active" : "Suspended"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditModal(member)}
                                title="Edit Staff Member"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 hover:text-cyan-300 text-gray-400 transition-all border border-white/[0.08] hover:border-cyan-500/30 flex items-center justify-center cursor-pointer active:scale-90"
                              >
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleSuspend(member)}
                                disabled={actionInProgress === member.id}
                                title={member.status === "active" ? "Suspend" : "Reactivate"}
                                className={`w-8 h-8 rounded-xl bg-white/[0.04] transition-all border border-white/[0.08] flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-90 ${
                                  member.status === "active"
                                    ? "hover:bg-amber-500/15 hover:text-amber-300 text-gray-400 hover:border-amber-500/30"
                                    : "hover:bg-emerald-500/15 hover:text-emerald-300 text-gray-400 hover:border-emerald-500/30"
                                }`}
                              >
                                <span className="material-symbols-outlined text-base">
                                  {member.status === "active" ? "block" : "check_circle"}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(member)}
                                disabled={actionInProgress === member.id}
                                title="Remove Staff Member"
                                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 hover:text-rose-400 text-gray-500 transition-all border border-white/[0.08] hover:border-rose-500/30 flex items-center justify-center cursor-pointer disabled:opacity-50 active:scale-90"
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
                    {createdCreds ? "Account Created!" : "Create Staff Account"}
                  </h2>
                  <p className="text-[11px] text-gray-400 font-mono">
                    {createdCreds ? "Save and share credentials with the staff member" : "Set up a new team member with custom role & permissions"}
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
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Staff Portal URL</span>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.1] text-xs text-cyan-300 font-mono truncate">
                        {typeof window !== "undefined" ? `${window.location.origin}/staff` : "/staff"}
                      </code>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            typeof window !== "undefined" ? `${window.location.origin}/staff` : "/staff",
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
                      Create Staff Account
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
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">Edit Staff Member</h2>
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
                  Changing the password updates both Firestore and the staff member&apos;s login credentials.
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
    </AdminLayout>
  );
}
