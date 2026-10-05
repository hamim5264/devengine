import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
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
  appStoreUrl: "",
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
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-app-legal");
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
      text: "⚡ Standard Google Play Store templates generated & applied!",
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
      appStoreUrl: app.appStoreUrl || "",
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
      <Head>
        <title>App Policies & Showcase Hub | DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-4">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-teal-400 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span>Legal CMS</span>
            <span>/</span>
            <span className="text-teal-400">App Legal & Showcase Hub</span>
          </div>

          {/* Header Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5 pb-6 border-b border-white/[0.08]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                  App Legal & Showcase Hub
                </h1>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Google Play & App Store Compliant
                </div>
              </div>
              <p className="text-sm text-gray-400 mt-1 max-w-2xl">
                Publish centralized "About This App" showcase hubs, download badges, and Google Play mandated Privacy Policies, Terms, and Data Deletion portals with dedicated URLs.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
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
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
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
                className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-6">
            {/* Stat 1 */}
            <div className="relative p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Published Apps</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white mt-2">{apps.length}</p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Dedicated public policy endpoints active</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="relative p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Data Deletion Requests</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white mt-2">{deletionRequests.length}</p>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 mt-2 font-mono">
                <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{deletionRequests.filter((r) => r.status === "pending").length} pending user submissions</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="relative p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl overflow-hidden group hover:border-cyan-500/30 transition-all">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-teal-500 to-cyan-500 opacity-60" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">Play Store Safety Status</span>
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <p className="text-xl font-bold text-cyan-300 mt-2">100% Policy Adherent</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-2 font-mono">
                <span>Public URLs • No Login • Web Deletion Form</span>
              </div>
            </div>
          </div>

          {/* Segmented View Tabs & Sleek Search Bar */}
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="inline-flex p-1 rounded-2xl bg-[#0c0c16] border border-white/[0.08] shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("apps")}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "apps"
                    ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                <span>Published Apps</span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px]">
                  {apps.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("requests")}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === "requests"
                    ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold"
                    : "text-gray-400 hover:text-white border border-transparent"
                }`}
              >
                <span>User Deletion Requests</span>
                {deletionRequests.filter((r) => r.status === "pending").length > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold animate-pulse">
                    {deletionRequests.filter((r) => r.status === "pending").length}
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px]">
                    {deletionRequests.length}
                  </span>
                )}
              </button>
            </div>

            {/* Redesigned Search Input: Zero emojis, professional styling */}
            {activeTab === "apps" && (
              <div className="relative w-full sm:w-80 md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-emerald-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search apps by title, package, or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-10 pr-9 bg-[#0c0c16] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 rounded-xl text-xs text-white placeholder-gray-500 font-sans transition-all outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white text-xs font-mono cursor-pointer"
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
                <div className="relative rounded-3xl bg-[#0c0c16]/90 border border-white/[0.08] p-12 text-center backdrop-blur-xl overflow-hidden shadow-2xl">
                  {/* Subtle Background Radial Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 max-w-md mx-auto">
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10 mb-5">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      No Apps Configured Yet
                    </h3>
                    <p className="text-sm text-gray-400 mt-2 leading-relaxed font-sans">
                      Add your Android or iOS app profile to generate its Google Play submission links, legal documentation, and branded showcase page in one click.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
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
                    <div
                      key={app.id}
                      className="group relative rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-emerald-500/40 p-6 flex flex-col justify-between backdrop-blur-xl shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300"
                    >
                      <div>
                        {/* Top: Icon + Title + Category */}
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-black/50 border border-white/[0.12] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg group-hover:border-emerald-500/40 transition-colors">
                            {app.logoUrl ? (
                              <img
                                src={app.logoUrl}
                                alt={app.appName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase bg-white/[0.05] text-teal-300 border border-white/[0.08]">
                                {app.category || "App"}
                              </span>
                              <span className="text-[11px] text-gray-500 font-mono truncate">
                                /{app.slug}
                              </span>
                            </div>

                            <h3 className="text-lg font-bold text-white truncate mt-1 group-hover:text-emerald-300 transition-colors">
                              {app.appName}
                            </h3>
                            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 font-sans">
                              {app.appSubtitle || app.description || "No subtitle provided"}
                            </p>
                          </div>
                        </div>

                        {/* Package ID & Badges */}
                        <div className="mt-5 pt-3.5 border-t border-white/[0.06] space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-gray-500">Package ID:</span>
                            <span className="text-gray-300 font-semibold truncate max-w-[190px] bg-black/50 px-2 py-0.5 rounded border border-white/[0.05]">
                              {app.packageName || "Not specified"}
                            </span>
                          </div>

                          {/* Store Availability Badges */}
                          <div className="flex items-center gap-2 pt-0.5">
                            {app.playStoreUrl ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M3.609 1.814L13.793 12 3.61 22.186a2.222 2.222 0 01-.61-.954V2.768c.11-.358.32-.686.61-.954zm11.605 11.608L5.795 23.84a2.2 2.2 0 001.373.16 2.27 2.27 0 001.127-.58l8.34-8.34-1.42-1.658zm0-2.844l1.42-1.658-8.34-8.34a2.27 2.27 0 00-1.128-.58 2.2 2.2 0 00-1.372.16l9.42 10.418zm1.905.952l3.435 2.01c1.332.774 1.332 2.036 0 2.81l-3.435 2.01-1.62-1.89 1.62-4.94z"/>
                                </svg>
                                <span>Play Store Active</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-gray-500">Play Store link empty</span>
                            )}

                            {app.appStoreUrl && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.61-.74 1.02-1.76.91-2.78-.88.04-1.95.59-2.57 1.32-.55.63-.99 1.66-.86 2.66.98.08 1.94-.48 2.52-1.2z"/>
                                </svg>
                                <span>iOS Active</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Public Link Badges */}
                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
                          <Link
                            href={`/apps/${app.slug}`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white flex items-center justify-between transition-colors"
                          >
                            <span>App Showcase</span>
                            <svg className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/privacy-policy`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 flex items-center justify-between transition-colors"
                          >
                            <span>Privacy Policy</span>
                            <svg className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/terms`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-gray-300 hover:text-white flex items-center justify-between transition-colors"
                          >
                            <span>Terms</span>
                            <svg className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                          <Link
                            href={`/apps/${app.slug}/data-deletion`}
                            target="_blank"
                            className="group/link px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 flex items-center justify-between transition-colors"
                          >
                            <span>Data Deletion</span>
                            <svg className="w-3.5 h-3.5 opacity-60 group-hover/link:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </div>
                      </div>

                      {/* Card Actions Bottom */}
                      <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setCopyModalApp(app)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-mono font-medium transition-all cursor-pointer active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          <span>Copy Store URLs</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(app)}
                            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-300 hover:text-white transition-colors cursor-pointer"
                            title="Edit App Details & Legal Policies"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(app)}
                            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 transition-colors cursor-pointer"
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
              <div className="mb-4 text-xs font-mono text-gray-400">
                End users submit these deletion tickets from your public <code className="text-rose-400">/apps/[slug]/data-deletion</code> portal. Google Play requires processing within 30 days.
              </div>

              {deletionRequests.length === 0 ? (
                <div className="rounded-3xl bg-[#0c0c16]/90 border border-white/[0.08] p-12 text-center backdrop-blur-xl shadow-xl">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-gray-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white">No Deletion Requests Pending</h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
                    Any user requesting account or activity erasure will appear here for one-click completion.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-white/[0.08] bg-[#0c0c16] shadow-2xl">
                  <table className="w-full text-left text-sm text-gray-300">
                    <thead className="bg-white/[0.03] border-b border-white/[0.08] text-xs font-mono uppercase text-gray-400">
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
                    <tbody className="divide-y divide-white/[0.05] font-sans">
                      {deletionRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 font-semibold text-white">{req.appName || req.appSlug}</td>
                          <td className="px-5 py-4 font-mono text-emerald-400">{req.userEmail}</td>
                          <td className="px-5 py-4 text-gray-400 font-mono text-xs">{req.userIdOrUsername || "—"}</td>
                          <td className="px-5 py-4 font-mono text-xs">
                            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08]">
                              {req.requestType}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs text-gray-400 max-w-[220px] truncate">
                            {req.reason || "None specified"}
                          </td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-mono uppercase ${
                                req.status === "completed"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                  : req.status === "processing"
                                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                  : req.status === "rejected"
                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right space-x-1.5 font-mono text-xs">
                            {req.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequestStatus(req.id!, "completed")}
                                className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors cursor-pointer"
                              >
                                Mark Completed
                              </button>
                            )}
                            {req.status !== "rejected" && (
                              <button
                                type="button"
                                onClick={() => handleUpdateRequestStatus(req.id!, "rejected")}
                                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-5xl bg-[#0B0F19] border border-white/[0.15] rounded-3xl shadow-2xl shadow-emerald-500/10 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-white/[0.1] flex items-center justify-between bg-gradient-to-r from-white/[0.04] to-transparent flex-shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
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
                  <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <span>{editingId ? `Edit App: ${formData.appName}` : "Create New App & Store Legal Hub"}</span>
                  </h2>
                  <p className="text-xs text-gray-400 font-sans mt-0.5">
                    Configure showcase details, store download buttons, and Google Play compliance policies.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAutoGenerateTemplates}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Generate standard Google Play compliant templates"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline">Auto-Fill Play Templates</span>
                  <span className="sm:hidden">Auto-Fill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Segmented Navigation Bar (100% width, NO side-scrolling, NO emojis) */}
            <div className="p-2 bg-[#060912] border-b border-white/[0.08] grid grid-cols-5 gap-1.5 flex-shrink-0">
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
                  onClick={() => setFormActiveTab(tab.key as any)}
                  className={`py-2 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-mono uppercase tracking-wider text-center transition-all cursor-pointer flex items-center justify-center ${
                    formActiveTab === tab.key
                      ? "bg-gradient-to-r from-emerald-500/25 to-teal-500/25 text-emerald-300 border border-emerald-500/50 shadow-sm font-bold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/[0.03] border border-transparent font-medium"
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
                    {/* Top Row: Logo Card + Core Info Card (Aligned Heights & Spacing) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      
                      {/* Left: App Logo Card (5 cols) */}
                      <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] flex flex-col justify-between space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block">
                            App Logo / Icon
                          </label>
                          <span className="text-[10px] font-mono text-emerald-400">
                            Square 512x512
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Logo Preview */}
                          <div className="w-20 h-20 rounded-2xl bg-[#060912] border border-white/[0.15] overflow-hidden flex items-center justify-center flex-shrink-0 relative shadow-xl shadow-emerald-500/5 group">
                            {formData.logoUrl ? (
                              <img
                                src={formData.logoUrl}
                                alt="Logo preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="text-center p-1 text-gray-500">
                                <svg className="w-8 h-8 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="text-[9px] text-gray-400 font-mono block mt-0.5">No Icon</span>
                              </div>
                            )}
                            {uploadingLogo && (
                              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
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
                              className={`w-full py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-mono font-medium cursor-pointer border border-emerald-500/30 transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                uploadingLogo ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span>{uploadingLogo ? "Uploading..." : "Upload from Computer"}</span>
                            </label>

                            {formData.logoUrl && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, logoUrl: "" })}
                                className="w-full py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono border border-rose-500/20 transition-colors cursor-pointer"
                              >
                                Remove Icon
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Image Link Input */}
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">
                            Or Direct Image Link:
                          </label>
                          <input
                            type="text"
                            placeholder="https://... or /assets/uploads/apps/..."
                            value={formData.logoUrl}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            className="w-full h-10 px-3 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-xs text-white placeholder-gray-400 font-mono transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* Right: Primary Identification Card (7 cols) */}
                      <div className="lg:col-span-7 p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block mb-1.5">
                              App Title <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. FitPulse - Workout Tracker"
                              value={formData.appName}
                              onChange={(e) => handleAppNameChange(e.target.value)}
                              className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-sm text-white placeholder-gray-400 font-sans transition-all outline-none"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block mb-1.5">
                              Subtitle / Tagline
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Smart personal health companion"
                              value={formData.appSubtitle}
                              onChange={(e) => setFormData({ ...formData, appSubtitle: e.target.value })}
                              className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-sm text-white placeholder-gray-400 font-sans transition-all outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* App Category: Both Typeable & Selectable Combobox */}
                          <div className="relative" ref={categoryDropdownRef}>
                            <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block mb-1.5 flex items-center justify-between">
                              <span>App Category</span>
                              <span className="text-[10px] text-emerald-400 font-normal">Type or pick</span>
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="e.g. Tools & Utilities or custom..."
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                onFocus={() => setCategoryDropdownOpen(true)}
                                className="w-full h-11 pl-3.5 pr-10 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/20 rounded-xl text-sm text-white placeholder-gray-400 font-sans transition-all outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform duration-200 ${categoryDropdownOpen ? "rotate-180" : ""}`}
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {/* Suggestions Dropdown */}
                            {categoryDropdownOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1.5 p-2 bg-[#0c0c17] border border-white/[0.15] rounded-2xl shadow-2xl z-30 max-h-56 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]">
                                <div className="text-[10px] font-mono uppercase text-gray-400 px-2 py-1 font-semibold">
                                  Quick Category Suggestions:
                                </div>
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  {APP_CATEGORIES.map((cat) => (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, category: cat });
                                        setCategoryDropdownOpen(false);
                                      }}
                                      className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-mono transition-colors truncate cursor-pointer ${
                                        formData.category === cat
                                          ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30"
                                          : "text-gray-300 hover:bg-white/[0.06] hover:text-white"
                                      }`}
                                    >
                                      {cat}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block mb-1.5">
                              URL Slug <span className="text-rose-400">*</span>
                              <span className="text-[10px] text-emerald-400 ml-1 font-mono lowercase">
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
                              className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-sm text-white font-mono placeholder-gray-400 transition-all outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* About This App: Description Box */}
                    <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block">
                          About This App (Showcase Description)
                        </label>
                        <span className="text-[11px] font-mono text-gray-400">
                          Displays on public app page
                        </span>
                      </div>
                      <textarea
                        rows={5}
                        placeholder="Write a clear overview of what the app does, its primary features, and why users will love it..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-4 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-sm text-white placeholder-gray-400 leading-relaxed font-sans transition-all outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: STORE LINKS & IDENTIFICATION */}
                {formActiveTab === "store" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Store Download Buttons Card */}
                      <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                              Store Download Links
                            </h4>
                            <p className="text-[11px] text-gray-400">
                              Optional store badges appear on your public page when filled.
                            </p>
                          </div>
                        </div>

                        {/* Google Play Store Link */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center justify-between">
                            <span>Google Play Store URL</span>
                            <span className="text-[10px] text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://play.google.com/store/apps/details?id=com.devengine.myapp"
                            value={formData.playStoreUrl}
                            onChange={(e) => setFormData({ ...formData, playStoreUrl: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-xs text-white placeholder-gray-400 font-mono transition-all outline-none"
                          />
                        </div>

                        {/* Apple App Store Link */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center justify-between">
                            <span>Apple App Store URL</span>
                            <span className="text-[10px] text-gray-400">(Optional)</span>
                          </label>
                          <input
                            type="url"
                            placeholder="https://apps.apple.com/app/id123456789"
                            value={formData.appStoreUrl}
                            onChange={(e) => setFormData({ ...formData, appStoreUrl: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-sky-400 rounded-xl text-xs text-white placeholder-gray-400 font-mono transition-all outline-none"
                          />
                        </div>
                      </div>

                      {/* App ID & Support Details Card */}
                      <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                              Identification & Support
                            </h4>
                            <p className="text-[11px] text-gray-400">
                              Included in all Google Play compliance documents.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block">
                            Package ID / App ID
                          </label>
                          <input
                            type="text"
                            placeholder="com.devengine.myapp"
                            value={formData.packageName}
                            onChange={(e) => setFormData({ ...formData, packageName: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-xs text-white font-mono placeholder-gray-400 transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block">
                            Support Contact Email
                          </label>
                          <input
                            type="email"
                            placeholder="support@devengine.com"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-xs text-white font-mono placeholder-gray-400 transition-all outline-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-mono uppercase tracking-wider text-gray-200 font-bold block">
                            Effective Date
                          </label>
                          <input
                            type="text"
                            placeholder="October 2026"
                            value={formData.effectiveDate}
                            onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                            className="w-full h-11 px-3.5 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-xl text-xs text-white font-mono placeholder-gray-400 transition-all outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PRIVACY POLICY */}
                {formActiveTab === "privacy" && (
                  <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                          Google Play Privacy Policy (Markdown/Text)
                        </label>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Google Play requires public, unauthenticated access to this exact document.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="w-full p-4 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-emerald-400 rounded-2xl text-xs text-gray-200 font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}

                {/* TAB 4: TERMS OF SERVICE */}
                {formActiveTab === "terms" && (
                  <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-teal-400 font-bold block">
                          Terms of Service (Markdown/Text)
                        </label>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Standard commercial terms, license restrictions, and dispute terms.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      className="w-full p-4 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-teal-400 rounded-2xl text-xs text-gray-200 font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}

                {/* TAB 5: DATA DELETION POLICY */}
                {formActiveTab === "deletion" && (
                  <div className="p-5 rounded-2xl bg-[#0F1424] border border-white/[0.12] space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                      <div>
                        <label className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold block">
                          Google Play Mandated Data & Account Deletion Policy
                        </label>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Must specify data retention periods and include a web-based deletion request form.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoGenerateTemplates}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-mono font-medium transition-colors cursor-pointer flex items-center gap-1.5"
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
                      className="w-full p-4 bg-[#060912] border border-white/[0.12] hover:border-white/[0.25] focus:border-rose-400 rounded-2xl text-xs text-gray-200 font-mono leading-relaxed transition-all outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/[0.1] bg-[#060912] flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/[0.12] hover:border-white/[0.25] bg-white/[0.04] text-gray-200 hover:text-white text-xs font-mono transition-all cursor-pointer font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-black font-bold text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-[#0c0c17] border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl shadow-teal-500/10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Google Play Console Submission URLs</span>
                </h3>
                <p className="text-xs text-gray-400 font-sans mt-0.5">
                  Copy and paste these direct URLs into your Google Play Console app profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCopyModalApp(null)}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Privacy Policy URL */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-emerald-400">1. Privacy Policy URL</span>
                  <span className="text-[10px] text-gray-500">Google Play Console &gt; App Content</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/privacy-policy`}
                    className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-white/[0.08] text-white font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/privacy-policy`,
                        "privacy"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "privacy" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Data Safety Deletion URL */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-rose-300">2. Data Deletion Policy URL</span>
                  <span className="text-[10px] text-gray-500">Google Play Console &gt; Data Safety</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/data-deletion`}
                    className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-white/[0.08] text-white font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/data-deletion`,
                        "deletion"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "deletion" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Public Showcase URL */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white">3. Public App Showcase Page</span>
                  <span className="text-[10px] text-gray-500">Store Listing Website link</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}`}
                    className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-white/[0.08] text-white font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}`,
                        "landing"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] text-xs font-mono font-semibold transition-all cursor-pointer"
                  >
                    {copiedKey === "landing" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Terms URL */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-gray-300">4. Terms & Conditions URL</span>
                  <span className="text-[10px] text-gray-500">Legal reference</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${getBaseUrl()}/apps/${copyModalApp.slug}/terms`}
                    className="flex-1 h-10 px-3 rounded-xl bg-black/60 border border-white/[0.08] text-white font-mono text-xs select-all outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        `${getBaseUrl()}/apps/${copyModalApp.slug}/terms`,
                        "terms"
                      )
                    }
                    className="px-4 h-10 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] text-xs font-mono font-semibold transition-all cursor-pointer"
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
                className="px-5 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-mono font-medium transition-colors cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ BEAUTIFUL RECYCLE BIN CONFIRMATION MODAL ═══ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0c16] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-rose-500/10 relative text-center">
            
            {/* Glowing Trash Icon */}
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/10">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <h3 className="font-extrabold text-xl text-white mb-2 tracking-tight">
              Move to Recycle Bin?
            </h3>

            <p className="text-sm text-gray-300 mb-3">
              Are you sure you want to remove <span className="text-white font-bold">&quot;{deleteTarget.appName}&quot;</span>?
            </p>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-gray-400 mb-6 font-mono text-left leading-relaxed">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Safe Soft-Delete</span>
              </div>
              This app profile will be removed from your active list, but preserved safely in your <strong className="text-white">Recycle Bin</strong> where it can be restored anytime or permanently purged.
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-5 py-2.5 rounded-xl border border-white/[0.12] hover:border-white/[0.25] bg-white/[0.04] text-gray-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmMoveToBin}
                disabled={deleting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white text-xs font-mono font-bold tracking-wider uppercase transition-all shadow-lg shadow-rose-500/25 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
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
    </AdminLayout>
  );
}
