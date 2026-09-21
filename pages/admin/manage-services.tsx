import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { DevEngineService, ServiceInquiry } from "@/types/service";
import {
  getAllServices,
  saveService,
  deleteService,
  seedDefaultServices,
  getServiceInquiries,
  updateInquiryStatus,
  deleteServiceInquiry,
  DEFAULT_SERVICES,
} from "@/lib/services/servicesService";
import { moveToBin } from "@/lib/services/binService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const CATEGORIES = [
  "Web Architecture",
  "Mobile Engineering",
  "AI & Machine Learning",
  "Cloud & DevOps",
  "Enterprise Systems",
];

export default function ManageServicesPage() {
  const router = useRouter();

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"services" | "inquiries">("services");
  const [services, setServices] = useState<DevEngineService[]>([]);
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Edit / Add Service Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Partial<DevEngineService> | null>(null);
  const [newDeliverableInput, setNewDeliverableInput] = useState("");
  const [newTechInput, setNewTechInput] = useState("");

  // Delete / Move to Bin Modal States
  const [deleteTargetService, setDeleteTargetService] = useState<DevEngineService | null>(null);
  const [deleteTargetInquiry, setDeleteTargetInquiry] = useState<ServiceInquiry | null>(null);

  // Admin Auth Verification
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace("/login?redirect=/admin/manage-services");
    });
    return () => unsub();
  }, [router]);

  // Fetch Services & Inquiries
  const fetchData = async () => {
    try {
      setLoading(true);
      const [svcList, inqList] = await Promise.all([
        getAllServices(),
        getServiceInquiries(),
      ]);
      setServices(svcList);
      setInquiries(inqList);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to load services", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin]);

  const handleSeedDefaults = async () => {
    if (!confirm("Seed or restore the 6 official DevEngine default services to Firestore?")) {
      return;
    }
    try {
      setSaving(true);
      const res = await seedDefaultServices();
      await fetchData();
      setMessage({ text: `Successfully seeded ${res.count} services in Firestore!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to seed services", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingService({
      id: `service-${Date.now()}`,
      slug: `new-service-${Date.now()}`,
      title: "",
      tagline: "",
      category: "Web Architecture",
      icon: "layers",
      badge: "ENTERPRISE GRADE",
      description: "",
      deliverables: [],
      techStack: [],
      timeline: "2-4 Weeks Sprint",
      isPublic: true,
      order: services.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (svc: DevEngineService) => {
    setEditingService({ ...svc });
    setModalOpen(true);
  };

  const handleSaveServiceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title || !editingService?.description) {
      alert("Title and description are required.");
      return;
    }
    try {
      setSaving(true);
      await saveService(editingService);
      setModalOpen(false);
      await fetchData();
      setMessage({ text: `Saved service "${editingService.title}" successfully!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to save service", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const confirmMoveServiceToBin = async () => {
    if (!deleteTargetService) return;
    try {
      setSaving(true);
      await moveToBin({
        originalCollection: "services",
        originalId: deleteTargetService.id,
        itemTitle: deleteTargetService.title,
        itemType: "Service",
        data: deleteTargetService,
        metadata: {
          category: deleteTargetService.category,
          badge: deleteTargetService.badge,
          isPublic: deleteTargetService.isPublic,
          timeline: deleteTargetService.timeline,
        },
      });
      setServices((prev) => prev.filter((s) => s.id !== deleteTargetService.id));
      setMessage({
        text: `Service "${deleteTargetService.title}" moved to Recycle Bin.`,
        type: "success",
      });
      setDeleteTargetService(null);
    } catch (err: any) {
      console.error("Error moving service to bin:", err);
      setMessage({ text: err?.message || "Failed to move service to Recycle Bin", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublic = async (svc: DevEngineService) => {
    try {
      const nextPublic = !svc.isPublic;
      await saveService({ ...svc, isPublic: nextPublic });
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, isPublic: nextPublic } : s))
      );
      setMessage({
        text: `Service "${svc.title}" is now ${nextPublic ? "LIVE" : "DRAFT"}!`,
        type: "success",
      });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to update service status", type: "error" });
    }
  };

  // Inquiry Handlers
  const handleInquiryStatus = async (
    id: string,
    status: "NEW" | "IN_REVIEW" | "CONTACTED" | "RESOLVED"
  ) => {
    try {
      await updateInquiryStatus(id, status);
      setInquiries((prev) =>
        prev.map((inq) => (inq.id === id ? { ...inq, status } : inq))
      );
      setMessage({ text: "Inquiry status updated!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to update status", type: "error" });
    }
  };

  const confirmDeleteInquiry = async () => {
    if (!deleteTargetInquiry) return;
    try {
      setSaving(true);
      await moveToBin({
        originalCollection: "service_inquiries",
        originalId: deleteTargetInquiry.id,
        itemTitle: `Inquiry: ${deleteTargetInquiry.clientName}`,
        itemType: "ServiceInquiry",
        data: deleteTargetInquiry,
        metadata: {
          email: deleteTargetInquiry.clientEmail,
          status: deleteTargetInquiry.status,
          serviceTitle: deleteTargetInquiry.serviceTitle,
        },
      });
      setInquiries((prev) => prev.filter((inq) => inq.id !== deleteTargetInquiry.id));
      setMessage({ text: `Inquiry from "${deleteTargetInquiry.clientName}" moved to Recycle Bin.`, type: "success" });
      setDeleteTargetInquiry(null);
    } catch (err: any) {
      setMessage({ text: err?.message || "Failed to move inquiry to Recycle Bin", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <HelixLoader />
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Services & Inquiries | DevEngine Admin</title>
      </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
        {/* Header and Actions Bar */}
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5 mb-8 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2.5 text-xs text-gray-400 mb-2">
              <Link
                href="/admin/dashboard"
                className="hover:text-teal-400 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-500 hover:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <span className="text-gray-600">/</span>
              <span className="text-gray-500">CMS Engine</span>
              <span className="text-gray-600">/</span>
              <Link
                href="/services"
                target="_blank"
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <span>Public Services</span>
                <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>Services & Inquiries CMS</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-300 border border-teal-500/20 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                Live Firestore
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              Manage public engineering capabilities catalog, custom deliverables, and client consultation inquiries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/services"
              target="_blank"
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>Live Services Page</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>

            <button
              onClick={handleSeedDefaults}
              disabled={saving}
              className="px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-teal-300 hover:text-teal-200 border border-white/[0.08] hover:border-teal-500/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Seed / Restore Defaults</span>
            </button>

            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_28px_rgba(20,184,166,0.5)] transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New Service</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-sm flex items-center justify-between backdrop-blur-xl ${
              message.type === "success"
                ? "bg-teal-950/40 border-teal-500/40 text-teal-300 shadow-[0_0_20px_rgba(20,184,166,0.1)]"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {message.type === "success" ? (
                <svg className="w-4 h-4 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium text-xs sm:text-sm">{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white ml-4 text-xs font-bold p-1 rounded-lg hover:bg-white/[0.05] transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs Switcher */}
        <div className="flex flex-wrap gap-1.5 p-1.5 bg-black/40 border border-white/[0.08] rounded-2xl mb-8 backdrop-blur-xl shadow-inner">
          <button
            onClick={() => setActiveTab("services")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "services"
                ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(20,184,166,0.35)]"
                : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>01. Engineering Services ({services.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("inquiries")}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "inquiries"
                ? "bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold shadow-[0_0_15px_rgba(20,184,166,0.35)]"
                : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>02. Client Project Inquiries ({inquiries.length})</span>
            {inquiries.some((i) => i.status === "NEW" || !i.status) && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping ml-1" />
            )}
          </button>
        </div>

        {/* ═════════════════════════════════════════════════════════════════
            TAB 1: SERVICES CATALOG
        ═════════════════════════════════════════════════════════════════ */}
        {activeTab === "services" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] py-20">
                <HelixLoader size={45} color="#14b8a6" />
                <p className="mt-4 font-mono text-xs text-gray-400 tracking-wider uppercase">
                  Loading Services & Inquiries from Firestore...
                </p>
              </div>
            ) : services.length === 0 ? (
              <div className="p-12 text-center bg-[#0c0c16]/95 rounded-3xl border border-white/[0.08] space-y-4">
                <p className="text-gray-300 text-sm">
                  No services currently saved in Firestore.
                </p>
                <button
                  onClick={handleSeedDefaults}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-black font-bold text-xs transition cursor-pointer shadow-lg shadow-teal-500/20"
                >
                  Seed Default DevEngine Services
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(20,184,166,0.1)] group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-11 h-11 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-xl">
                            {svc.icon || "layers"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider flex items-center gap-1.5 ${
                              svc.isPublic
                                ? "bg-teal-500/10 text-teal-300 border border-teal-500/25"
                                : "bg-amber-500/10 text-amber-300 border border-amber-500/25"
                            }`}
                          >
                            {svc.isPublic && (
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                            )}
                            {svc.isPublic ? "LIVE" : "DRAFT"}
                          </span>
                          <span className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg font-mono text-[10px] text-gray-400">
                            #{svc.order || 0}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-bold text-lg text-white tracking-tight group-hover:text-teal-300 transition-colors mb-1">
                        {svc.title}
                      </h3>
                      <p className="text-xs font-semibold text-teal-400/90 mb-3">
                        {svc.tagline}
                      </p>
                      <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">
                        {svc.description}
                      </p>

                      {/* Deliverables Count */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 pt-3 border-t border-white/[0.06] mb-5">
                        <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] flex items-center gap-1.5 text-[11px]">
                          <span>📦</span>
                          <span>{svc.deliverables?.length || 0} Deliverables</span>
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.06] flex items-center gap-1.5 text-[11px]">
                          <span>🛠</span>
                          <span>{svc.techStack?.length || 0} Tech Stacks</span>
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleTogglePublic(svc)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                          svc.isPublic
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border-teal-500/30"
                        }`}
                      >
                        {svc.isPublic ? "Unpublish" : "Publish"}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(svc)}
                          className="px-3.5 py-1.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleteTargetService(svc)}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════
            TAB 2: CLIENT PROJECT INQUIRIES
        ═════════════════════════════════════════════════════════════════ */}
        {activeTab === "inquiries" && (
          <div className="space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[50vh] py-20">
                <HelixLoader size={45} color="#14b8a6" />
                <p className="mt-4 font-mono text-xs text-gray-400 tracking-wider uppercase">
                  Loading Inquiries from Firestore...
                </p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="p-12 text-center bg-[#0c0c16]/95 rounded-3xl border border-white/[0.08] space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-sm font-semibold text-white">No Project Inquiries Yet</h4>
                <p className="text-gray-400 font-mono text-xs max-w-md mx-auto">
                  When potential clients submit consultation requests on the public Services page, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {inquiries.map((inq) => (
                  <div
                    key={inq.id}
                    className="bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row justify-between gap-6 transition-all duration-300 shadow-xl"
                  >
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-lg text-white tracking-tight">
                          {inq.clientName}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                            inq.status === "RESOLVED"
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                              : inq.status === "CONTACTED"
                              ? "bg-blue-500/10 text-blue-300 border border-blue-500/25"
                              : inq.status === "IN_REVIEW"
                              ? "bg-amber-500/10 text-amber-300 border border-amber-500/25"
                              : "bg-purple-500/10 text-purple-300 border border-purple-500/25"
                          }`}
                        >
                          {inq.status === "NEW" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                          )}
                          {inq.status || "NEW"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-300">
                        <span className="px-3 py-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-teal-400">📧</span>
                          <span>{inq.clientEmail}</span>
                        </span>
                        {inq.clientPhone && (
                          <span className="px-3 py-1 rounded-xl bg-black/40 border border-white/[0.06] flex items-center gap-1.5 font-mono text-[11px]">
                            <span className="text-teal-400">📱</span>
                            <span>{inq.clientPhone}</span>
                          </span>
                        )}
                        <span className="px-3 py-1 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 flex items-center gap-1.5 font-mono text-[11px]">
                          <span>🏷</span>
                          <span>{inq.serviceTitle || "General Service"}</span>
                        </span>
                        {inq.budgetRange && (
                          <span className="px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-center gap-1.5 font-mono text-[11px]">
                            <span>💰</span>
                            <span>{inq.budgetRange}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-300 bg-black/40 p-4 rounded-2xl border border-white/[0.06] leading-relaxed mt-3">
                        {inq.projectDetails}
                      </p>
                    </div>

                    {/* Status Actions */}
                    <div className="flex md:flex-col justify-between items-end gap-3 shrink-0">
                      <div className="relative min-w-[140px]">
                        <select
                          value={inq.status || "NEW"}
                          onChange={(e) =>
                            handleInquiryStatus(inq.id, e.target.value as any)
                          }
                          className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 pr-8 py-2 text-xs text-white font-mono cursor-pointer appearance-none outline-none transition-all"
                        >
                          <option value="NEW" className="bg-[#0c0c16] text-white">NEW</option>
                          <option value="IN_REVIEW" className="bg-[#0c0c16] text-white">IN REVIEW</option>
                          <option value="CONTACTED" className="bg-[#0c0c16] text-white">CONTACTED</option>
                          <option value="RESOLVED" className="bg-[#0c0c16] text-white">RESOLVED</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeleteTargetInquiry(inq)}
                        className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═════════════════════════════════════════════════════════════════
          ADD / EDIT SERVICE MODAL (SHEET)
      ═════════════════════════════════════════════════════════════════ */}
      {modalOpen && editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
          {/* Modal Container: overflow-hidden ensures scrollbar never clips through rounded corners */}
          <div className="bg-[#0c0c16] border border-white/[0.12] rounded-3xl max-w-2xl w-full shadow-2xl relative max-h-[90vh] text-white flex flex-col overflow-hidden">
            
            {/* Pinned Header */}
            <div className="flex justify-between items-start px-6 sm:px-8 py-5 border-b border-white/[0.08] bg-[#0c0c16] shrink-0">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-[10px] font-mono uppercase tracking-wider mb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <span>Service Configuration</span>
                </div>
                <h3 className="font-bold text-xl sm:text-2xl text-white tracking-tight">
                  {editingService.id && services.some((s) => s.id === editingService.id)
                    ? "Edit Engineering Service"
                    : "Add New Engineering Service"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer shadow-sm"
                aria-label="Close dialog"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form
              id="service-modal-form"
              onSubmit={handleSaveServiceModal}
              className="overflow-y-auto px-6 sm:px-8 py-6 space-y-4 flex-1 pr-4 sm:pr-6 custom-scrollbar"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Service Title</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full-Stack Web Architecture"
                    value={editingService.title || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, title: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                    <span>Category</span>
                    <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                  </label>
                  <div className="relative">
                    <select
                      value={editingService.category || "Web Architecture"}
                      onChange={(e) =>
                        setEditingService({ ...editingService, category: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-3.5 pr-10 text-xs text-white appearance-none cursor-pointer outline-none transition-all"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c} className="bg-[#0c0c16] text-white">
                          {c}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Tagline / High-Impact Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. High-throughput Next.js & TypeScript microservices built for limitless scale."
                  value={editingService.tagline || ""}
                  onChange={(e) =>
                    setEditingService({ ...editingService, tagline: e.target.value })
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Badge Text
                  </label>
                  <input
                    type="text"
                    placeholder="ENTERPRISE GRADE"
                    value={editingService.badge || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, badge: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Icon (Material Symbol)
                  </label>
                  <input
                    type="text"
                    placeholder="layers, smartphone, cloud_sync..."
                    value={editingService.icon || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, icon: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Timeline
                  </label>
                  <input
                    type="text"
                    placeholder="2-4 Weeks Sprint"
                    value={editingService.timeline || ""}
                    onChange={(e) =>
                      setEditingService({ ...editingService, timeline: e.target.value })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5 flex items-center justify-between">
                  <span>Detailed Description</span>
                  <span className="text-[10px] text-teal-400 font-mono">*Required</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide an executive-level summary of architecture, stack, and deliverables..."
                  value={editingService.description || ""}
                  onChange={(e) =>
                    setEditingService({ ...editingService, description: e.target.value })
                  }
                  className="w-full bg-black/40 border border-white/[0.08] focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 resize-none leading-relaxed outline-none transition-all"
                />
              </div>

              {/* Deliverables List Builder */}
              <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                    <span>Core Deliverables</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-mono">
                      {editingService.deliverables?.length || 0}
                    </span>
                  </label>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                  {(editingService.deliverables || []).map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-black/40 border border-white/[0.06] hover:border-white/[0.12] px-3.5 py-2 rounded-xl text-xs text-gray-200 transition-colors group"
                    >
                      <span className="flex items-center gap-2.5">
                        <svg className="w-3.5 h-3.5 text-teal-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{d}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingService({
                            ...editingService,
                            deliverables: editingService.deliverables?.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                        title="Remove deliverable"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add deliverable item (e.g. Headless CMS Integration)..."
                    value={newDeliverableInput}
                    onChange={(e) => setNewDeliverableInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newDeliverableInput.trim()) {
                          setEditingService({
                            ...editingService,
                            deliverables: [
                              ...(editingService.deliverables || []),
                              newDeliverableInput.trim(),
                            ],
                          });
                          setNewDeliverableInput("");
                        }
                      }
                    }}
                    className="flex-1 h-10 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white placeholder-gray-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newDeliverableInput.trim()) {
                        setEditingService({
                          ...editingService,
                          deliverables: [
                            ...(editingService.deliverables || []),
                            newDeliverableInput.trim(),
                          ],
                        });
                        setNewDeliverableInput("");
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>+ Add</span>
                  </button>
                </div>
              </div>

              {/* Tech Stack Tags Builder */}
              <div className="space-y-2.5 border-t border-white/[0.08] pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-200 flex items-center gap-2">
                    <span>Tech Stack Chips</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-mono">
                      {editingService.techStack?.length || 0}
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(editingService.techStack || []).map((t, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/[0.08] text-xs font-mono text-gray-200 flex items-center gap-2 hover:border-teal-500/30 transition"
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setEditingService({
                            ...editingService,
                            techStack: editingService.techStack?.filter((_, idx) => idx !== i),
                          })
                        }
                        className="text-gray-500 hover:text-rose-400 font-bold transition ml-0.5 cursor-pointer"
                        title="Remove tag"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Next.js, TypeScript, Docker, Redis..."
                    value={newTechInput}
                    onChange={(e) => setNewTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newTechInput.trim()) {
                          setEditingService({
                            ...editingService,
                            techStack: [
                              ...(editingService.techStack || []),
                              newTechInput.trim(),
                            ],
                          });
                          setNewTechInput("");
                        }
                      }
                    }}
                    className="flex-1 h-10 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono placeholder-gray-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newTechInput.trim()) {
                        setEditingService({
                          ...editingService,
                          techStack: [
                            ...(editingService.techStack || []),
                            newTechInput.trim(),
                          ],
                        });
                        setNewTechInput("");
                      }
                    }}
                    className="h-10 px-4 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>+ Add Tag</span>
                  </button>
                </div>
              </div>

              {/* Order & Visibility */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={editingService.order || 1}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        order: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 text-xs text-white font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    Visibility Status
                  </label>
                  <div className="relative">
                    <select
                      value={editingService.isPublic ? "true" : "false"}
                      onChange={(e) =>
                        setEditingService({
                          ...editingService,
                          isPublic: e.target.value === "true",
                        })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-teal-500/50 rounded-xl px-3.5 pr-10 text-xs text-white font-mono appearance-none cursor-pointer outline-none"
                    >
                      <option value="true" className="bg-[#0c0c16] text-teal-300">
                        Published (LIVE)
                      </option>
                      <option value="false" className="bg-[#0c0c16] text-amber-300">
                        Draft (UNPUBLISHED)
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-md flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="service-modal-form"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-black font-bold text-xs shadow-lg shadow-teal-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {saving && (
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                )}
                <span>{saving ? "Saving Changes..." : "Save Service"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          DELETE SERVICE MODAL (SOFT DELETE -> RECYCLE BIN)
      ═════════════════════════════════════════════════════════════════ */}
      {deleteTargetService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e0e1a] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Move Service to Recycle Bin?
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Item is safely retained in the Recycle Bin.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-bold text-white block">
                {deleteTargetService.title}
              </span>
              <span className="text-[11px] text-teal-400 block line-clamp-1">
                {deleteTargetService.category} · {deleteTargetService.tagline}
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This service will be removed from live catalog cards and moved to your admin <strong>Recycle Bin</strong> where you can restore it anytime or delete it permanently.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetService(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmMoveServiceToBin}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Moving..." : "Move to Bin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════
          DELETE INQUIRY MODAL (SOFT DELETE -> RECYCLE BIN)
      ═════════════════════════════════════════════════════════════════ */}
      {deleteTargetInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#0e0e1a] border border-rose-500/30 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">delete_forever</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Move Inquiry to Recycle Bin?
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Item is safely retained in the Recycle Bin.
                </p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/[0.06] rounded-xl p-3.5 space-y-1">
              <span className="text-xs font-bold text-white block">
                {deleteTargetInquiry.clientName}
              </span>
              <span className="text-[11px] text-teal-400 block line-clamp-1">
                {deleteTargetInquiry.clientEmail} · {deleteTargetInquiry.serviceTitle || "General Service"}
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This client inquiry will be removed from your active list and moved to your admin <strong>Recycle Bin</strong> where you can restore it or permanently purge it.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetInquiry(null)}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-xs font-semibold text-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteInquiry}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? "Moving..." : "Move to Bin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
