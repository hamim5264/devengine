import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminOrStaffAuth } from "@/lib/services/staffAuth";
import { taskRequest } from "@/lib/tasks/client";
import { STUDIO_MODULES } from "@/lib/staffModules";
import { generateStaffPassword } from "@/lib/services/staffService";
import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import { FiEye, FiEyeOff, FiKey, FiPlus, FiEdit2, FiTrash2, FiShield, FiUploadCloud, FiCheck, FiX } from "react-icons/fi";

export interface SubAdminAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  password?: string;
  status: "active" | "suspended";
  allowedModules: string[];
  createdAt?: string;
  updatedAt?: string;
}

export default function SubAdminsPage() {
  const { authReady, isSuperAdmin } = useAdminOrStaffAuth([]);
  const [accounts, setAccounts] = useState<SubAdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Editor Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<"active" | "suspended">("active");
  const [modules, setModules] = useState<string[]>(["support"]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<SubAdminAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSubAdmins = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await taskRequest<{ accounts: SubAdminAccount[] }>("/api/admin/sub-admins");
      setAccounts(res.accounts || []);
    } catch (err: any) {
      setError(err instanceof Error ? err.message.replace(/_/g, " ") : "Could not load sub-admin accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authReady || !isSuperAdmin) return;
    loadSubAdmins();
  }, [authReady, isSuperAdmin]);

  const openCreateModal = () => {
    setEditingUid(null);
    setName("");
    setEmail("");
    setPassword(generateStaffPassword());
    setShowPassword(true);
    setAvatarUrl("");
    setStatus("active");
    setModules(["support", "project_progress"]);
    setError("");
    setNotice("");
    setIsModalOpen(true);
  };

  const openEditModal = (acc: SubAdminAccount) => {
    setEditingUid(acc.uid);
    setName(acc.name || "");
    setEmail(acc.email || "");
    setPassword(acc.password || "");
    setShowPassword(false);
    setAvatarUrl(acc.avatarUrl || "");
    setStatus(acc.status || "active");
    setModules(acc.allowedModules || []);
    setError("");
    setNotice("");
    setIsModalOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose a valid PNG, JPG, or WebP image.");
      return;
    }
    setUploadingAvatar(true);
    setError("");
    try {
      const url = await uploadStorageAsset(file, "sub-admins", "avatar", 10 * 1024 * 1024);
      setAvatarUrl(url);
    } catch (err: any) {
      setError(err?.message || "Failed to upload avatar image.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const payload: Record<string, any> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        status,
        modules,
        avatarUrl: avatarUrl.trim(),
      };
      if (editingUid) {
        payload.uid = editingUid;
      }
      if (password.trim()) {
        payload.password = password.trim();
      }

      await taskRequest("/api/admin/sub-admins", payload);
      setNotice(editingUid ? "Sub-admin profile updated successfully." : "New sub-admin created successfully.");
      setIsModalOpen(false);
      await loadSubAdmins();
    } catch (err: any) {
      setError(err instanceof Error ? err.message.replace(/_/g, " ") : "Failed to save sub-admin.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await taskRequest("/api/admin/sub-admins", {
        action: "delete",
        uid: deleteTarget.uid,
      });
      setNotice(`Sub-admin "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      await loadSubAdmins();
    } catch (err: any) {
      setError(err instanceof Error ? err.message.replace(/_/g, " ") : "Failed to delete sub-admin.");
    } finally {
      setDeleting(false);
    }
  };

  const toggleModule = (key: string) => {
    setModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const selectAllModules = () => {
    setModules(STUDIO_MODULES.map((m) => m.key));
  };

  const clearAllModules = () => {
    setModules([]);
  };

  return (
    <AdminLayout title="Sub-Admin Access | DevEngine">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[var(--devengine-border)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#2cecf7]/10 text-[#2cecf7] border border-[#2cecf7]/30">
                <FiShield className="w-5 h-5" />
              </span>
              <div>
                <p className="text-xs uppercase font-mono tracking-widest text-[#2cecf7]">Delegated Administration</p>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--devengine-text)]">Sub-Admin Access</h1>
              </div>
            </div>
            <p className="text-sm text-[var(--devengine-muted)] mt-1.5 max-w-2xl">
              Grant custom administrative rights with dynamic emails, secure credentials, and exact module access. Sub-admins are separated from employee records.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-sm hover:brightness-110 shadow-lg shadow-[#2cecf7]/20 transition-all cursor-pointer"
          >
            <FiPlus className="w-4 h-4" />
            Add Sub-Admin
          </button>
        </div>

        {/* Notices & Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button type="button" onClick={() => setError("")} className="text-rose-400 hover:text-white">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}
        {notice && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FiCheck className="w-4 h-4" />
              {notice}
            </span>
            <button type="button" onClick={() => setNotice("")} className="text-emerald-400 hover:text-white">
              <FiX className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)] shadow-sm">
            <p className="text-xs font-mono uppercase text-[var(--devengine-muted)]">Total Sub-Admins</p>
            <p className="text-2xl font-black text-[var(--devengine-text)] mt-1">{accounts.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)] shadow-sm">
            <p className="text-xs font-mono uppercase text-[var(--devengine-muted)]">Active Accounts</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {accounts.filter((a) => a.status === "active").length}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)] shadow-sm">
            <p className="text-xs font-mono uppercase text-[var(--devengine-muted)]">Available Modules</p>
            <p className="text-2xl font-black text-[#2cecf7] mt-1">{STUDIO_MODULES.length}</p>
          </div>
        </div>

        {/* Sub-Admin Cards List */}
        {loading ? (
          <div className="py-20 text-center text-[var(--devengine-muted)]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#2cecf7] border-t-transparent mb-3" />
            <p className="text-sm font-mono">Loading sub-admin accounts…</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)]">
            <FiShield className="w-12 h-12 text-[var(--devengine-muted)] mx-auto mb-3 opacity-40" />
            <h3 className="text-base font-bold text-[var(--devengine-text)]">No Sub-Admins Configured</h3>
            <p className="text-xs text-[var(--devengine-muted)] mt-1 max-w-md mx-auto">
              Create a delegated sub-admin account to give assistants or managers dedicated access with selected modules without granting owner permissions.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 px-4 py-2 rounded-xl bg-[#2cecf7] text-[#02040a] font-bold text-xs hover:brightness-110 cursor-pointer"
            >
              + Create First Sub-Admin
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => {
              const initial = acc.name ? acc.name.charAt(0).toUpperCase() : "S";
              return (
                <div
                  key={acc.uid}
                  className="p-5 rounded-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/40 transition-all flex flex-col justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-[var(--devengine-soft)] border border-[var(--devengine-border)] flex items-center justify-center shrink-0">
                        {acc.avatarUrl ? (
                          <img src={acc.avatarUrl} alt={acc.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-bold text-[#2cecf7] font-mono">{initial}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-[var(--devengine-text)] text-base">{acc.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                              acc.status === "active"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {acc.status}
                          </span>
                        </div>
                        <p className="text-xs text-[#2cecf7] font-mono mt-0.5">{acc.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditModal(acc)}
                        className="p-2 rounded-lg bg-[var(--devengine-soft)] hover:bg-[#2cecf7]/20 text-[var(--devengine-text)] hover:text-[#2cecf7] transition-all cursor-pointer"
                        title="Edit Sub-Admin"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(acc)}
                        className="p-2 rounded-lg bg-[var(--devengine-soft)] hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                        title="Delete Sub-Admin"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Modules summary */}
                  <div className="pt-3 border-t border-[var(--devengine-border)]">
                    <p className="text-[11px] font-mono uppercase text-[var(--devengine-muted)] mb-1.5">
                      Assigned Modules ({acc.allowedModules.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {acc.allowedModules.map((modKey) => {
                        const m = STUDIO_MODULES.find((mod) => mod.key === modKey);
                        return (
                          <span
                            key={modKey}
                            className="px-2 py-0.5 rounded-md bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[11px] text-[var(--devengine-text)] font-mono"
                          >
                            {m?.label || modKey}
                          </span>
                        );
                      })}
                      {acc.allowedModules.length === 0 && (
                        <span className="text-xs text-[var(--devengine-muted)] italic">No modules assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit Sub-Admin Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <div className="w-full max-w-2xl bg-[var(--devengine-card)] border border-[var(--devengine-border)] rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--devengine-border)]">
                <div>
                  <h2 className="text-xl font-bold text-[var(--devengine-text)]">
                    {editingUid ? "Edit Sub-Admin" : "Create Sub-Admin"}
                  </h2>
                  <p className="text-xs text-[var(--devengine-muted)] mt-0.5">
                    Configure login credentials and grant access to specific studio features.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:bg-[var(--devengine-soft)]"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Profile Image Section */}
                <div>
                  <label className="text-xs font-mono uppercase text-[var(--devengine-muted)] block mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-[var(--devengine-soft)] border border-[var(--devengine-border)] flex items-center justify-center shrink-0">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-[#2cecf7] font-mono">
                          {name ? name.charAt(0).toUpperCase() : "S"}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 rounded-xl bg-[var(--devengine-soft)] hover:bg-[#2cecf7]/20 border border-[var(--devengine-border)] text-xs text-[var(--devengine-text)] font-medium flex items-center gap-1.5 cursor-pointer">
                          <FiUploadCloud className="w-4 h-4 text-[#2cecf7]" />
                          {uploadingAvatar ? "Uploading…" : "Upload Photo"}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingAvatar || busy}
                            onChange={handleAvatarUpload}
                          />
                        </label>
                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => setAvatarUrl("")}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <input
                        type="url"
                        placeholder="Or enter public image URL (https://...)"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                      />
                    </div>
                  </div>
                </div>

                {/* Name & Email (Dynamic) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono uppercase text-[var(--devengine-muted)] block mb-1">
                      Full Name *
                    </label>
                    <input
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sarah Miller"
                      className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-mono uppercase text-[var(--devengine-muted)] block mb-1">
                      Sub-Admin Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="subadmin@devenginehq.com"
                      className="w-full px-4 py-2.5 text-sm rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                  </div>
                </div>

                {/* Password field with Generator & Visibility */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-mono uppercase text-[var(--devengine-muted)]">
                      {editingUid ? "Update Password (Optional)" : "Initial Password *"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setPassword(generateStaffPassword())}
                      className="text-[11px] font-mono text-[#2cecf7] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <FiKey className="w-3 h-3" />
                      Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={!editingUid}
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={editingUid ? "Leave blank to keep existing password" : "At least 6 characters"}
                      className="w-full px-4 py-2.5 pr-10 text-sm font-mono rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-text)] focus:outline-none focus:border-[#2cecf7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--devengine-muted)] hover:text-[var(--devengine-text)]"
                    >
                      {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                    </button>
                  </div>
                  {editingUid && (
                    <p className="text-[11px] text-[var(--devengine-muted)] mt-1">
                      Updating the password here changes the sub-admin's login credential in Firebase Authentication.
                    </p>
                  )}
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-4 p-3.5 rounded-xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)]">
                  <span className="text-xs font-mono uppercase text-[var(--devengine-muted)] flex-1">
                    Account Status
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--devengine-text)]">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={status === "active"}
                      onChange={() => setStatus("active")}
                      className="accent-[#2cecf7]"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-[var(--devengine-text)]">
                    <input
                      type="radio"
                      name="status"
                      value="suspended"
                      checked={status === "suspended"}
                      onChange={() => setStatus("suspended")}
                      className="accent-rose-500"
                    />
                    Suspended
                  </label>
                </div>

                {/* Assigned Modules Selector */}
                <div className="space-y-2 pt-2 border-t border-[var(--devengine-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[var(--devengine-text)]">Assigned Modules</h4>
                      <p className="text-[11px] text-[var(--devengine-muted)]">
                        Select which studio sections this sub-admin is authorized to manage.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={selectAllModules}
                        className="text-[11px] font-mono text-[#2cecf7] hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-xs text-[var(--devengine-muted)]">·</span>
                      <button
                        type="button"
                        onClick={clearAllModules}
                        className="text-[11px] font-mono text-[var(--devengine-muted)] hover:text-white cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {STUDIO_MODULES.filter((m) => m.key !== "overview").map((mod) => {
                      const checked = modules.includes(mod.key);
                      return (
                        <label
                          key={mod.key}
                          className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                            checked
                              ? "bg-[#2cecf7]/5 border-[#2cecf7]/50 text-[var(--devengine-text)]"
                              : "bg-[var(--devengine-raised)] border-[var(--devengine-border)] text-[var(--devengine-muted)] opacity-80"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleModule(mod.key)}
                            className="mt-0.5 accent-[#2cecf7]"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold block text-[var(--devengine-text)]">
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-[var(--devengine-muted)] line-clamp-1 block">
                              {mod.description}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--devengine-border)]">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] text-xs font-medium text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-6 py-2.5 rounded-xl bg-[#2cecf7] text-[#02040a] text-xs font-bold hover:brightness-110 shadow-lg shadow-[#2cecf7]/20 transition-all cursor-pointer"
                  >
                    {busy ? "Saving…" : editingUid ? "Save Changes" : "Create Sub-Admin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--devengine-card)] border border-[var(--devengine-border)] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-rose-400">
                <FiTrash2 className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-bold">Delete Sub-Admin?</h3>
              </div>
              <p className="text-sm text-[var(--devengine-muted)] leading-relaxed">
                Are you sure you want to delete <strong className="text-[var(--devengine-text)]">{deleteTarget.name}</strong> ({deleteTarget.email})? This permanently revokes their login access and removes their delegated permissions.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-xs font-medium text-[var(--devengine-muted)] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  {deleting ? "Deleting…" : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
