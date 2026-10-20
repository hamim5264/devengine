import Head from "next/head";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  getStaffRoles,
  createStaffRole,
  updateStaffRole,
  deleteStaffRole,
  getStaffMembers,
} from "@/lib/services/staffService";
import type { StaffRole, StaffMember } from "@/types/staff";
import {
  ROLE_COLOR_PRESETS,
  MODULE_CONFIG,
} from "@/types/staff";
import { STUDIO_MODULES } from "@/lib/staffModules";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const ALL_MODULE_KEYS = Object.keys(MODULE_CONFIG);

// ── Role Module & Sub-Module Checkbox Grid (Top-Level Scope) ──
interface RoleModuleGridProps {
  selectedModules: string[];
  selectedSubModules: Record<string, string[]>;
  expandedModules: Record<string, boolean>;
  onToggleExpand: (key: string) => void;
  onToggleModule: (key: string) => void;
  onToggleSubModule: (moduleKey: string, href: string) => void;
  onToggleAllSubModules: (moduleKey: string) => void;
  onToggleAllGlobal: () => void;
}

function RoleModuleGrid({
  selectedModules,
  selectedSubModules,
  expandedModules,
  onToggleExpand,
  onToggleModule,
  onToggleSubModule,
  onToggleAllSubModules,
  onToggleAllGlobal,
}: RoleModuleGridProps) {
  return (
    <div className="space-y-3 pt-2 border-t border-[var(--devengine-border)]/60">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] text-[var(--devengine-muted)] font-mono uppercase tracking-wider block font-bold">
            Default Module Permissions
          </span>
          <span className="text-[10px] text-[var(--devengine-muted)] opacity-75">
            Expand any module to set default sub-module access for this role
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleAllGlobal}
          className="text-[11px] font-bold text-[#2cecf7] hover:underline transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-[#2cecf7]/10"
        >
          {selectedModules.length === ALL_MODULE_KEYS.length ? "Deselect All Modules" : "Select All Modules"}
        </button>
      </div>

      <div className="space-y-2.5 max-h-[380px] overflow-y-auto themed-scroll pr-1">
        {ALL_MODULE_KEYS.map((key) => {
          const cfg = MODULE_CONFIG[key];
          const studioMod = STUDIO_MODULES.find((m) => m.key === key);
          const isChecked = selectedModules.includes(key);
          const isExpanded = !!expandedModules[key];
          const items = studioMod ? studioMod.items : [];
          const allowedSubs = selectedSubModules[key] !== undefined
            ? selectedSubModules[key]
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
              <div className="flex items-center justify-between p-3 gap-3">
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
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95"
                    style={{ background: `${cfg.color}18`, color: cfg.color }}
                  >
                    <span className="material-symbols-outlined text-base">{cfg.icon}</span>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto themed-scroll pr-1">
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

export default function ManageStaffRolesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<StaffRole[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "custom" | "system">("all");

  // Notices
  const [notice, setNotice] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create Form State
  const [roleLabel, setRoleLabel] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [selectedModules, setSelectedModules] = useState<string[]>(["overview"]);
  const [selectedSubModules, setSelectedSubModules] = useState<Record<string, string[]>>({});
  const [roleExpandedModules, setRoleExpandedModules] = useState<Record<string, boolean>>({});

  const toggleRoleExpand = (key: string) => {
    setRoleExpandedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login");
    });
    return () => unsub();
  }, [router]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedRoles, fetchedStaff] = await Promise.all([
        getStaffRoles(),
        getStaffMembers(),
      ]);
      setRoles(fetchedRoles);
      setStaff(fetchedStaff);
    } catch (err) {
      console.error(err);
      setNotice({ type: "error", text: "Failed to load roles data." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authReady && isAdmin) loadData();
  }, [authReady, isAdmin, loadData]);

  // Auto-generate key from label in create modal
  useEffect(() => {
    if (showCreateModal && roleLabel) {
      const generated = roleLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
      setRoleKey(generated);
    }
  }, [roleLabel, showCreateModal]);

  const openCreateModal = () => {
    setRoleLabel("");
    setRoleKey("");
    setRoleDesc("");
    setSelectedColorIndex(0);
    setSelectedModules(["overview"]);
    const overviewMod = STUDIO_MODULES.find((m) => m.key === "overview");
    setSelectedSubModules({ overview: overviewMod ? overviewMod.items.map((i) => i.href) : ["/admin/dashboard"] });
    setRoleExpandedModules({});
    setShowCreateModal(true);
  };

  const openEditModal = (role: StaffRole) => {
    setEditingRole(role);
    setRoleLabel(role.label);
    setRoleKey(role.key);
    setRoleDesc(role.description || "");
    const presetIndex = ROLE_COLOR_PRESETS.findIndex((c) => c.text === role.color?.text);
    setSelectedColorIndex(presetIndex >= 0 ? presetIndex : 0);
    const mods = role.defaultModules && role.defaultModules.length > 0 ? role.defaultModules : ["overview"];
    setSelectedModules([...mods]);
    const initialSubs: Record<string, string[]> = {};
    mods.forEach((modKey) => {
      if (role.defaultSubModules && role.defaultSubModules[modKey] && role.defaultSubModules[modKey].length > 0) {
        initialSubs[modKey] = [...role.defaultSubModules[modKey]];
      } else {
        const mod = STUDIO_MODULES.find((m) => m.key === modKey);
        if (mod) {
          initialSubs[modKey] = mod.items.map((i) => i.href);
        }
      }
    });
    setSelectedSubModules(initialSubs);
    setRoleExpandedModules({});
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!roleLabel.trim()) {
      setNotice({ type: "error", text: "Please provide a role name." });
      return;
    }
    const color = ROLE_COLOR_PRESETS[selectedColorIndex];
    setSubmitting(true);
    try {
      await createStaffRole({
        label: roleLabel.trim(),
        key: roleKey.trim() || undefined,
        description: roleDesc.trim(),
        color,
        defaultModules: selectedModules,
        defaultSubModules: selectedSubModules,
      });
      setNotice({ type: "success", text: `Role "${roleLabel.trim()}" created successfully!` });
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to create role." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editingRole) return;
    if (!roleLabel.trim()) {
      setNotice({ type: "error", text: "Role name cannot be empty." });
      return;
    }
    const color = ROLE_COLOR_PRESETS[selectedColorIndex];
    setSubmitting(true);
    try {
      await updateStaffRole(editingRole.id || editingRole.key, {
        label: roleLabel.trim(),
        description: roleDesc.trim(),
        color,
        defaultModules: selectedModules,
        defaultSubModules: selectedSubModules,
        key: editingRole.key,
        isCustom: editingRole.isCustom ?? false,
      });
      setNotice({ type: "success", text: `Role "${roleLabel.trim()}" updated successfully!` });
      setShowEditModal(false);
      setEditingRole(null);
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to update role." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: StaffRole) => {
    const assignedCount = staff.filter((s) => s.staffType === role.key).length;
    if (assignedCount > 0) {
      const confirmDelete = window.confirm(
        `Warning: There are currently ${assignedCount} employee(s) assigned to "${role.label}".\n\nDeleting this role will keep the employees but remove this role configuration. Proceed?`
      );
      if (!confirmDelete) return;
    } else {
      if (!window.confirm(`Are you sure you want to delete role "${role.label}"?`)) return;
    }

    setDeletingId(role.id);
    try {
      await deleteStaffRole(role.id);
      setNotice({ type: "success", text: `Role "${role.label}" deleted.` });
      await loadData();
    } catch (err: any) {
      setNotice({ type: "error", text: err?.message || "Failed to delete role." });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleModule = (key: string) => {
    if (selectedModules.includes(key)) {
      setSelectedModules((prev) => prev.filter((m) => m !== key));
      setSelectedSubModules((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setSelectedModules((prev) => [...prev, key]);
      const mod = STUDIO_MODULES.find((m) => m.key === key);
      if (mod) {
        setSelectedSubModules((prev) => ({
          ...prev,
          [key]: mod.items.map((i) => i.href),
        }));
      }
    }
  };

  const handleToggleSubModule = (moduleKey: string, href: string) => {
    const mod = STUDIO_MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;

    if (!selectedModules.includes(moduleKey)) {
      setSelectedModules((prev) => [...prev, moduleKey]);
    }

    setSelectedSubModules((prev) => {
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

  const handleToggleAllSubModulesForModule = (moduleKey: string) => {
    const mod = STUDIO_MODULES.find((m) => m.key === moduleKey);
    if (!mod) return;

    const allHrefs = mod.items.map((i) => i.href);
    const currentSubs = selectedSubModules[moduleKey] !== undefined ? selectedSubModules[moduleKey] : allHrefs;
    const isAllSelected = allHrefs.length > 0 && allHrefs.every((h) => currentSubs.includes(h));

    if (isAllSelected) {
      setSelectedSubModules((prev) => ({
        ...prev,
        [moduleKey]: [],
      }));
    } else {
      if (!selectedModules.includes(moduleKey)) {
        setSelectedModules((prev) => [...prev, moduleKey]);
      }
      setSelectedSubModules((prev) => ({
        ...prev,
        [moduleKey]: allHrefs,
      }));
    }
  };

  const handleToggleAllGlobal = () => {
    if (selectedModules.length === ALL_MODULE_KEYS.length) {
      setSelectedModules([]);
      setSelectedSubModules({});
    } else {
      setSelectedModules([...ALL_MODULE_KEYS]);
      const allSubMap: Record<string, string[]> = {};
      STUDIO_MODULES.forEach((mod) => {
        allSubMap[mod.key] = mod.items.map((i) => i.href);
      });
      setSelectedSubModules(allSubMap);
    }
  };


  // Filtered roles
  const filteredRoles = roles.filter((role) => {
    if (filterType === "custom" && !role.isCustom) return false;
    if (filterType === "system" && role.isCustom) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      role.label.toLowerCase().includes(q) ||
      role.key.toLowerCase().includes(q) ||
      (role.description && role.description.toLowerCase().includes(q))
    );
  });

  const metrics = {
    total: roles.length,
    custom: roles.filter((r) => r.isCustom).length,
    system: roles.filter((r) => !r.isCustom).length,
    assignedStaff: staff.length,
  };

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070f] flex items-center justify-center">
        <HelixLoader size={44} color="#2cecf7" />
      </div>
    );
  }

  return (
    <AdminLayout title="Employee Roles Management | DevEngine Admin">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </Head>

      <div className="min-h-screen bg-[#07070f] p-4 sm:p-6 lg:p-8">
        <main className="max-w-7xl mx-auto space-y-6">
          {/* ── Top Header ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">badge</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-white">
                    Employee Roles Management
                  </h1>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Create custom roles, assign default module permissions & manage team positions
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/manage-staff"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-mono font-bold text-gray-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition-all cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-base">group</span>
                Back to Employees
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
                <span className="material-symbols-outlined text-base">add_circle</span>
                Create New Role
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
              <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Total Roles</span>
              <p className="text-2xl font-bold font-mono text-white mt-1">{metrics.total}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Custom Roles</span>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">{metrics.custom}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-violet-400 uppercase tracking-wider">System Defaults</span>
              <p className="text-2xl font-bold font-mono text-violet-300 mt-1">{metrics.system}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider">Total Employees</span>
              <p className="text-2xl font-bold font-mono text-emerald-300 mt-1">{metrics.assignedStaff}</p>
            </div>
          </div>

          {/* ── Search & Filter Controls ── */}
          <div className="p-4 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md flex-1">
              <span className="material-symbols-outlined text-gray-400 text-lg absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                search
              </span>
              <input data-admin-search
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles by name or key…"
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

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  filterType === "all"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                All ({roles.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("custom")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  filterType === "custom"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                Custom ({metrics.custom})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("system")}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  filterType === "system"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-white/[0.02] text-gray-400 border border-white/[0.06] hover:bg-white/[0.04]"
                }`}
              >
                System ({metrics.system})
              </button>
            </div>
          </div>

          {/* ── Roles Grid ── */}
          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-12">
              <HelixLoader size={44} color="#2cecf7" />
              <p className="text-xs font-mono text-gray-400 tracking-wider uppercase">Loading Roles…</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="p-12 sm:p-16 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] text-center space-y-5 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
                <span className="material-symbols-outlined text-3xl">badge</span>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                  No roles found
                </h3>
                <p className="text-sm text-gray-400">
                  {searchQuery ? "Try a different search term." : "Create your first custom role to assign to employees."}
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                  boxShadow: "0 0 20px rgba(6,182,212,0.3)",
                }}
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Create New Role
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRoles.map((role) => {
                const assignedStaffList = staff.filter((s) => s.staffType === role.key);
                const color = role.color || ROLE_COLOR_PRESETS[0];

                return (
                  <div
                    key={role.id}
                    className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-white/[0.16] transition-all flex flex-col justify-between shadow-xl group relative overflow-hidden"
                  >
                    {/* Top glow */}
                    <div
                      className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none opacity-20 blur-2xl transition-opacity group-hover:opacity-40"
                      style={{ background: color.hex || "#06b6d4" }}
                    />

                    <div className="space-y-4">
                      {/* Badge & Type indicator */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-medium ${color.bg} ${color.text} ${color.border}`}
                        >
                          <span className="material-symbols-outlined text-sm">badge</span>
                          {role.label}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {role.isCustom ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                              Custom
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/[0.08]">
                              System
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details */}
                      <div>
                        <h3 className="text-base font-bold font-['Space_Grotesk'] text-white">
                          {role.label}
                        </h3>
                        <p className="text-[11px] font-mono text-gray-500 mt-0.5">
                          Key: <code className="text-gray-400 bg-white/[0.04] px-1.5 py-0.5 rounded">{role.key}</code>
                        </p>
                        {role.description && (
                          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                            {role.description}
                          </p>
                        )}
                      </div>

                      {/* Default Modules */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider block">
                          Default Modules
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(role.defaultModules && role.defaultModules.length > 0) ? (
                            role.defaultModules.map((mKey) => {
                              const cfg = MODULE_CONFIG[mKey];
                              if (!cfg) return null;
                              const studioMod = STUDIO_MODULES.find((m) => m.key === mKey);
                              const totalItems = studioMod ? studioMod.items.length : 0;
                              const subs = role.defaultSubModules?.[mKey];
                              const count = subs !== undefined ? subs.length : totalItems;
                              return (
                                <span
                                  key={mKey}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.04] border border-white/[0.08]"
                                  style={{ color: cfg.color }}
                                >
                                  <span className="material-symbols-outlined text-[11px]">{cfg.icon}</span>
                                  {cfg.label}
                                  {totalItems > 0 && (
                                    <span
                                      className="text-[9px] px-1 py-0.2 rounded font-sans font-bold"
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
                            })
                          ) : (
                            <span className="text-[10px] text-gray-500 italic">None specified</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Info & Actions */}
                    <div className="pt-5 mt-5 border-t border-white/[0.06] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400 text-sm">groups</span>
                        <span className="text-xs font-mono text-gray-300">
                          {assignedStaffList.length}{" "}
                          <span className="text-gray-500">
                            {assignedStaffList.length === 1 ? "member" : "members"}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(role)}
                          title={`Edit ${role.label} Role`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-cyan-500/15 text-gray-300 hover:text-cyan-300 border border-white/[0.08] hover:border-cyan-500/30 text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>Edit</span>
                        </button>
                        {role.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDelete(role)}
                            disabled={deletingId === role.id}
                            title="Delete Role"
                            className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-rose-500/15 text-gray-400 hover:text-rose-400 border border-white/[0.08] hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE ROLE MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!submitting) setShowCreateModal(false); }}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">badge</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">Create New Role</h2>
                  <p className="text-[11px] text-gray-400 font-mono">Define role label, theme color & access</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* Role Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="e.g. Senior DevOps Engineer"
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
                />
              </div>

              {/* Role Key Slug */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                  Role Identifier / Slug
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold">
                    AUTO
                  </span>
                </label>
                <input
                  type="text"
                  value={roleKey}
                  onChange={(e) => setRoleKey(e.target.value)}
                  placeholder="e.g. devops_engineer"
                  className="w-full h-11 bg-black/20 border border-white/[0.06] rounded-xl px-4 text-sm text-gray-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  rows={2}
                  placeholder="Brief summary of duties and responsibilities…"
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Color Preset Palette */}
              <div className="space-y-2">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block">
                  Badge Theme Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedColorIndex === idx
                          ? `${preset.bg} ${preset.text} ring-2 ring-offset-2 ring-offset-[#0c0c16] ring-cyan-400 font-bold border-white/20`
                          : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: preset.hex }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Modules & Sub-modules */}
              <RoleModuleGrid
                selectedModules={selectedModules}
                selectedSubModules={selectedSubModules}
                expandedModules={roleExpandedModules}
                onToggleExpand={toggleRoleExpand}
                onToggleModule={handleToggleModule}
                onToggleSubModule={handleToggleSubModule}
                onToggleAllSubModules={handleToggleAllSubModulesForModule}
                onToggleAllGlobal={handleToggleAllGlobal}
              />

              {/* Submit */}
              <button
                type="button"
                onClick={handleCreate}
                disabled={submitting || !roleLabel.trim()}
                className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                style={{
                  background: submitting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                  boxShadow: submitting ? "none" : "0 0 20px rgba(6,182,212,0.25)",
                }}
              >
                {submitting ? (
                  <>
                    <HelixLoader size={18} color="#2cecf7" />
                    <span className="text-gray-300">Creating Role…</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">check</span>
                    Create Role
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          EDIT ROLE MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showEditModal && editingRole && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => { if (!submitting) setShowEditModal(false); }}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0c0c16] border border-white/[0.08] shadow-2xl p-6 sm:p-8 space-y-6 themed-scroll">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-cyan-400 text-xl">edit</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white">Edit Role</h2>
                  <p className="text-[11px] text-gray-400 font-mono">Key: {editingRole.key}</p>
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
              {/* Role Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                  Role Title / Name
                </label>
                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  className="w-full h-11 bg-black/40 border border-white/[0.1] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-black/40 border border-white/[0.1] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Color Preset Palette */}
              <div className="space-y-2">
                <label className="text-[11px] text-gray-400 font-mono uppercase tracking-wider block">
                  Badge Theme Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {ROLE_COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setSelectedColorIndex(idx)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        selectedColorIndex === idx
                          ? `${preset.bg} ${preset.text} ring-2 ring-offset-2 ring-offset-[#0c0c16] ring-cyan-400 font-bold border-white/20`
                          : "bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ background: preset.hex }}
                      />
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Modules & Sub-modules */}
              <RoleModuleGrid
                selectedModules={selectedModules}
                selectedSubModules={selectedSubModules}
                expandedModules={roleExpandedModules}
                onToggleExpand={toggleRoleExpand}
                onToggleModule={handleToggleModule}
                onToggleSubModule={handleToggleSubModule}
                onToggleAllSubModules={handleToggleAllSubModulesForModule}
                onToggleAllGlobal={handleToggleAllGlobal}
              />

              {/* Submit */}
              <button
                type="button"
                onClick={handleEdit}
                disabled={submitting || !roleLabel.trim()}
                className="w-full h-12 rounded-2xl text-sm font-bold text-white transition-all cursor-pointer active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                style={{
                  background: submitting ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #06b6d4, #0ea5e9)",
                  boxShadow: submitting ? "none" : "0 0 20px rgba(6,182,212,0.25)",
                }}
              >
                {submitting ? (
                  <>
                    <HelixLoader size={18} color="#2cecf7" />
                    <span className="text-gray-300">Saving Changes…</span>
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
