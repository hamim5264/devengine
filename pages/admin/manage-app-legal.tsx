import hubStyles from "@/components/app-legal/AppLegalAdmin.module.css";
import CustomSelectField from "@/components/staff/CustomSelectField";
import AdminStatusChip from "@/components/admin/AdminStatusChip";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  AppPolicy,
  AppDataDeletionRequest,
  APP_CATEGORIES,
  generatePlayCompliantTemplates,
} from "@/types/appLegal";
import {
  getAllAppPolicies,
  createAppPolicy,
  updateAppPolicy,
  deleteAppPolicy,
  uploadAppLogo,
  getAllDataDeletionRequests,
  updateDataDeletionRequestStatus,
} from "@/lib/services/appLegalService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const INITIAL_FORM: Omit<AppPolicy, "id" | "createdAt" | "updatedAt"> = {
  slug: "",
  appName: "",
  appSubtitle: "",
  description: "",
  logoUrl: "",
  category: "Tools & Utilities",
  packageName: "",
  playStoreUrl: "",
  playStoreStatusMsg: "",
  appStoreUrl: "",
  appStoreStatusMsg: "",
  contactEmail: "support@devengine.com",
  effectiveDate: "October 2026",
  privacyPolicy: "",
  termsOfService: "",
  dataDeletionPolicy: "",
  isPublished: true,
};

export default function ManageAppLegalPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Data states
  const [apps, setApps] = useState<AppPolicy[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<AppDataDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Recycle Bin Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<AppPolicy | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category combobox state
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  // Active view & selection
  const [activeTab, setActiveTab] = useState<"apps" | "requests">("apps");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<AppPolicy, "id" | "createdAt" | "updatedAt">>(INITIAL_FORM);
  const [formActiveTab, setFormActiveTab] = useState<"about" | "store" | "privacy" | "terms" | "deletion">("about");

  // Copy modal
  const [copyModalApp, setCopyModalApp] = useState<AppPolicy | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Toast / messages
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check admin
  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setIsAdmin(true);
      setAuthReady(true);
    }, () => {
      setIsAdmin(false);
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  // Load apps & deletion requests
  const loadData = async () => {
    try {
      setLoading(true);
      const [policies, requests] = await Promise.all([
        getAllAppPolicies(),
        getAllDataDeletionRequests(),
      ]);
      setApps(policies);
      setDeletionRequests(requests);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to load policies", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  // Slug auto-generator
  const handleAppNameChange = (name: string) => {
    setFormData((prev) => {
      const updates: any = { appName: name };
      if (!editingId && !prev.slug) {
        updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      }
      return { ...prev, ...updates };
    });
  };

  // Upload logo
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      const uploadedUrl = await uploadAppLogo(file, formData.slug || formData.appName || "app");
      setFormData((prev) => ({ ...prev, logoUrl: uploadedUrl }));
      setMessage({ text: "App logo uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to upload logo", type: "error" });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 1-Click Generate Play Store Templates
  const handleAutoGenerateTemplates = () => {
    if (!formData.appName) {
      setMessage({ text: "Please enter an App Title first to customize the templates.", type: "error" });
      return;
    }

    const templates = generatePlayCompliantTemplates({
      appName: formData.appName,
      packageName: formData.packageName || `com.devengine.${formData.slug || "app"}`,
      contactEmail: formData.contactEmail || "support@devengine.com",
      effectiveDate: formData.effectiveDate || "October 2026",
    });

    setFormData((prev) => ({
      ...prev,
      privacyPolicy: templates.privacyPolicy,
      termsOfService: templates.termsOfService,
      dataDeletionPolicy: templates.dataDeletionPolicy,
    }));

    setMessage({
      text: "Google Play policy templates applied.",
      type: "success",
    });
  };

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormActiveTab("about");
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (app: AppPolicy) => {
    setEditingId(app.id);
    setFormData({
      slug: app.slug,
      appName: app.appName,
      appSubtitle: app.appSubtitle || "",
      description: app.description || "",
      logoUrl: app.logoUrl || "",
      category: app.category || "Tools & Utilities",
      packageName: app.packageName || "",
      playStoreUrl: app.playStoreUrl || "",
      playStoreStatusMsg: app.playStoreStatusMsg || "",
      appStoreUrl: app.appStoreUrl || "",
      appStoreStatusMsg: app.appStoreStatusMsg || "",
      contactEmail: app.contactEmail || "support@devengine.com",
      effectiveDate: app.effectiveDate || "October 2026",
      privacyPolicy: app.privacyPolicy || "",
      termsOfService: app.termsOfService || "",
      dataDeletionPolicy: app.dataDeletionPolicy || "",
      isPublished: app.isPublished ?? true,
    });
    setFormActiveTab("about");
    setIsModalOpen(true);
  };

  // Save form
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.appName.trim()) {
      setMessage({ text: "App Title is required", type: "error" });
      return;
    }
    if (!formData.slug.trim()) {
      setMessage({ text: "App Slug is required", type: "error" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      if (editingId) {
        await updateAppPolicy(editingId, formData);
        setMessage({ text: `App "${formData.appName}" updated successfully!`, type: "success" });
      } else {
        await createAppPolicy(formData);
        setMessage({ text: `App "${formData.appName}" published successfully!`, type: "success" });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save app policy", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Soft Delete into Recycle Bin
  const handleConfirmMoveToBin = async () => {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await moveToBin({
        originalCollection: "app_policies",
        originalId: deleteTarget.id,
        itemTitle: deleteTarget.appName,
        itemType: "App Policy & Hub",
        data: deleteTarget,
        metadata: {
          slug: deleteTarget.slug,
          packageName: deleteTarget.packageName || "",
          category: deleteTarget.category || "",
          logoUrl: deleteTarget.logoUrl || "",
        },
      });

      setDeleteTarget(null);
      setMessage({
        text: `App "${deleteTarget.appName}" moved to Recycle Bin safely. You can restore it anytime from System > Recycle Bin.`,
        type: "success",
      });
      await loadData();
    } catch (err: any) {
      console.error("Failed to move app to Recycle Bin:", err);
      setMessage({
        text: "Failed to move to Recycle Bin: " + (err?.message || "Unknown error"),
        type: "error",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Update deletion request status
  const handleUpdateRequestStatus = async (
    id: string,
    status: AppDataDeletionRequest["status"]
  ) => {
    try {
      await updateDataDeletionRequestStatus(id, status);
      setDeletionRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
      setMessage({ text: `Deletion request marked as ${status}`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update request", type: "error" });
    }
  };

  // Copy helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const getBaseUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }
    return "https://devengine.com";
  };

  const filteredApps = apps.filter(
    (a) =>
      a.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.packageName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070d] flex items-center justify-center">
        <HelixLoader />
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className={hubStyles.adminHub}>
      <Head>
        <title>App Policies & Showcase Hub | DevEngine Admin</title>
      </Head>

      <div className="flex flex-col font-sans text-[var(--devengine-text)]">
        <main className="flex-1 w-full py-2">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--devengine-muted)] mb-4">
            <Link href="/admin/dashboard" className="text-[var(--devengine-muted)] hover:text-[#2cecf7] transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span>Legal CMS</span>
            <span>/</span>
            <span className="text-[#2cecf7]">App Legal & Showcase Hub</span>
          </div>

          {/* Header Bar */}
          <div data-app-hub-heading className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-6 border-b border-[var(--devengine-border)]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--devengine-text)]">
                  App Legal & Showcase Hub
                </h1>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[11px] font-mono text-[var(--devengine-text)]">
                  <span className="w-2 h-2 rounded-full bg-[#2cecf7] animate-pulse" />
                  App profiles & policies
                </div>
              </div>
              <p className="text-sm text-[var(--devengine-muted)] mt-1 max-w-2xl">Manage app pages, policies, and deletion requests.</p>
            </div>

            <div className="flex items-center gap-3">
              {auth.currentUser?.email === ADMIN_EMAIL && <Link href="/admin/appos" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--devengine-border)] text-[var(--devengine-text)]">Open AppOS ↗</Link>}
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-xl bg-[#2cecf7] hover:brightness-110 text-[#02040a] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#2cecf7]/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add New App</span>
              </button>
            </div>
          </div>

          {/* Toast Message */}
          {message && (
            <div
              className={`mt-6 p-4 rounded-2xl border flex items-center justify-between text-sm shadow-xl backdrop-blur-xl ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 dark:text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400 dark:text-rose-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center bg-current/20">
                  {message.type === "success" ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                </div>
                <span className="font-mono text-xs">{message.text}</span>
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] text-xs font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div data-app-metrics className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
            {/* Stat 1 */}
            <div className="relative p-5 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] backdrop-blur-xl shadow-sm overflow-hidden group hover:border-[#2cecf7]/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2cecf7] to-cyan-400 opacity-80" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--devengine-muted)] uppercase tracking-wider">App profiles</span>
                <div className="w-8 h-8 rounded-lg bg-[#2cecf7]/10 text-[#2cecf7] flex items-center justify-center border border-[#2cecf7]/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--devengine-text)] mt-2">{apps.length}</p>
              <div className="flex items-center gap-1.5 text-xs text-[#2cecf7] mt-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2cecf7]" />
                <span>Dedicated public policy endpoints active</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="relative p-5 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] backdrop-blur-xl shadow-sm overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--devengine-muted)] uppercase tracking-wider">Data Deletion Requests</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-[var(--devengine-text)] mt-2">{deletionRequests.length}</p>
              <div className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400 mt-2 font-mono">
                <svg className="w-3 h-3 text-amber-500 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{deletionRequests.filter((r) => r.status === "pending").length} pending user submissions</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="relative p-5 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] backdrop-blur-xl shadow-sm overflow-hidden group hover:border-[#2cecf7]/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 to-[#2cecf7] opacity-60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--devengine-muted)] uppercase tracking-wider">Public app pages</span>
                <div className="w-8 h-8 rounded-lg bg-[#2cecf7]/10 text-[#2cecf7] flex items-center justify-center border border-[#2cecf7]/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-xl font-bold text-[#2cecf7] mt-2">Showcase + 3 policies</p>
              <div className="flex items-center gap-1.5 text-xs text-[var(--devengine-muted)] mt-2 font-mono">
                <span>Public URLs • No Login • Web Deletion Form</span>
              </div>
            </div>
          </div>

          {/* Segmented View Tabs & Sleek Search Bar */}
          <div data-app-toolbar className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] shadow-sm">
              <button
                type="button"
                aria-pressed={activeTab === "apps"}
                onClick={() => setActiveTab("apps")}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "apps"
                    ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                    : "text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:bg-[var(--devengine-soft)]"
                }`}
              >
                <span>App profiles</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "apps" ? "bg-black/20 text-[#02040a]" : "bg-[var(--devengine-raised)] text-[var(--devengine-muted)]"}`}>
                  {apps.length}
                </span>
              </button>

              <button
                type="button"
                aria-pressed={activeTab === "requests"}
                onClick={() => setActiveTab("requests")}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "requests"
                    ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                    : "text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:bg-[var(--devengine-soft)]"
                }`}
              >
                <span>User Deletion Requests</span>
                {deletionRequests.filter((r) => r.status === "pending").length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-500 dark:text-amber-200 text-[10px] font-bold animate-pulse">
                    {deletionRequests.filter((r) => r.status === "pending").length}
                  </span>
                ) : (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === "requests" ? "bg-black/20 text-[#02040a]" : "bg-[var(--devengine-raised)] text-[var(--devengine-muted)]"}`}>
                    {deletionRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Redesigned Search Input: Transparent, border-only, zero white box */}
            {activeTab === "apps" && (
              <div className="relative w-full sm:w-80 md:w-96 group rounded-xl bg-transparent border border-[var(--devengine-border)] focus-within:border-[#2cecf7] focus-within:ring-2 focus-within:ring-[#2cecf7]/20 transition-all">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--devengine-muted)] group-focus-within:text-[#2cecf7] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  data-admin-search
                  type="search"
                  placeholder="Find an app..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="transparent-input !bg-transparent w-full h-11 pl-10 pr-9 border-0 text-sm text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-sans outline-none focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] text-xs font-mono cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: APPS LIST */}
          {activeTab === "apps" && (
            <div className="mt-6">
              {loading ? (
                <div className="py-24 flex justify-center items-center">
                  <HelixLoader />
                </div>
              ) : filteredApps.length === 0 ? (
                /* Sleek Empty State */
                <div className="relative rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] p-12 text-center backdrop-blur-xl overflow-hidden shadow-xl">
                  {/* Subtle Background Radial Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2cecf7]/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-[#2cecf7]/10 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7] shadow-xl shadow-[#2cecf7]/10 mb-5">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-[var(--devengine-text)] tracking-tight">
                      No Apps Configured Yet
                    </h3>
                    <p className="text-sm text-[var(--devengine-muted)] mt-2 leading-relaxed font-sans">
                      Add your Android or iOS app profile to generate its Google Play submission links, legal documentation, and branded showcase page in one click.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2cecf7] hover:brightness-110 text-[#02040a] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#2cecf7]/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4 stroke-[2.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create First App Profile</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Apps Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredApps.map((app) => (
                    <div data-app-card
                      key={app.id}
                      className="group relative rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 p-6 flex flex-col justify-between backdrop-blur-xl shadow-sm hover:shadow-xl hover:shadow-[#2cecf7]/10 transition-all duration-300"
                    >
                      <div>
                        {/* Top: Icon + Title + Category */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-md group-hover:border-[#2cecf7]/50 transition-colors">
                            {app.logoUrl ? (
                              <img
                                src={app.logoUrl}
                                alt={app.appName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-7 h-7 text-[var(--devengine-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-[#2cecf715] text-[#2cecf7] border border-[#2cecf730]">
                                {app.category || "App"}
                              </span>
                              <span className="text-[11px] text-[var(--devengine-muted)] font-mono truncate">
                                /{app.slug}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-[var(--devengine-text)] truncate mt-1 group-hover:text-[#2cecf7] transition-colors">
                              {app.appName}
                            </h3>
                            <p className="text-xs text-[var(--devengine-muted)] line-clamp-1 mt-0.5 font-sans">
                              {app.appSubtitle || app.description || "No subtitle provided"}
                            </p>
                          </div>
                        </div>

                        {/* Package ID & Badges */}
                        <div className="mt-5 pt-3.5 border-t border-[var(--devengine-border)] space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-[var(--devengine-muted)]">Package ID:</span>
                            <span className="text-[var(--devengine-text)] font-semibold truncate max-w-[190px] bg-[var(--devengine-raised)] px-2.5 py-0.5 rounded-md border border-[var(--devengine-border)]">
                              {app.packageName || "Not specified"}
                            </span>
                          </div>

                          {/* Store Availability Badges */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {app.playStoreUrl ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#2cecf715] text-[#2cecf7] border border-[#2cecf730]">
                                <img src="/assets/playstore.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                <span>Play Store Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[var(--devengine-soft)] text-[var(--devengine-muted)] border border-[var(--devengine-border)]" title={app.playStoreStatusMsg || "Currently under development"}>
                                <img src="/assets/playstore.png" alt="" className="w-3.5 h-3.5 object-contain opacity-60" />
                                <span>Play Store: {app.playStoreStatusMsg ? "Custom Note" : "Coming Soon"}</span>
                              </span>
                            )}

                            {app.appStoreUrl ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <img src="/assets/appstore.png" alt="" className="w-3.5 h-3.5 object-contain" />
                                <span>iOS Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[var(--devengine-soft)] text-[var(--devengine-muted)] border border-[var(--devengine-border)]" title={app.appStoreStatusMsg || "Currently under development"}>
                                <img src="/assets/appstore.png" alt="" className="w-3.5 h-3.5 object-contain opacity-60" />
                                <span>iOS: {app.appStoreStatusMsg ? "Custom Note" : "Coming Soon"}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Public Link Badges */}
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                          <Link
                            href={`/apps/${app.slug}`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 text-[var(--devengine-text)] flex items-center justify-between transition-colors"
                          >
                            <span>App Showcase</span>
                            <svg className="w-3.5 h-3.5 text-[#2cecf7] opacity-70 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/privacy-policy`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-[#2cecf710] hover:bg-[#2cecf720] border border-[#2cecf730] text-[var(--devengine-text)] flex items-center justify-between transition-colors"
                          >
                            <span>Privacy Policy</span>
                            <svg className="w-3.5 h-3.5 text-[#2cecf7] opacity-70 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/terms`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] hover:border-[#2cecf7]/50 text-[var(--devengine-text)] flex items-center justify-between transition-colors"
                          >
                            <span>Terms</span>
                            <svg className="w-3.5 h-3.5 text-[#2cecf7] opacity-70 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/data-deletion`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 dark:text-rose-300 flex items-center justify-between transition-colors"
                          >
                            <span>Data Deletion</span>
                            <svg className="w-3.5 h-3.5 opacity-70 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      {/* Card Actions Bottom */}
                      <div className="mt-6 pt-4 border-t border-[var(--devengine-border)] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCopyModalApp(app)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] border border-[#2cecf740] text-[var(--devengine-text)] text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Store URLs</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(app)}
                            className="p-2.5 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-text)] hover:border-[#2cecf7]/50 transition-colors cursor-pointer"
                            title="Edit App Details & Legal Policies"
                          >
                            <svg className="w-4 h-4 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(app)}
                            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-500 dark:text-rose-400 hover:border-rose-500/50 transition-colors cursor-pointer"
                            title="Move to Recycle Bin"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DATA DELETION REQUESTS */}
          {activeTab === "requests" && (
            <div className="mt-6">
              <div className="mb-4 text-xs font-mono text-[var(--devengine-muted)]">
                End users submit these deletion tickets from your public <code className="text-[#2cecf7]">/apps/[slug]/data-deletion</code> portal. Google Play requires processing within 30 days.
              </div>

              {deletionRequests.length === 0 ? (
                <div className="rounded-3xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] p-12 text-center backdrop-blur-xl shadow-xl">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] flex items-center justify-center text-[var(--devengine-muted)]">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--devengine-text)]">No Deletion Requests Pending</h3>
                  <p className="text-xs text-[var(--devengine-muted)] mt-1 max-w-sm mx-auto font-sans">
                    Any user requesting account or activity erasure will appear here for one-click completion.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-[var(--devengine-border)] bg-[var(--devengine-surface)] shadow-xl">
                  <table className="w-full text-left text-sm text-[var(--devengine-text)]">
                    <thead className="bg-[var(--devengine-raised)] border-b border-[var(--devengine-border)] text-xs font-mono uppercase text-[var(--devengine-muted)]">
                      <tr>
                        <th className="px-5 py-3.5">App</th>
                        <th className="px-5 py-3.5">User Email</th>
                        <th className="px-5 py-3.5">User ID / Username</th>
                        <th className="px-5 py-3.5">Scope</th>
                        <th className="px-5 py-3.5">Reason</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--devengine-border)] font-sans">
                      {deletionRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-[var(--devengine-soft)] transition-colors">
                          <td className="px-5 py-4 font-semibold text-[var(--devengine-text)]">{req.appName || req.appSlug}</td>
                          <td className="px-5 py-4 font-mono text-[#2cecf7]">{req.userEmail}</td>
                          <td className="px-5 py-4 text-[var(--devengine-muted)] font-mono text-xs">{req.userIdOrUsername || "—"}</td>
                          <td className="px-5 py-4 font-mono text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-[var(--devengine-text)]">
                              {req.requestType}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-[var(--devengine-muted)] max-w-[220px] truncate">
                            {req.reason || "None specified"}
                          </td>
                          <td className="px-5 py-4">
                            <AdminStatusChip status={req.status} />
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 font-mono text-xs">
                            {req.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequestStatus(req.id!, "completed")}
                                className="px-3 py-1.5 rounded-lg bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] border border-[#2cecf730] transition-colors cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            )}
                            {req.status !== "rejected" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequestStatus(req.id!, "rejected")}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/25 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CREATE / EDIT APP MODAL - CRYSTAL CLEAR & ZERO SIDE-SCROLL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div data-app-editor role="dialog" aria-modal="true" aria-label={editingId ? "Edit app" : "Add app"} className="relative w-full max-w-5xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] text-[var(--devengine-text)]">
            
            {/* Modal Header */}
            <div data-app-editor-header className="px-6 py-4.5 border-b border-[var(--devengine-border)] flex items-center justify-between bg-[var(--devengine-surface)] flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#2cecf7]/15 border border-[#2cecf7]/30 flex items-center justify-center text-[#2cecf7] shadow-md">
                  {editingId ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--devengine-text)] tracking-tight flex items-center gap-2">
                    <span>{editingId ? `Edit App: ${formData.appName}` : "Create an app profile"}</span>
                  </h2>
                  <p className="text-xs text-[var(--devengine-muted)] font-sans mt-0.5">
                    App details, store links, and policy content.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoGenerateTemplates}
                  className="px-3.5 py-2 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] border border-[#2cecf740] text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Generate standard Google Play compliant templates"
                >
                  <svg className="w-3.5 h-3.5 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Fill policy templates</span>
                  <span className="sm:hidden">Auto-Fill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Segmented Navigation Bar */}
            <div data-app-editor-tabs data-admin-keep-grid className="p-2 bg-[var(--devengine-raised)] border-b border-[var(--devengine-border)] grid grid-cols-5 gap-1.5 flex-shrink-0">
              {[
                { key: "about", label: "1. About & Logo" },
                { key: "store", label: "2. Store Links" },
                { key: "privacy", label: "3. Privacy Policy" },
                { key: "terms", label: "4. Terms of Use" },
                { key: "deletion", label: "5. Data Deletion" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  aria-pressed={formActiveTab === tab.key}
                  onClick={() => setFormActiveTab(tab.key as any)}
                  className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-mono uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center ${
                    formActiveTab === tab.key
                      ? "bg-[#2cecf7] text-[#02040a] font-bold shadow-sm"
                      : "text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] hover:bg-[var(--devengine-soft)] border border-transparent font-medium"
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Form Body with Smooth Clean Scroll */}
            <form onSubmit={handleSave} className="flex-1 flex flex-col min-h-0">
              <div className="p-6 overflow-y-auto space-y-6 flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent]">
                
                {/* TAB 1: ABOUT THIS APP & LOGO */}
                {formActiveTab === "about" && (
                  <div className="space-y-6">
                    {/* Top Row: Logo Card + Core Info Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block">
                            App Logo / Icon
                          </label>
                          <span className="text-[10px] font-mono text-[#2cecf7]">
                            Square 512x512
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Logo Preview */}
                          <div className="w-20 h-20 rounded-2xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] overflow-hidden flex items-center justify-center flex-shrink-0 relative shadow-sm group">
                            {formData.logoUrl ? (
                              <img
                                src={formData.logoUrl}
                                alt="Logo preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-1 text-[var(--devengine-muted)]">
                                <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[9px] text-[var(--devengine-muted)] font-mono block mt-0.5">No Icon</span>
                              </div>
                            )}
                            {uploadingLogo && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                <span className="w-5 h-5 border-2 border-[#2cecf7] border-t-transparent rounded-full animate-spin" />
                              </div>
                            )}
                          </div>

                          {/* Upload Actions */}
                          <div className="flex-1 space-y-2">
                            <input
                              type="file"
                              accept="image/*"
                              ref={fileInputRef}
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="logo-file-input"
                            />
                            <label
                              htmlFor="logo-file-input"
                              className={`w-full py-2.5 px-3 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] text-xs font-mono font-medium cursor-pointer border border-[#2cecf730] transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                uploadingLogo ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              <svg className="w-4 h-4 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>{uploadingLogo ? "Uploading..." : "Upload from Computer"}</span>
                            </label>

                            {formData.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, logoUrl: "" })}
                                className="w-full py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-300 text-xs font-mono border border-rose-500/20 transition-colors cursor-pointer"
                              >
                                Remove Icon
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Image Link Input */}
                        <div>
                          <label className="text-[10px] font-mono text-[var(--devengine-muted)] block mb-1">
                            Or Direct Image Link:
                          </label>
                          <input
                            type="text"
                            placeholder="https://... or /assets/uploads/apps/..."
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="w-full h-10 px-3 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-xs text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-mono transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* Right: Primary Identification Card (7 cols) */}
                      <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block mb-1.5">
                              App Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. FitPulse - Workout Tracker"
                              value={formData.appName}
                              onChange={(e) => handleAppNameChange(e.target.value)}
                              className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-sm text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-sans transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block mb-1.5">
                              Subtitle / Tagline
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Smart personal health companion"
                              value={formData.appSubtitle}
                              onChange={(e) => setFormData({ ...formData, appSubtitle: e.target.value })}
                              className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-sm text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-sans transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* App Category: Both Typeable & Selectable Combobox */}
                          <div data-app-category>
                            <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block mb-1.5">App category</label>
                            <CustomSelectField floating ariaLabel="App category" value={APP_CATEGORIES.some(category => category === formData.category) ? formData.category : "__custom__"} options={[...APP_CATEGORIES.map(category => ({ value: category, label: category })), { value: "__custom__", label: "Custom category…" }]} onChange={category => setFormData({ ...formData, category: category === "__custom__" ? "" : category })} />
                            {!APP_CATEGORIES.some(category => category === formData.category) && <input type="text" aria-label="Custom app category" value={formData.category} onChange={event => setFormData({ ...formData, category: event.target.value })} placeholder="Custom category" className="mt-2 w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-xl text-sm text-[var(--devengine-text)]" />}
                          </div>

                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block mb-1.5">
                              URL Slug <span className="text-rose-400">*</span>
                              <span className="text-[10px] text-[#2cecf7] ml-1 font-mono lowercase">
                                (/apps/{formData.slug || "slug"})
                              </span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. fitpulse"
                              value={formData.slug}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
                                })
                              }
                              className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-sm text-[var(--devengine-text)] font-mono placeholder-[var(--devengine-muted)] transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About This App: Description Box */}
                    <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block">
                          About This App (Showcase Description)
                        </label>
                        <span className="text-[11px] font-mono text-[var(--devengine-muted)]">
                          Displays on public app page
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        placeholder="App purpose and main features"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-4 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-sm text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] leading-relaxed font-sans transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: STORE LINKS & IDENTIFICATION */}
                {formActiveTab === "store" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Store Download Buttons Card */}
                      <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#2cecf7]/10 text-[#2cecf7] flex items-center justify-center border border-[#2cecf7]/20">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--devengine-text)]">
                              Store Download Links
                            </h4>
                            <p className="text-[11px] text-[var(--devengine-muted)]">
                              Optional store badges appear on your public page when filled.
                            </p>
                          </div>
                        </div>

                        {/* Google Play Store Link */}
                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-[#2cecf7] font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <img src="/assets/playstore.png" alt="" className="w-4 h-4 object-contain" />
                              <span>Google Play Store URL</span>
                            </span>
                            <span className="text-[10px] text-[var(--devengine-muted)]">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://play.google.com/store/apps/details?id=..."
                            value={formData.playStoreUrl}
                            onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-xs text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-mono transition-all outline-none"
                          />
                          <div className="pt-0.5">
                            <label className="text-[10px] font-mono uppercase text-[var(--devengine-muted)] block mb-1">
                              Status note when URL is blank or pending:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Currently under development • Testing and review in progress"
                              value={formData.playStoreStatusMsg || ""}
                              onChange={(e) => setFormData({ ...formData, playStoreStatusMsg: e.target.value })}
                              className="w-full h-9 px-3 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-lg text-xs text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] transition-all outline-none"
                            />
                          </div>
                        </div>

                        {/* Apple App Store Link */}
                        <div className="space-y-2">
                          <label className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <img src="/assets/appstore.png" alt="" className="w-4 h-4 object-contain" />
                              <span>Apple App Store URL</span>
                            </span>
                            <span className="text-[10px] text-[var(--devengine-muted)]">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://apps.apple.com/app/id123456789"
                            value={formData.appStoreUrl}
                            onChange={(e) => setFormData({ ...formData, appStoreUrl: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-sky-400 rounded-xl text-xs text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] font-mono transition-all outline-none"
                          />
                          <div className="pt-0.5">
                            <label className="text-[10px] font-mono uppercase text-[var(--devengine-muted)] block mb-1">
                              Status note when URL is blank or pending:
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Currently under development • iOS App Store release arriving soon"
                              value={formData.appStoreStatusMsg || ""}
                              onChange={(e) => setFormData({ ...formData, appStoreStatusMsg: e.target.value })}
                              className="w-full h-9 px-3 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-sky-400 rounded-lg text-xs text-[var(--devengine-text)] placeholder-[var(--devengine-muted)] transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* App ID & Support Details Card */}
                      <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#2cecf7]/10 text-[#2cecf7] flex items-center justify-center border border-[#2cecf7]/20">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--devengine-text)]">
                              Identification & Support
                            </h4>
                            <p className="text-[11px] text-[var(--devengine-muted)]">
                              Included in all Google Play compliance documents.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block">
                            Package ID / App ID
                          </label>
                          <input
                            type="text"
                            placeholder="com.devengine.myapp"
                            value={formData.packageName}
                            onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-xs text-[var(--devengine-text)] font-mono placeholder-[var(--devengine-muted)] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block">
                            Support Contact Email
                          </label>
                          <input
                            type="email"
                            placeholder="support@devengine.com"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-xs text-[var(--devengine-text)] font-mono placeholder-[var(--devengine-muted)] transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-[var(--devengine-text)] font-bold block">
                            Effective Date
                          </label>
                          <input
                            type="text"
                            placeholder="October 2026"
                            value={formData.effectiveDate}
                            onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-xl text-xs text-[var(--devengine-text)] font-mono placeholder-[var(--devengine-muted)] transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRIVACY POLICY */}
                {formActiveTab === "privacy" && (
                  <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--devengine-border)]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-[#2cecf7] font-bold block">
                          Google Play Privacy Policy (Markdown/Text)
                        </label>
                        <p className="text-[11px] text-[var(--devengine-muted)] mt-0.5">
                          Google Play requires public, unauthenticated access to this exact document.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] border border-[#2cecf730] text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Re-Generate Template</span>
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={formData.privacyPolicy}
                      onChange={(e) => setFormData({ ...formData, privacyPolicy: e.target.value })}
                      placeholder="# Privacy Policy for..."
                      className="w-full p-4 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-2xl text-xs text-[var(--devengine-text)] font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}

                {/* TAB 4: TERMS OF SERVICE */}
                {formActiveTab === "terms" && (
                  <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--devengine-border)]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-[#2cecf7] font-bold block">
                          Terms of Service (Markdown/Text)
                        </label>
                        <p className="text-[11px] text-[var(--devengine-muted)] mt-0.5">
                          Standard commercial terms, license restrictions, and dispute terms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] border border-[#2cecf730] text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Re-Generate Template</span>
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={formData.termsOfService}
                      onChange={(e) => setFormData({ ...formData, termsOfService: e.target.value })}
                      placeholder="# Terms of Service for..."
                      className="w-full p-4 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-[#2cecf7] rounded-2xl text-xs text-[var(--devengine-text)] font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}

                {/* TAB 5: DATA DELETION POLICY */}
                {formActiveTab === "deletion" && (
                  <div className="p-5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--devengine-border)]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-rose-500 dark:text-rose-400 font-bold block">
                          Google Play Mandated Data & Account Deletion Policy
                        </label>
                        <p className="text-[11px] text-[var(--devengine-muted)] mt-0.5">
                          Must specify data retention periods and include a web-based deletion request form.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 dark:text-rose-300 border border-rose-500/30 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Re-Generate Template</span>
                      </button>
                    </div>
                    <textarea
                      rows={14}
                      value={formData.dataDeletionPolicy}
                      onChange={(e) => setFormData({ ...formData, dataDeletionPolicy: e.target.value })}
                      placeholder="# Data & Account Deletion Policy for..."
                      className="w-full p-4 bg-[var(--devengine-surface)] border border-[var(--devengine-border)] focus:border-rose-400 rounded-2xl text-xs text-[var(--devengine-text)] font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[var(--devengine-border)] bg-[var(--devengine-surface)] flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] text-xs font-mono transition-all cursor-pointer font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 rounded-xl bg-[#2cecf7] hover:brightness-110 text-[#02040a] font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#2cecf7]/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : editingId ? "Save App Profile" : "Publish App Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COPY STORE URLS MODAL - HIGH TECH DIALOG */}
      {copyModalApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] rounded-3xl p-6 sm:p-7 shadow-2xl text-[var(--devengine-text)] space-y-6">
            <div className="flex items-center justify-between border-b border-[var(--devengine-border)] pb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--devengine-text)] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#2cecf7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Google Play Console Submission URLs</span>
                </h3>
                <p className="text-xs text-[var(--devengine-muted)] font-sans mt-0.5">
                  Copy and paste these direct URLs into your Google Play Console app profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalApp(null)}
                className="w-8 h-8 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Privacy Policy URL */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[#2cecf7]">1. Privacy Policy URL</span>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Google Play Console &gt; App Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/privacy-policy`}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/privacy-policy`,
                        "privacy"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-[#2cecf715] hover:bg-[#2cecf725] text-[#2cecf7] border border-[#2cecf740] text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "privacy" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Data Safety Deletion URL */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-rose-500 dark:text-rose-300">2. Data Deletion Policy URL</span>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Google Play Console &gt; Data Safety</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/data-deletion`}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/data-deletion`,
                        "deletion"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-500 dark:text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "deletion" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Public Showcase URL */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[var(--devengine-text)]">3. Public App Showcase Page</span>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Store Listing Website link</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}`}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}`,
                        "landing"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-[var(--devengine-surface)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-text)] border border-[var(--devengine-border)] text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "landing" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Terms URL */}
              <div className="p-4 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-[var(--devengine-text)]">4. Terms & Conditions URL</span>
                  <span className="text-[10px] text-[var(--devengine-muted)]">Legal reference</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/terms`}
                    className="flex-1 h-10 px-3 rounded-xl bg-[var(--devengine-surface)] border border-[var(--devengine-border)] text-[var(--devengine-text)] font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/terms`,
                        "terms"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-[var(--devengine-surface)] hover:bg-[var(--devengine-soft)] text-[var(--devengine-text)] border border-[var(--devengine-border)] text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "terms" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setCopyModalApp(null)}
                className="px-5 py-2.5 rounded-xl bg-[var(--devengine-raised)] hover:bg-[var(--devengine-soft)] border border-[var(--devengine-border)] text-[var(--devengine-text)] text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECYCLE BIN CONFIRMATION MODAL ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[var(--devengine-surface)] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            
            {/* Glowing Trash Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <h3 className="font-extrabold text-xl text-[var(--devengine-text)] mb-2 tracking-tight">
              Move to Recycle Bin?
            </h3>

            <p className="text-sm text-[var(--devengine-muted)] mb-3">
              Are you sure you want to remove <span className="text-[var(--devengine-text)] font-bold">&quot;{deleteTarget.appName}&quot;</span>?
            </p>

            <div className="p-3.5 rounded-2xl bg-[var(--devengine-raised)] border border-[var(--devengine-border)] text-xs text-[var(--devengine-muted)] mb-6 font-mono text-left leading-relaxed">
              <div className="flex items-center gap-1.5 text-amber-500 dark:text-amber-400 font-bold mb-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Safe Soft-Delete</span>
              </div>
              This app profile will be removed from your active list, but preserved safely in your <strong className="text-[var(--devengine-text)]">Recycle Bin</strong> where it can be restored anytime or permanently purged.
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl border border-[var(--devengine-border)] bg-[var(--devengine-raised)] text-[var(--devengine-muted)] hover:text-[var(--devengine-text)] text-xs font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmMoveToBin}
                disabled={deleting}
                className="px-6 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Moving...</span>
                  </>
                ) : (
                  <span>Move to Bin</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}
